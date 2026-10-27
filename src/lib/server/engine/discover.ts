import type { Candidate, Product, Store } from '$lib/types';
import { db, hasSearch } from '../config';
import { buildQueries } from './queries';
import { isBlocked, searchDomains } from './search';
import { fetchCatalog, fetchMeta, normalizeDomain, type RawProduct } from './shopify';
import { applyIdf, catalogVector, cosine, quantile, sharedTerms } from './text';
import { pool, syncStore } from './track';

export class AnalysisError extends Error {}

interface Profile {
	domain: string;
	products: RawProduct[];
	prices: number[];
	currency: string | null;
	country: string | null;
	language: string | null;
}

const pricesOf = (ps: RawProduct[]) =>
	ps.flatMap((p) => {
		const v = (p.variants ?? []).map((x) => Number(x.price)).filter((n) => n > 0);
		return v.length ? [Math.min(...v)] : [];
	});

/** Overlap of interquartile price ranges (0 = none, 1 = identical). */
function priceOverlap(a: number[], b: number[]): number {
	if (!a.length || !b.length) return 0;
	const [a1, a2] = [quantile(a, 0.25), quantile(a, 0.75)];
	const [b1, b2] = [quantile(b, 0.25), quantile(b, 0.75)];
	const inter = Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
	const union = Math.max(a2, b2) - Math.min(a1, b1);
	if (union <= 0) return 1;
	// also reward close medians even when the ranges don't touch
	const ma = quantile(a, 0.5),
		mb = quantile(b, 0.5);
	const ratio = Math.min(ma, mb) / Math.max(ma, mb);
	return 0.6 * (inter / union) + 0.4 * ratio;
}

const fmtRange = (p: number[], cur: string | null) =>
	`${Math.round(quantile(p, 0.25))}–${Math.round(quantile(p, 0.75))} ${cur ?? ''}`.trim();

/** Scores candidates against the user's own store. */
export function scoreCandidates(own: Profile, cands: Profile[]) {
	const vecs = applyIdf([catalogVector(own.products), ...cands.map((c) => catalogVector(c.products))]);
	const ownVec = vecs[0];
	return cands.map((c, i) => {
		const v = vecs[i + 1];
		const sim = Math.min(1, cosine(ownVec, v) / 0.45);
		const price = priceOverlap(own.prices, c.prices);
		const market =
			(own.currency && c.currency === own.currency ? 0.5 : 0) +
			(own.language && c.language === own.language ? 0.3 : 0) +
			(own.country && c.country === own.country ? 0.2 : 0);
		const sizeRatio =
			Math.min(own.products.length, c.products.length) / Math.max(own.products.length, c.products.length, 1);
		const score = 0.6 * sim + 0.2 * price + 0.12 * market + 0.08 * Math.sqrt(sizeRatio);

		const reasons: string[] = [];
		const shared = sharedTerms(ownVec, v, 4);
		if (shared.length) reasons.push(`Products in common: ${shared.join(', ')}`);
		if (price > 0.45) reasons.push(`Similar prices (${fmtRange(c.prices, c.currency)})`);
		if (own.country && c.country === own.country) reasons.push(`Same country (${c.country})`);
		else if (own.currency && c.currency === own.currency) reasons.push(`Same currency (${c.currency})`);
		return { domain: c.domain, score: Math.round(score * 100) / 100, sim, reasons };
	});
}

export interface AnalysisResult {
	analysisId: string;
	own: Store;
	usedSearch: boolean;
}

/** Store URL → synced own store + up to 5 suggested competitors. */
export async function analyze(input: string, onStep?: (s: string) => void): Promise<AnalysisResult> {
	const domain = normalizeDomain(input);
	if (!domain) throw new AnalysisError('That doesn\'t look like a valid URL.');

	onStep?.('Reading your catalog');
	const ownCatalog = await fetchCatalog(domain);
	if (!ownCatalog || ownCatalog.length === 0)
		throw new AnalysisError('We couldn\'t read the catalog. Is it a Shopify store with published products?');
	const ownSync = await syncStore(domain, ownCatalog);
	const own = ownSync.store;
	const ownProfile: Profile = {
		domain,
		products: ownCatalog,
		prices: pricesOf(ownCatalog),
		currency: own.currency,
		country: own.country,
		language: own.language
	};

	const repo = db();
	if (!hasSearch) {
		const a = await repo.createAnalysis(own.id, [], []);
		return { analysisId: a.id, own, usedSearch: false };
	}

	onStep?.('Looking for similar stores');
	const queries = await buildQueries({
		storeName: own.name,
		domain,
		products: ownCatalog,
		vector: catalogVector(ownCatalog),
		language: own.language,
		country: own.country
	});
	const results = await Promise.all(
		queries.map((q) =>
			searchDomains(q, { country: own.country, language: own.language }).catch((e) => {
				console.error(`[discover] search failed for "${q}":`, e);
				return [] as string[];
			})
		)
	);
	const freq = new Map<string, number>();
	for (const list of results)
		for (const [rank, d] of [...new Set(list)].entries()) {
			if (d === domain || d.endsWith('.' + domain) || isBlocked(d)) continue;
			freq.set(d, (freq.get(d) ?? 0) + 1 + (rank < 5 ? 0.5 : 0));
		}
	const domains = [...freq.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 24)
		.map(([d]) => d);

	onStep?.('Checking which ones run on Shopify');
	const probed = await pool(domains, 6, async (d) => {
		const catalog = await fetchCatalog(d, { maxPages: 2, timeoutMs: 7000 });
		return catalog && catalog.length >= 3 ? { d, catalog } : null;
	});
	const shopify = probed.filter((x): x is { d: string; catalog: RawProduct[] } => Boolean(x));

	onStep?.('Comparing catalogs and prices');
	const profiles: Profile[] = await pool(shopify, 6, async ({ d, catalog }) => {
		const meta = await fetchMeta(d);
		return { domain: d, products: catalog, prices: pricesOf(catalog), ...meta };
	});
	const scored = scoreCandidates(ownProfile, profiles)
		.filter((s) => s.sim > 0.12)
		.sort((a, b) => b.score - a.score)
		.slice(0, 5);

	// Only the 5 picks are saved (as their baseline)
	const catalogs = new Map(shopify.map((s) => [s.d, s.catalog]));
	const candidates: Candidate[] = await pool(scored, 5, async (s) => {
		const res = await syncStore(s.domain, catalogs.get(s.domain));
		return { store_id: res.store.id, score: s.score, reasons: s.reasons };
	});
	// One line per analysis in Vercel → Logs, to see where the funnel narrows.
	console.log(
		`[discover] ${domain}: ${queries.length} queries → ${results.flat().length} results → ${domains.length} domains → ${shopify.length} on Shopify → ${candidates.length} picked`,
		JSON.stringify({ queries, domains: domains.slice(0, 12), shopify: shopify.map((s) => s.d) })
	);
	const a = await repo.createAnalysis(own.id, candidates, queries);
	return { analysisId: a.id, own, usedSearch: true };
}

/** Add a competitor by hand (from the analysis or the dashboard). */
export async function addCompetitorByUrl(
	ownStoreId: string,
	input: string
): Promise<{ candidate: Candidate; store: Store }> {
	const domain = normalizeDomain(input);
	if (!domain) throw new AnalysisError('That doesn\'t look like a valid URL.');
	const repo = db();
	const own = await repo.getStore(ownStoreId);
	if (!own) throw new AnalysisError('Store not found.');
	if (domain === own.domain) throw new AnalysisError('That\'s your own store.');

	const catalog = await fetchCatalog(domain);
	if (!catalog || !catalog.length)
		throw new AnalysisError(`We can\'t track ${domain}: it isn\'t on Shopify or it blocks its catalog.`);
	const res = await syncStore(domain, catalog);

	const ownProducts = await repo.getProducts(own.id);
	const asRaw = (ps: Product[]): RawProduct[] =>
		ps.map((p) => ({
			id: p.shopify_id,
			title: p.title,
			handle: p.handle,
			product_type: p.product_type ?? undefined,
			tags: p.tags,
			variants: [{ price: p.price, compare_at_price: p.compare_at }]
		}));
	const ownRaw = asRaw(ownProducts);
	const [s] = scoreCandidates(
		{ domain: own.domain, products: ownRaw, prices: pricesOf(ownRaw), currency: own.currency, country: own.country, language: own.language },
		[{ domain, products: catalog, prices: pricesOf(catalog), currency: res.store.currency, country: res.store.country, language: res.store.language }]
	);
	return { candidate: { store_id: res.store.id, score: s.score, reasons: ['Added by you', ...s.reasons] }, store: res.store };
}
