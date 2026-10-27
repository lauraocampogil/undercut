import { config } from '../config';
import type { RawProduct } from './shopify';
import { topTerms, type Vec } from './text';

const BUY: Record<string, string> = { en: 'buy', es: 'comprar', fr: 'acheter', nl: 'kopen', de: 'kaufen', it: 'comprare', pt: 'comprar' };
const SHOP: Record<string, string> = { en: 'online shop', es: 'tienda online', fr: 'boutique en ligne', nl: 'webshop', de: 'onlineshop', it: 'negozio online', pt: 'loja online' };

function counts<T>(items: T[]): [T, number][] {
	const m = new Map<T, number>();
	for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
	return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export interface QueryInput {
	storeName: string | null;
	domain: string;
	products: RawProduct[];
	vector: Vec;
	language: string | null;
	country: string | null;
}

/** Queries without an LLM: product types + most distinctive terms + resold brands. */
export function heuristicQueries(q: QueryInput): string[] {
	const lang = q.language && BUY[q.language] ? q.language : 'en';
	const types = counts(q.products.map((p) => p.product_type?.trim().toLowerCase()).filter(Boolean) as string[])
		.slice(0, 3)
		.map(([t]) => t);
	const terms = topTerms(q.vector, 6);
	const own = (q.storeName ?? '').toLowerCase();
	const vendors = counts(q.products.map((p) => p.vendor?.trim()).filter(Boolean) as string[])
		.map(([v]) => v)
		.filter((v) => !own.includes(v.toLowerCase()) && !q.domain.includes(v.toLowerCase().replace(/\s+/g, '')))
		.slice(0, 2);

	const out = new Set<string>();
	for (const t of types) out.add(`${t} ${SHOP[lang]}`);
	if (terms.length >= 2) out.add(`${terms[0]} ${terms[1]} ${BUY[lang]}`);
	if (terms.length >= 4) out.add(`${terms[2]} ${terms[3]} ${SHOP[lang]}`);
	if (terms.length >= 1) out.add(`${terms[0]} ${SHOP[lang]}`);
	for (const v of vendors) out.add(`${v} ${BUY[lang]}`);
	// Shopify stores all use /collections/ URLs: this biases results toward them.
	const list = [...out].slice(0, 4);
	if (types[0]) list.push(`${types[0]} inurl:collections`);
	if (terms.length >= 2) list.push(`${terms[0]} ${terms[1]} inurl:collections`);
	return [...new Set(list)].slice(0, 6);
}

/** With ANTHROPIC_API_KEY, an LLM writes more natural queries. On failure we fall back to heuristics. */
export async function buildQueries(q: QueryInput): Promise<string[]> {
	const fallback = heuristicQueries(q);
	if (!config.anthropicKey) return fallback;

	const sample = q.products.slice(0, 40).map((p) => `- ${p.title}${p.product_type ? ` (${p.product_type})` : ''}`);
	const prompt = `You help find direct competitors of an online store.
Store: ${q.storeName ?? q.domain} (${q.domain}). Country: ${q.country ?? 'unknown'}. Language: ${q.language ?? 'unknown'}.
Most characteristic words: ${topTerms(q.vector, 15).join(', ')}.
Sample products:
${sample.join('\n')}

Write 6 Google search queries, in the store's language, that a shopper would type to find OTHER independent online shops selling the same kind of products to the same audience. Avoid the store's own name and avoid marketplaces. Answer ONLY with a JSON array of strings.`;

	try {
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-api-key': config.anthropicKey,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model: config.anthropicModel,
				max_tokens: 400,
				messages: [{ role: 'user', content: prompt }]
			}),
			signal: AbortSignal.timeout(20_000)
		});
		if (!res.ok) return fallback;
		const json = (await res.json()) as { content?: { type: string; text?: string }[] };
		const text = json.content?.find((c) => c.type === 'text')?.text ?? '';
		const arr = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
		const list = (Array.isArray(arr) ? arr : []).filter((s): s is string => typeof s === 'string' && s.length > 3);
		return list.length ? list.slice(0, 6) : fallback;
	} catch {
		return fallback;
	}
}

/**
 * With ANTHROPIC_API_KEY: asks the model for the websites of direct competitor brands.
 * Search engines rarely return small competitor stores for generic queries; a model
 * that knows the market usually does (e.g. olipop.com → poppi.com, drinkculturepop.com).
 * Every suggestion is still checked (must run on Shopify and be similar), so a wrong
 * guess costs one request and is filtered out.
 */
export async function suggestCompetitorDomains(q: QueryInput): Promise<string[]> {
	if (!config.anthropicKey) return [];
	const sample = q.products.slice(0, 25).map((p) => `- ${p.title}${p.product_type ? ` (${p.product_type})` : ''}`);
	const prompt = `Store: ${q.storeName ?? q.domain} (${q.domain}). Country: ${q.country ?? 'unknown'}.
Most characteristic words: ${topTerms(q.vector, 15).join(', ')}.
Sample products:
${sample.join('\n')}

List up to 10 direct competitors: independent brands or online stores that sell the same kind of products to the same audience, preferably in the same country or region. Exclude marketplaces (Amazon, eBay, Etsy, Zalando…) and big retailers. Answer ONLY with a JSON array of their website domains, like ["example.com"].`;
	try {
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-api-key': config.anthropicKey, 'anthropic-version': '2023-06-01' },
			body: JSON.stringify({ model: config.anthropicModel, max_tokens: 300, messages: [{ role: 'user', content: prompt }] }),
			signal: AbortSignal.timeout(20_000)
		});
		if (!res.ok) {
			console.error(`[anthropic] ${res.status}: ${(await res.text()).slice(0, 200)}`);
			return [];
		}
		const json = (await res.json()) as { content?: { type: string; text?: string }[] };
		const text = json.content?.find((c) => c.type === 'text')?.text ?? '';
		const arr = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
		return (Array.isArray(arr) ? arr : [])
			.filter((s): s is string => typeof s === 'string')
			.map((s) => s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0])
			.filter((s) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(s))
			.slice(0, 10);
	} catch (e) {
		console.error('[anthropic] suggestion failed:', e);
		return [];
	}
}

export interface JudgeInput {
	domain: string;
	name: string | null;
	about: string | null;
	titles: string[];
	medianPrice: number;
	currency: string | null;
}

/**
 * With ANTHROPIC_API_KEY: rates how much each candidate is a DIRECT competitor (0–10)
 * and explains why in a few words. Keyword overlap alone can't tell a soda brand from a
 * shop selling "apple" and "cream" scented candles; a model reading both stores can.
 * Returns null when the model is unavailable, so callers can fall back to heuristics.
 */
export async function judgeCompetitors(
	own: JudgeInput,
	cands: JudgeInput[]
): Promise<Map<string, { score: number; reason: string }> | null> {
	if (!config.anthropicKey || !cands.length) return null;
	const describe = (s: JudgeInput) =>
		`${s.domain} — ${s.name ?? ''}\n  About: ${(s.about ?? 'n/a').slice(0, 220)}\n  Products: ${s.titles.slice(0, 12).join(' | ')}\n  Median price: ${s.medianPrice} ${s.currency ?? ''}`;
	const prompt = `You decide which online stores are DIRECT competitors of a store: same kind of product, same customer, a shopper would hesitate between them. Selling to the same broad category is not enough (a soda brand and a candle shop are not competitors even if both mention "apple").

THE STORE:
${describe(own)}

CANDIDATES:
${cands.map(describe).join('\n')}

For each candidate give a score from 0 (unrelated) to 10 (head-to-head competitor) and a reason of max 8 words, written for the store owner (e.g. "Also sells prebiotic soda in cans"). Answer ONLY with a JSON array: [{"domain":"…","score":7,"reason":"…"}].`;
	try {
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-api-key': config.anthropicKey, 'anthropic-version': '2023-06-01' },
			body: JSON.stringify({ model: config.anthropicModel, max_tokens: 1200, messages: [{ role: 'user', content: prompt }] }),
			signal: AbortSignal.timeout(30_000)
		});
		if (!res.ok) {
			console.error(`[anthropic] judge ${res.status}: ${(await res.text()).slice(0, 200)}`);
			return null;
		}
		const json = (await res.json()) as { content?: { type: string; text?: string }[] };
		const text = json.content?.find((c) => c.type === 'text')?.text ?? '';
		const arr = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1)) as { domain?: string; score?: number; reason?: string }[];
		const out = new Map<string, { score: number; reason: string }>();
		for (const r of Array.isArray(arr) ? arr : [])
			if (r.domain && typeof r.score === 'number') out.set(r.domain.toLowerCase(), { score: Math.max(0, Math.min(10, r.score)), reason: r.reason ?? '' });
		return out;
	} catch (e) {
		console.error('[anthropic] judge failed:', e);
		return null;
	}
}
