// The database: every product ever analyzed (the product and its 3 competitors), like TrustMRR's list.
// It shows products and what their users say — never who searched them (analyses stay private).
// A product claimed by its owner also shows the owner's fix statuses and fix score.
// Supabase: table public_products (slug, workspace_id = owner, score, value). Local: .data/products.json.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { db, dbOn } from './db.ts';
import { count, fixScore, slugify, type Analysis } from './reviewdb.ts';
import type { StoreApp, DbStats, DbRow, ProductData, Idea } from '#lib/review-types.ts';
export type { DbStats, DbRow };

export type DbProduct = { slug: string; owner: string | null; score: number | null; updatedAt: string; stats: DbStats; analysis: Analysis; ideas?: Idea[]; ideasAt?: string };

const FILE = join(process.cwd(), '.data', 'products.json');
const local = (): DbProduct[] => {
	try {
		return existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : [];
	} catch {
		return [];
	}
};
const saveLocal = (rows: DbProduct[]) => {
	mkdirSync(join(process.cwd(), '.data'), { recursive: true });
	writeFileSync(FILE, JSON.stringify(rows));
};

export const productSlug = (app: StoreApp) => slugify(app.name) || slugify(app.id);

function stats(a: Analysis): DbStats {
	const rated = a.main.reviews.filter((r) => r.stars);
	const complaints = a.themes.filter((t) => t.type === 'complaint').map((t) => ({ label: t.label, n: count(a.main, t.id) }));
	const total = complaints.reduce((s, c) => s + c.n, 0);
	const top = complaints.sort((x, y) => y.n - x.n)[0];
	return {
		reviews: a.main.reviews.length,
		complaintRate: a.main.badShare ?? (rated.length ? Math.round((rated.filter((r) => r.stars <= 3).length / rated.length) * 100) : null),
		topComplaint: top && top.n ? { label: top.label, share: Math.round((top.n / total) * 100) } : null
	};
}

// a product page is ~0.5 MB: keep the last ones opened for a few minutes
const pCache = new Map<string, { at: number; p: DbProduct | null }>();
export async function getProduct(slug: string): Promise<DbProduct | null> {
	if (!dbOn()) return local().find((p) => p.slug === slug) ?? null;
	const hit = pCache.get(slug);
	if (hit && Date.now() - hit.at < 5 * 60_000) return hit.p ? structuredClone(hit.p) : null;
	const rows = await db.select<{ value: DbProduct }>('public_products', { slug: `eq.${slug}`, select: 'value' });
	const p = rows[0]?.value ?? null;
	if (pCache.size > 60) pCache.delete(pCache.keys().next().value!);
	pCache.set(slug, { at: Date.now(), p });
	return p ? structuredClone(p) : null;
}

/** Keep stored pages light: the newest reviews only, with shorter text. */
const slim = (p: ProductData, n: number): ProductData => ({ ...p, fixes: p.fixes, reviews: p.reviews.slice(0, n).map((r) => ({ ...r, text: r.text.slice(0, 400), title: r.title.slice(0, 120) })) });

async function put(p: DbProduct) {
	cache = null;
	pCache.delete(p.slug);
	if (dbOn()) await db.upsert('public_products', { slug: p.slug, workspace_id: p.owner, score: p.score ?? 0, value: p, updated_at: p.updatedAt }, 'slug');
	else saveLocal([p, ...local().filter((x) => x.slug !== p.slug)]);
}

/** Add the 4 products of an analysis to the database (each one as main product, the 3 others as competitors). */
export async function indexAnalysis(a: Analysis) {
	const all = [a.main, ...a.competitors];
	// only the analysed product gets a page: its competitors were chosen for it, they are not each other's competitors
	for (let i = 0; i < 1; i++) {
		const main = { ...slim(all[i], 600), fixes: undefined };
		const view: Analysis = { ...a, id: `db-${a.id}-${i}`, insights: i === 0 ? a.insights : undefined, watch: undefined, claimed: undefined, published: undefined, ideas: undefined, ideasAt: undefined, cached: undefined, main, competitors: all.filter((_, j) => j !== i).map((c) => ({ ...slim(c, 300), fixes: undefined })) };
		const slug = productSlug(main.app);
		const old = await getProduct(slug).catch(() => null);
		// a claimed product keeps its owner's version (fix statuses) — only the owner updates it
		if (old?.owner) continue;
		const fresh = i === 0 && a.ideas?.length ? { ideas: a.ideas, ideasAt: a.ideasAt } : { ideas: old?.ideas, ideasAt: old?.ideasAt };
		await put({ slug, owner: null, score: null, updatedAt: new Date().toISOString(), stats: stats(view), analysis: view, ...fresh });
	}
}

/** The owner claims (or updates) their product: their fix statuses become public, with the fix score. */
export async function claimProduct(a: Analysis, ws: string | null) {
	const slug = productSlug(a.main.app);
	const old = await getProduct(slug).catch(() => null);
	if (old?.owner && old.owner !== (ws ?? 'local')) throw new Error('This product is already claimed by another account.');
	const view: Analysis = { ...a, claimed: undefined, published: undefined, ideas: undefined, ideasAt: undefined, main: slim(a.main, 300), competitors: a.competitors.map((c) => slim(c, 200)) };
	await put({ slug, owner: ws ?? 'local', score: fixScore(a), updatedAt: new Date().toISOString(), stats: stats(view), analysis: view, ideas: a.ideas ?? old?.ideas, ideasAt: a.ideasAt ?? old?.ideasAt });
	return slug;
}

export async function unclaimProduct(a: Analysis, ws: string | null) {
	const slug = productSlug(a.main.app);
	const old = await getProduct(slug).catch(() => null);
	if (!old || old.owner !== (ws ?? 'local')) return;
	await put({ ...old, owner: null, score: null, analysis: { ...old.analysis, main: { ...old.analysis.main, fixes: undefined } } });
}

/** Pages made from someone else's analysis (a competitor shown with the other competitors): their "competitors" are wrong.
 *  They are hidden until they are analysed again on their own (rebuildSecondHand). */
export const isSecondHand = (aid?: string | null) => Boolean(aid && /^db-.+-[123]$/.test(aid));

/** The whole database as light rows (no reviews), for the tables. */
export let dbProblem = '';
let cache: { at: number; rows: DbRow[] } | null = null;
const CACHE_MS = 5 * 60_000;

type LightRow = { aid?: string; slug: string; score: number | null; updated_at: string; workspace_id: string | null; stats: DbStats; app: StoreApp; c0?: StoreApp; c1?: StoreApp; c2?: StoreApp };

/** The whole database as light rows (no reviews), for the tables. Only the small fields are read from Supabase. */
export async function listProducts(): Promise<DbRow[]> {
	if (cache && Date.now() - cache.at < CACHE_MS) return cache.rows;
	try {
		let rows: DbRow[];
		if (dbOn()) {
			const light = await db.select<LightRow>('public_products', {
				select: 'aid:value->analysis->id,slug,score,updated_at,workspace_id,stats:value->stats,app:value->analysis->main->app,c0:value->analysis->competitors->0->app,c1:value->analysis->competitors->1->app,c2:value->analysis->competitors->2->app',
				limit: '2000'
			});
			rows = light
				.filter((r) => r.app && !isSecondHand(r.aid))
				.map((r) => ({
					slug: r.slug,
					app: r.app,
					owner: Boolean(r.workspace_id),
					score: r.workspace_id ? r.score : null,
					updatedAt: r.updated_at,
					stats: r.stats ?? { reviews: 0, complaintRate: null, topComplaint: null },
					competitors: [r.c0, r.c1, r.c2].filter((c): c is StoreApp => Boolean(c)).map((c) => ({ slug: productSlug(c), name: c.name, icon: c.icon }))
				}));
		} else {
			rows = local()
				.filter((p) => p?.analysis?.main?.app && !isSecondHand(p.analysis.id))
				.map((p) => ({
					slug: p.slug,
					app: p.analysis.main.app,
					owner: Boolean(p.owner),
					score: p.owner ? p.score : null,
					updatedAt: p.updatedAt,
					stats: p.stats,
					competitors: p.analysis.competitors.map((c) => ({ slug: productSlug(c.app), name: c.app.name, icon: c.app.icon }))
				}));
		}
		dbProblem = '';
		cache = { at: Date.now(), rows };
		return rows;
	} catch (e) {
		dbProblem = (e as Error).message;
		console.warn('[undercut] database', dbProblem);
		return cache?.rows ?? [];
	}
}

/** Free visitors see the first `free` (15) products (by share of bad reviews); the rest is sent blurred and without
 *  names, icons or complaints — the data never reaches the browser. Paying users see everything. */
export const MIN_REVIEWS = 30;
export function lockRows(rows: DbRow[], full: boolean, free = 15): DbRow[] {
	// products with too few reviews don't compete in the ranking (2 reviews at 100% means nothing)
	const key = (r: DbRow) => (r.stats.reviews >= MIN_REVIEWS ? (r.stats.complaintRate ?? -1) : -2 + r.stats.reviews / 1000);
	const sorted = [...rows].sort((a, b) => key(b) - key(a));
	if (full) return sorted;
	return sorted.map((r, i) =>
		i < free
			? r
			: {
					slug: `locked-${i}`,
					locked: true,
					owner: false,
					score: null,
					updatedAt: r.updatedAt,
					competitors: [],
					stats: { reviews: r.stats.reviews, complaintRate: r.stats.complaintRate, topComplaint: null },
					app: { ...r.app, id: '', name: 'Locked product', icon: '', seller: '', url: '', iosId: undefined, playId: undefined, domain: undefined, notes: '' }
				}
	);
}

/** Save the ideas found for a product, so the next person sees them without a new AI call. */
export async function saveIdeas(slug: string, ideas: Idea[]) {
	const p = await getProduct(slug);
	if (!p) return;
	await put({ ...p, ideas, ideasAt: new Date().toISOString() });
}

/** Light list of every product that already has ideas (for the Ideas page). */
export async function productsWithIdeas(): Promise<{ slug: string; name: string; icon: string; genre: string; ideasAt: string; ideas: Idea[] }[]> {
	if (dbOn()) {
		const rows = await db.select<{ slug: string; ideas: Idea[] | null; ideasAt: string | null; app: StoreApp }>('public_products', { select: 'slug,ideas:value->ideas,ideasAt:value->ideasAt,app:value->analysis->main->app', 'value->ideas': 'not.is.null', limit: '500' });
		return rows.filter((r) => r.ideas?.length && r.app).map((r) => ({ slug: r.slug, name: r.app.name, icon: r.app.icon, genre: r.app.genre, ideasAt: r.ideasAt ?? '', ideas: r.ideas! }));
	}
	return local()
		.filter((p) => p.ideas?.length)
		.map((p) => ({ slug: p.slug, name: p.analysis.main.app.name, icon: p.analysis.main.app.icon, genre: p.analysis.main.app.genre, ideasAt: p.ideasAt ?? '', ideas: p.ideas! }));
}

// ---------- repair: products saved while the AI grouping was failing get their topics grouped again ----------
let repairing = false;
export async function repairDatabase() {
	if (repairing) return;
	repairing = true;
	try {
		const { regroup } = await import('./reviewdb.ts');
		let todo: string[];
		if (dbOn()) {
			const rows = await db.select<{ slug: string; note: string | null; t0: string | null }>('public_products', { select: 'slug,note:value->analysis->themeNote,t0:value->analysis->themes->0->id', limit: '2000' });
			todo = rows.filter((r) => r.note || ['price', 'bugs', 'slow', 'login', 'ads', 'support', 'other-complaints', 'complaints'].includes(r.t0 ?? '')).map((r) => r.slug);
		} else todo = local().filter((p) => p.analysis.themeNote).map((p) => p.slug);
		if (todo.length) console.log(`[undercut] regrouping ${todo.length} products with AI`);
		for (let k = 0; k < todo.length; k += 1) {
			await Promise.all(
				todo.slice(k, k + 1).map(async (slug) => {
					try {
						const p = await getProduct(slug);
						if (!p || p.owner) return;
						const a = await regroup(p.analysis);
						if (a.themeNote) return; // AI still not answering: try again next time
						await put({ ...p, analysis: a, stats: stats(a), ideas: undefined, ideasAt: undefined });
					} catch (e) {
						console.warn('[repair]', slug, (e as Error).message);
					}
				})
			);
		}
	} finally {
		repairing = false;
	}
}

/** A database product the account may open (free plans: the first 15 of the ranking). */
export async function openProduct(slug: string, full: boolean): Promise<DbProduct | null> {
	const p = await getProduct(slug).catch(() => null);
	if (!p || isSecondHand(p.analysis.id)) return null; // its competitors are being chosen again
	if (full) return p;
	const row = lockRows(await listProducts(), false).find((r) => r.slug === slug);
	return row && !row.locked ? p : null;
}

/** Save a database product as it is (e.g. after caching an analysis or screenshots). */
export async function saveDbProduct(p: DbProduct) {
	await put(p);
}

/** Pages to analyse again with competitors chosen for them: first the second-hand ones (hidden), then the pages made
 *  before competitors were picked by what the product is used for (shown meanwhile). */
const COMPETITORS_FIXED_AT = '2026-11-26T00:00:00Z';
export async function secondHandSlugs(): Promise<{ slug: string; name: string; url: string; app: StoreApp; hidden: boolean }[]> {
	let rows: { slug: string; aid?: string; app: StoreApp; at: string }[];
	if (dbOn()) {
		const r = await db.select<{ slug: string; aid: string; app: StoreApp; updated_at: string }>('public_products', { select: 'slug,updated_at,aid:value->analysis->id,app:value->analysis->main->app', limit: '2000' });
		rows = r.filter((x) => x.app).map((x) => ({ slug: x.slug, aid: x.aid, app: x.app, at: x.updated_at }));
	} else rows = local().filter((p) => p.analysis?.main?.app).map((p) => ({ slug: p.slug, aid: p.analysis.id, app: p.analysis.main.app, at: p.updatedAt }));
	return rows
		.filter((r) => isSecondHand(r.aid) || r.at < COMPETITORS_FIXED_AT)
		.map((r) => ({ slug: r.slug, name: r.app.name, url: r.app.url, app: r.app, hidden: isSecondHand(r.aid) }));
}
