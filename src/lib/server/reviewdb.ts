// Undercut core: paste a URL → the product + 3 competitors, what their users say, grouped into themes.
// Sources: App Store (public RSS), Google Play (google-play-scraper), Hacker News (Algolia API), GitHub issues (public API). Themes: Claude (ANTHROPIC_API_KEY).
// Private analyses live in the user's workspace (analyses.json). Public pages live in public.ts.
import * as env from '$app/env/private';
import { messages } from './claude-api.ts';
import gplay from 'google-play-scraper';
import { lookup, reviews as storeReviews, searchApps } from './appstore.ts';
import { readData, readShared, writeData } from './store.ts';
import type { Analysis, ProductData, Review, Theme, FixStatus, StoreApp, Source } from '#lib/review-types.ts';
export type { Analysis, ProductData, Review, Theme, FixStatus };

export const CC = 'us';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 Undercut/1.0';
const log = (...a: unknown[]) => console.warn('[undercut]', ...a);

// ---------- private storage ----------
const FILE = 'analyses.json';
// the reports are big (thousands of reviews): read without copying, copy only the one that is opened
export const listAnalyses = () => [...readShared<Analysis[]>(FILE, [])];
export const getAnalysis = (id: string) => {
	const a = readShared<Analysis[]>(FILE, []).find((x) => x.id === id);
	return a ? structuredClone(a) : null;
};
export function saveAnalysis(a: Analysis) {
	writeData(FILE, [a, ...listAnalyses().filter((x) => x.id !== a.id)]);
}
export function removeAnalysis(id: string) {
	writeData(FILE, listAnalyses().filter((x) => x.id !== id));
}

export const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------- Claude ----------
let aiError = '';
let lastRaw = '';
export const lastAiText = () => lastRaw;
let fallbackUsed = false;

/** One Claude call, plain text back (null on any problem; the reason goes to aiError). */
async function claudeText(prompt: string, maxTokens = 1500, model?: string): Promise<string | null> {
	if (!env.ANTHROPIC_API_KEY) return (aiError = 'ANTHROPIC_API_KEY is not set in .env'), null;
	try {
		const call = (model: string) => messages(model, prompt, maxTokens, 90000);
		let res = await call(model || env.REVIEWS_MODEL || 'claude-haiku-5-5');
		// cheap model not available on this account: fall back to the main model
		if (res.status === 404 || res.status === 400) res = await call(env.ANTHROPIC_MODEL || 'claude-sonnet-5-5');
		if (!res.ok) {
			aiError = `Claude API ${res.status}: ${(await res.text()).slice(0, 160)}`;
			log(aiError);
			return null;
		}
		const j = await res.json();
		// newer models can answer with several blocks (e.g. thinking first): keep the text ones
		const text = (j.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
		if (!text) (aiError = `Claude returned no text (stop: ${j.stop_reason ?? '?'})`), (lastRaw = JSON.stringify(j).slice(0, 1500));
		return text;
	} catch (e) {
		aiError = `Claude: ${(e as Error).message}`;
		log(aiError);
		return null;
	}
}

/** Claude call that must answer JSON (small answers only). */
async function claude(prompt: string, maxTokens = 1500, model?: string): Promise<any | null> {
	const t = await claudeText(prompt, maxTokens, model);
	if (t === null || t === '') return null;
	lastRaw = t;
	try {
		const start = Math.min(...['{', '['].map((c) => (t.indexOf(c) < 0 ? Infinity : t.indexOf(c))));
		const end = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
		return JSON.parse(t.slice(start, end + 1));
	} catch {
		aiError = 'Claude answered something that is not valid JSON';
		log(aiError, t.slice(0, 120));
		return null;
	}
}

// ---------- 1. what is the product? ----------
async function siteName(url: URL): Promise<string> {
	try {
		const html = await (await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'user-agent': UA } })).text();
		const og = html.match(/property=["']og:site_name["'][^>]*content=["']([^"']+)/i)?.[1];
		const title = html.match(/<title[^>]*>([^<]+)/i)?.[1];
		const n = (og || title || '').split(/[|\-–—:·]/)[0].trim();
		if (n && n.length < 40) return n;
	} catch {
		/* fall back to the domain */
	}
	const label = url.hostname.replace(/^www\./, '').split('.')[0];
	return label.charAt(0).toUpperCase() + label.slice(1);
}

async function playApp(appId: string) {
	try {
		return await gplay.app({ appId, country: CC, lang: 'en' });
	} catch {
		return null;
	}
}
async function playSearch(name: string): Promise<string | undefined> {
	try {
		const hits = await gplay.search({ term: name, num: 5, country: CC, lang: 'en' });
		return hits.find((h: any) => norm(h.title).startsWith(norm(name)))?.appId;
	} catch {
		return undefined;
	}
}
async function iosSearch(name: string, domain?: string): Promise<string | undefined> {
	const hits = await searchApps(name, CC).catch(() => []);
	const n = norm(name);
	const d = domain ? norm(domain.split('.')[0]) : '';
	return hits.find((h: any) => norm(h.name).startsWith(n) || (d && norm(h.seller).includes(d)))?.id;
}

type Ids = { name?: string; domain?: string; iosId?: string; playId?: string };

/** Build a product from what we know (store ids, domain, name), filling the gaps by search. */
async function resolveFrom(ids: Ids): Promise<StoreApp | null> {
	let { name, domain, iosId, playId } = ids;
	const ios = iosId ? await lookup(iosId, CC).catch(() => null) : null;
	const play = playId ? await playApp(playId) : null;
	name = name || ios?.name || play?.title;
	if (!name) return null;
	const short = name.split(/[:\-–—|]/)[0].trim();
	const ios2 = ios ?? (await (async () => {
		const id = await iosSearch(short, domain);
		return id ? lookup(id, CC).catch(() => null) : null;
	})());
	const play2 = play ?? (await (async () => {
		const id = await playSearch(short);
		return id ? playApp(id) : null;
	})());
	if (!domain && play2?.developerWebsite) {
		try {
			domain = new URL(play2.developerWebsite).hostname.replace(/^www\./, '');
		} catch {
			/* ignore */
		}
	}
	if (!ios2 && !play2 && !domain) return null;
	const base: StoreApp = ios2 ?? {
		id: play2?.appId ?? domain!,
		name: short,
		icon: play2?.icon ?? '',
		seller: play2?.developer ?? domain ?? '',
		genre: play2?.genre ?? 'Website',
		genreId: play2?.genreId ?? '',
		rating: play2?.score ? +play2.score.toFixed(2) : 0,
		count: play2?.ratings ?? 0,
		version: play2?.version ?? '',
		updated: play2?.updated ? new Date(play2.updated).toISOString().slice(0, 10) : '',
		notes: play2?.recentChanges ?? '',
		price: play2?.priceText ?? 'Free',
		url: play2?.url ?? `https://${domain}`
	};
	return {
		...base,
		name: ios2 ? ios2.name.split(/[:\-–—|]/)[0].trim() || ios2.name : base.name,
		icon: base.icon || (domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : ''),
		iosId: ios2?.id,
		playId: play2?.appId,
		domain
	};
}

/** What the user pasted: an App Store or Google Play link, a website, or a name. */
export async function resolveProduct(input: string): Promise<StoreApp | null> {
	const raw = input.trim();
	const iosId = raw.match(/apps\.apple\.com\/.*\/id(\d+)/)?.[1];
	const playId = raw.match(/play\.google\.com\/.*[?&]id=([\w.]+)/)?.[1];
	if (iosId || playId) return resolveFrom({ iosId, playId });
	if (/^https?:\/\/|^[\w-]+(\.[\w-]+)+(\/|$)/i.test(raw)) {
		const url = new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`);
		const domain = url.hostname.replace(/^www\./, '');
		return resolveFrom({ name: await siteName(url), domain });
	}
	return resolveFrom({ name: raw });
}

// ---------- 2. three competitors ----------
async function findCompetitors(p: StoreApp, hint?: StoreApp[]): Promise<StoreApp[]> {
	// the database already knows this product: keep the same competitors (stable results)
	if (hint?.length) return hint.slice(0, 3);
	const out: StoreApp[] = [];
	const seen = new Set([norm(p.name)]);
	const sameKind = (a: StoreApp) => !p.genre || p.genre === 'Website' || !a.genre || a.genre === 'Website' || a.genre === p.genre;
	const add = (a: StoreApp | null, strict: boolean) => {
		if (!a || seen.has(norm(a.name)) || out.length >= 3) return;
		if (p.seller && a.seller && norm(a.seller) === norm(p.seller)) return; // same company: not a competitor
		if (strict && !sameKind(a)) return;
		out.push(a);
		seen.add(norm(a.name));
	};
	const list: { name: string; domain?: string }[] =
		(await claude(
			`Product: "${p.name}"${p.domain ? ` (${p.domain})` : ''}, by ${p.seller || 'unknown'}, category: ${p.genre}.\n` +
				`Name its 6 closest direct competitors: real products people use for the SAME main job and would switch to instead of it. Think about what the product is mainly used for first (e.g. DaVinci Resolve → video editing → Premiere Pro, Final Cut Pro, CapCut; never a design tool like Figma). Same kind of product only. Never products made by the same company. Most well-known first.\n` +
				`Answer JSON only: [{"name":"...","domain":"example.com"}]`,
			500,
			env.ANTHROPIC_MODEL || 'claude-sonnet-5-5'
		)) ?? [];
	const found: StoreApp[] = [];
	for (const c of list.slice(0, 5)) {
		if (!c?.name) continue;
		const a = await resolveFrom({ name: String(c.name), domain: c.domain ? String(c.domain).replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : undefined }).catch(() => null);
		if (a) found.push(a);
	}
	for (const a of found) add(a, true); // same category first
	// then similar apps on Google Play (same kind by construction), and only then the rest of Claude's list
	// without Claude: similar apps on Google Play (same kind by construction)
	if (out.length < 3 && p.playId) {
		const similar = await gplay.similar({ appId: p.playId, country: CC, lang: 'en' }).catch(() => []);
		for (const s of similar.slice(0, 6)) if (out.length < 3) add(await resolveFrom({ playId: s.appId }).catch(() => null), true);
	}
	for (const a of found) add(a, false);
	return out;
}

// ---------- 3. what users say ----------
const yearAgo = () => Math.floor(Date.now() / 1000) - 365 * 864e2;
const strip = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&#x2F;/g, '/').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/\s+/g, ' ').trim();

// App Store: the public reviews feed gives 50 reviews per page per country. We read several English-speaking
// storefronts and pages (stopping when a page is empty), so a product gets hundreds of reviews instead of ~100.
const APPSTORE_COUNTRIES = ['us', 'gb', 'ca', 'au'];
const APPSTORE_PAGES = 10; // the public feed's maximum
async function fromAppStore(p: StoreApp, quick = false): Promise<Review[]> {
	if (!p.iosId) return [];
	const out = new Map<string, Review>();
	await Promise.all(
		(quick ? APPSTORE_COUNTRIES.slice(0, 2) : APPSTORE_COUNTRIES).map(async (cc) => {
			for (let page = 1; page <= (quick ? 1 : APPSTORE_PAGES); page++) {
				const j = await fetch(`https://itunes.apple.com/${cc}/rss/customerreviews/page=${page}/id=${p.iosId}/sortby=mostrecent/json`, { signal: AbortSignal.timeout(8000), headers: { 'user-agent': UA } })
					.then((r) => (r.ok ? r.json() : null))
					.catch(() => null);
				const raw = j?.feed?.entry;
				const entries = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter((e: any) => e['im:rating']);
				if (!entries.length) break;
				for (const e of entries) {
					const id = `as:${e.id?.label ?? ''}`;
					if (!out.has(id)) out.set(id, { id, source: 'appstore', stars: Number(e['im:rating']?.label ?? 0), title: e.title?.label ?? '', text: String(e.content?.label ?? '').slice(0, 800), date: String(e.updated?.label ?? '').slice(0, 10), version: e['im:version']?.label ?? '', url: p.url });
				}
			}
		})
	);
	return [...out.values()];
}

async function fromGooglePlay(p: StoreApp, quick = false): Promise<Review[]> {
	if (!p.playId) return [];
	const res: any = await gplay.reviews({ appId: p.playId, sort: 2 /* newest */ as any, num: quick ? 100 : 1200, country: CC, lang: 'en' });
	return (res?.data ?? []).filter((r: any) => r.text).map((r: any) => ({ id: `gp:${r.id}`, source: 'googleplay' as const, stars: r.score ?? 0, title: r.title ?? '', text: String(r.text).slice(0, 800), date: String(r.date ?? '').slice(0, 10), version: r.version ?? '', url: r.url ?? `https://play.google.com/store/apps/details?id=${p.playId}` }));
}

let redditToken: { v: string; until: number } | null = null;
async function redditAuth(): Promise<string | null> {
	if (!env.REDDIT_CLIENT_ID || !env.REDDIT_CLIENT_SECRET) return null;
	if (redditToken && redditToken.until > Date.now()) return redditToken.v;
	const res = await fetch('https://www.reddit.com/api/v1/access_token', {
		method: 'POST',
		headers: { authorization: `Basic ${Buffer.from(`${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`).toString('base64')}`, 'content-type': 'application/x-www-form-urlencoded', 'user-agent': UA },
		body: 'grant_type=client_credentials',
		signal: AbortSignal.timeout(8000)
	});
	if (!res.ok) return null;
	const j = await res.json();
	redditToken = { v: j.access_token, until: Date.now() + (j.expires_in - 60) * 1000 };
	return redditToken.v;
}

// Reddit allows few requests without an app: one every 3 s, and a 15-minute pause after a 429.
let redditPausedUntil = 0;
let redditNext = 0;
async function fromReddit(p: StoreApp): Promise<Review[]> {
	if (Date.now() < redditPausedUntil) return [];
	const wait = Math.max(0, redditNext - Date.now());
	redditNext = Math.max(Date.now(), redditNext) + 3000;
	if (wait) await new Promise((r) => setTimeout(r, wait));
	const q = encodeURIComponent(`"${p.name}"`);
	const token = await redditAuth().catch(() => null);
	const url = token ? `https://oauth.reddit.com/search?q=${q}&sort=relevance&t=year&limit=60&type=link` : `https://www.reddit.com/search.json?q=${q}&sort=relevance&t=year&limit=60&type=link`;
	const res = await fetch(url, { headers: { 'user-agent': UA, ...(token ? { authorization: `Bearer ${token}` } : {}) }, signal: AbortSignal.timeout(10000) });
	if (res.status === 429) {
		redditPausedUntil = Date.now() + 15 * 60_000;
		throw new Error('Reddit 429: paused for 15 minutes');
	}
	if (!res.ok) throw new Error(`Reddit ${res.status}`);
	const re = new RegExp(`\\b${esc(p.name)}\\b`, 'i');
	const j = await res.json();
	return (j?.data?.children ?? [])
		.map((c: any) => c.data)
		.filter((d: any) => d && re.test(`${d.title} ${d.selftext ?? ''}`))
		.map((d: any) => ({ id: `rd:${d.id}`, source: 'reddit' as const, stars: 0, title: String(d.title).slice(0, 200), text: String(d.selftext ?? '').slice(0, 800), date: new Date(d.created_utc * 1000).toISOString().slice(0, 10), version: '', url: `https://www.reddit.com${d.permalink}` }));
}

async function fromHackerNews(p: StoreApp, quick = false): Promise<Review[]> {
	const res = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(`"${p.name}"`)}&tags=comment&hitsPerPage=${quick ? 30 : 100}&numericFilters=created_at_i>${yearAgo()}`, { signal: AbortSignal.timeout(10000) });
	if (!res.ok) throw new Error(`Hacker News ${res.status}`);
	const re = new RegExp(`\\b${esc(p.name)}\\b`, 'i');
	return ((await res.json()).hits ?? [])
		.map((h: any) => ({ h, text: strip(h.comment_text ?? '') }))
		.filter((x: any) => re.test(x.text))
		.map(({ h, text }: any) => ({ id: `hn:${h.objectID}`, source: 'hackernews' as const, stars: 0, title: h.story_title ? `On “${String(h.story_title).slice(0, 120)}”` : '', text: text.slice(0, 800), date: String(h.created_at ?? '').slice(0, 10), version: '', url: `https://news.ycombinator.com/item?id=${h.objectID}` }));
}


// GitHub: for products with a public repository, the open and closed issues people file (bugs, missing features).
// The repository must clearly be the product's own: its homepage is the product's domain, or its name matches and it
// has at least 500 stars. Works without a key (60 requests/hour); GITHUB_TOKEN raises the limit.
async function gh(path: string) {
	const res = await fetch(`https://api.github.com/${path}`, {
		headers: { accept: 'application/vnd.github+json', 'user-agent': 'Undercut', ...(env.GITHUB_TOKEN ? { authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}) },
		signal: AbortSignal.timeout(10000)
	});
	if (!res.ok) throw new Error(`GitHub ${res.status}`);
	return res.json();
}
async function fromGitHub(p: StoreApp, quick = false): Promise<Review[]> {
	const found = await gh(`search/repositories?q=${encodeURIComponent(`${p.name} in:name`)}&sort=stars&per_page=5`);
	const host = (u?: string | null) => {
		try {
			return u ? new URL(u.startsWith('http') ? u : `https://${u}`).hostname.replace(/^www\./, '') : '';
		} catch {
			return '';
		}
	};
	const repo = (found.items ?? []).find((r: any) => (p.domain && host(r.homepage) === p.domain) || (norm(r.name) === norm(p.name) && r.stargazers_count >= 500));
	if (!repo) return [];
	const issues = await gh(`repos/${repo.full_name}/issues?state=all&sort=created&direction=desc&per_page=${quick ? 30 : 100}`);
	return (issues ?? [])
		.filter((i: any) => !i.pull_request)
		.map((i: any) => ({ id: `gh:${i.id}`, source: 'github' as const, stars: 0, title: String(i.title).slice(0, 200), text: String(i.body ?? '').replace(/\s+/g, ' ').slice(0, 600), date: String(i.created_at ?? '').slice(0, 10), version: '', url: i.html_url }));
}

// Reddit is not used: its public search blocks server requests (429) and new API apps need Reddit's approval.
const FETCHERS: Partial<Record<Source, (p: StoreApp, quick?: boolean) => Promise<Review[]>>> = { appstore: fromAppStore, googleplay: fromGooglePlay, hackernews: fromHackerNews, github: fromGitHub };

async function fetchAll(p: StoreApp, quick = false, keep = 600): Promise<{ reviews: Review[]; sources: Partial<Record<Source, number>>; badShare?: number }> {
	const results = await Promise.all(
		(Object.keys(FETCHERS) as Source[]).map(async (s) => {
			try {
				return [s, await FETCHERS[s]!(p, quick)] as const;
			} catch (e) {
				log(s, p.name, (e as Error).message);
				return [s, [] as Review[]] as const;
			}
		})
	);
	const sources: Partial<Record<Source, number>> = {};
	const reviews: Review[] = [];
	for (const [s, list] of results) {
		sources[s] = list.length;
		reviews.push(...list);
	}
	reviews.sort((a, b) => b.date.localeCompare(a.date));
	// keep mostly what people complain about: up to 450 bad ones (1-3★, or forum posts) and 150 good ones to compare
	const rated = reviews.filter((r) => r.stars);
	const badShare = rated.length ? Math.round((rated.filter((r) => r.stars <= 3).length / rated.length) * 100) : undefined;
	// keep = how many reviews to keep (the analysed product 600, a competitor 200: fewer reviews to sort = lower AI cost)
	const bad = reviews.filter((r) => !r.stars || r.stars <= 3).slice(0, Math.round(keep * 0.75));
	const good = reviews.filter((r) => r.stars >= 4).slice(0, Math.round(keep * 0.25));
	return { reviews: [...bad, ...good].sort((a, b) => b.date.localeCompare(a.date)), sources, badShare };
}

// ---------- 4. themes ----------
const line = (i: number, r: Review) => `${i}|${r.stars ? r.stars + '★' : r.source}|${(r.title + '. ' + r.text).replace(/\s+/g, ' ').slice(0, 170)}`;

/** A balanced sample: up to `per` items per product, store reviews first. */
// mostly complaints (that's what the topics are for), a few good ones for the praise topics
const sampleOf = (products: ProductData[], per: number) =>
	products.flatMap((p) => [...p.reviews.filter((r) => !r.stars || r.stars <= 3).slice(0, Math.round(per * 0.85)), ...p.reviews.filter((r) => r.stars >= 4).slice(0, Math.round(per * 0.15))]);

async function groupThemes(products: ProductData[]): Promise<Theme[]> {
	const all = products.flatMap((p) => p.reviews);
	const sample = sampleOf(products, 70);
	// the main model for this one call: it decides how useful the whole report is
	const j = await claude(
		`These are reviews and forum mentions of ${products.length} competing products (${products.map((p) => p.app.name).join(', ')}). Founders will read the result to decide what to improve in their own product.\n` +
			`1) Complaints: list up to 14 CONCRETE improvements users ask for, shared across the products so they can be compared. Each one is phrased as an action a product team could take, specific enough to put in a backlog: "Add CSV export", "Let users cancel the subscription in the app", "Stop showing upgrade pop-ups on every screen", "Bring back offline mode". Never a vague category ("Bad UX", "Missing features", "Sync fails"): if many people ask for missing features, name each feature. For bugs, name what breaks ("Fix sync between phone and desktop").\n` +
			`   Give each a kind: feature (a missing or removed feature), pricing (price, paywall, trial, billing), ux (confusing, pushy, slow to use), reliability (bugs, crashes, sync, login), support, content (missing content, quality of content), other.\n` +
			`2) Praise: up to 4 things users love, short ("Easy to start", "Great free plan").\n` +
			`Labels in English, max 60 characters. Answer JSON only: {"themes":[{"type":"complaint","kind":"feature","label":"Add CSV export"},{"type":"praise","label":"Easy to start"}]}\n\n` +
			sample.map((r, i) => line(i, r)).join('\n'),
		1600,
		env.ANTHROPIC_MODEL || 'claude-sonnet-5-5'
	);
	const KINDS = ['feature', 'pricing', 'ux', 'reliability', 'support', 'content', 'other'];
	const themes: Theme[] = [];
	for (const t of j?.themes ?? []) {
		const type = t.type === 'praise' ? 'praise' : 'complaint';
		const theme: Theme = { id: slugify(String(t.label)) || `t${themes.length}`, type, label: String(t.label).slice(0, 60), kind: type === 'complaint' ? ((KINDS.includes(t.kind) ? t.kind : 'other') as Theme['kind']) : undefined };
		if (!themes.some((x) => x.id === theme.id)) themes.push(theme);
	}
	if (themes.length) {
		await assignThemes(themes, all);
		if (all.some((r) => r.theme)) return themes;
	}
	return (fallbackUsed = true), keywordThemes(all);
}

// Without AI: real themes from common words (English reviews). Stars decide complaint vs praise.
const KEYWORDS: [string, 'complaint' | 'praise', string, RegExp][] = [
	['price', 'complaint', 'Too expensive', /expensive|overpriced|pricey|price|subscription|charged|refund|money|cost/i],
	['bugs', 'complaint', 'Crashes and bugs', /crash|bug|glitch|freez|broken|error|doesn.?t work|not working|stopped working/i],
	['slow', 'complaint', 'Slow or laggy', /slow|lag|loading|takes forever|takes ages/i],
	['login', 'complaint', 'Login and account problems', /log ?in|sign ?in|password|account|verification|verify/i],
	['ads', 'complaint', 'Too many ads', /\bads?\b|advert|commercial/i],
	['support', 'complaint', 'Bad customer support', /support|customer service|no response|no reply|contact them|never answer/i],
	['delivery', 'complaint', 'Delivery and orders', /deliver|shipping|shipped|parcel|package|order|return/i],
	['sync', 'complaint', 'Sync and lost data', /sync|lost (my |all )?(data|notes|progress)|deleted|disappear/i],
	['ux', 'complaint', 'Hard to use / bad update', /confusing|hard to use|complicated|new update|latest update|redesign|interface|layout/i],
	['easy', 'praise', 'Easy to use', /easy|simple|intuitive|user.?friendly/i],
	['quality', 'praise', 'Great quality', /quality|well made|great product|works great|works well/i],
	['fast', 'praise', 'Fast and smooth', /fast|quick|smooth/i],
	['value', 'praise', 'Good value', /worth|value|affordable|good price|cheap/i],
	['service', 'praise', 'Helpful support', /helpful|great service|support (team )?was|responsive/i]
];
const NEGATIVE = /hate|terrible|awful|worst|useless|annoying|frustrat|disappoint|scam|problem|issue|can.?t|cannot|won.?t/i;

function keywordThemes(all: Review[]): Theme[] {
	const used = new Set<string>();
	for (const r of all) {
		const text = `${r.title} ${r.text}`;
		const bad = r.stars ? r.stars <= 3 : NEGATIVE.test(text);
		const hit = KEYWORDS.find(([, type, , re]) => type === (bad ? 'complaint' : 'praise') && re.test(text));
		if (hit) (r.theme = hit[0]), used.add(hit[0]);
		else if (r.stars) (r.theme = bad ? 'other-complaints' : 'other-praise'), used.add(r.theme);
	}
	return [
		...KEYWORDS.filter(([id]) => used.has(id)).map(([id, type, label]) => ({ id, type, label })),
		...(used.has('other-complaints') ? [{ id: 'other-complaints', type: 'complaint' as const, label: 'Other complaints' }] : []),
		...(used.has('other-praise') ? [{ id: 'other-praise', type: 'praise' as const, label: 'Other praise' }] : [])
	];
}

/** Put reviews into existing themes, 150 at a time, with a compact answer ("item:topic" lines) that never gets cut.
 *  Keeps theme ids stable, so fix statuses survive a refresh. */
async function assignThemes(themes: Theme[], items: Review[]) {
	const list = themes.map((t, i) => `${i + 1}. ${t.type}: ${t.label}`).join('\n');
	const todo = items.slice(0, 1200); // cost cap: about 12 short AI calls per report
	const chunks: Review[][] = [];
	for (let k = 0; k < todo.length; k += 100) chunks.push(todo.slice(k, k + 100));
	// several chunks at once: an analysis takes seconds instead of a minute
	const run = async (chunk: Review[]) => {
		const text = await claudeText(
			`Topics:\n${list}\n\nFor each item below (a review or forum mention), give the number of the topic it is clearly about. Answer 0 when the item doesn't explicitly mention that exact topic, when you are unsure, or when it is vague (\"bad app\", \"not worth it\"): many items should be 0. Never use a topic as a catch-all. Store reviews with 1-3★ can only go to complaint topics, 4-5★ only to praise topics.\n` +
				`Answer with one line per item, nothing else: item number, a colon, topic number. Example: 0:3\n\n${chunk.map((r, i) => line(i, r)).join('\n')}`,
			1200
		);
		if (!text) return;
		for (const m of text.matchAll(/(\d+)\s*:\s*(\d+)/g)) {
			const r = chunk[Number(m[1])];
			const t = themes[Number(m[2]) - 1];
			// the stars win over the AI: a 4-5★ review is never a complaint, a 1-2★ review never praise
			if (r && t && !(r.stars >= 4 && t.type === 'complaint') && !(r.stars && r.stars <= 2 && t.type === 'praise')) r.theme = t.id;
		}
	};
	for (let k = 0; k < chunks.length; k += 8) await Promise.all(chunks.slice(k, k + 8).map(run));
}

// ---------- the whole thing ----------
export async function analyze(input: string, resolved?: StoreApp | null, competitorHint?: StoreApp[]): Promise<Analysis> {
	const app = resolved ?? (await resolveProduct(input));
	if (!app) throw new Error('We could not find this product. Try its website, its App Store link or its Google Play link.');
	const comps = await findCompetitors(app, competitorHint);
	const products: ProductData[] = await Promise.all([app, ...comps].map(async (a, i) => ({ app: a, ...(await fetchAll(a, false, i === 0 ? 600 : 200)) })));
	if (!products[0].reviews.length) throw new Error(`We found ${app.name} but no reviews or mentions yet (App Store, Google Play, Reddit, Hacker News).`);
	aiError = '';
	fallbackUsed = false;
	const themes = await groupThemes(products);
	const now = new Date().toISOString();
	return { id: `${slugify(app.name)}-${Date.now().toString(36)}`, input, createdAt: now, refreshedAt: now, themes, main: products[0], competitors: products.slice(1), themeNote: fallbackUsed ? aiError || 'AI grouping failed' : undefined };
}

/** Refresh: new items only, same themes. */
export async function refresh(a: Analysis): Promise<Analysis> {
	const fresh: Review[] = [];
	// only the newest page of each source, for the 4 products at the same time
	const products = [a.main, ...a.competitors];
	// an old report (general topics) gets a full read; otherwise only the newest page of each source
	const full = Boolean(a.themeNote) || a.themes.some((t) => t.id === 'complaints') || !a.themes.some((t) => t.kind) || a.main.reviews.length < 400;
	const got = await Promise.all(products.map((p) => fetchAll(p.app, !full)));
	products.forEach((p, i) => {
		const known = new Set(p.reviews.map((r) => r.id));
		const added = got[i].reviews.filter((r) => !known.has(r.id));
		fresh.push(...added);
		p.reviews = [...added, ...p.reviews].sort((x, y) => y.date.localeCompare(x.date)).slice(0, 600);
		if (got[i].badShare != null) p.badShare = got[i].badShare;
		const sources: Partial<Record<Source, number>> = {};
		for (const r of p.reviews) if (r.source) sources[r.source] = (sources[r.source] ?? 0) + 1;
		p.sources = sources;
	});
	const fallback = Boolean(a.themeNote) || a.themes.some((t) => t.id === 'complaints');
	if (fallback) {
		// themes were basic: try the AI grouping again on everything (fix statuses on old themes are reset)
		aiError = '';
		fallbackUsed = false;
		const all = [a.main, ...a.competitors];
		for (const p of all) for (const r of p.reviews) r.theme = undefined;
		a.themes = await groupThemes(all);
		a.themeNote = fallbackUsed ? aiError || 'AI grouping failed' : undefined;
		if (!a.themeNote) a.main.fixes = undefined;
	} else await assignThemes(a.themes, fresh);
	a.refreshedAt = new Date().toISOString();
	return a;
}

// ---------- numbers ----------
export const count = (p: ProductData, themeId: string) => p.reviews.filter((r) => r.theme === themeId).length;

/** Verified fix: since the fix date, complaints on that theme came in at less than half the rate of before. */
export function fixVerified(p: ProductData, themeId: string): boolean {
	const f = p.fixes?.[themeId];
	if (!f || f.status !== 'fixed' || !f.at) return false;
	const dated = p.reviews.filter((r) => r.date);
	if (!dated.length) return false;
	const first = dated.reduce((m, r) => (r.date < m ? r.date : m), dated[0].date);
	const last = dated.reduce((m, r) => (r.date > m ? r.date : m), dated[0].date);
	const days = (x: string, y: string) => Math.max(1, (Date.parse(y) - Date.parse(x)) / 864e5);
	if (days(f.at, last) < 7) return false; // too early to tell
	const before = dated.filter((r) => r.theme === themeId && r.date < f.at!).length / days(first, f.at);
	const after = dated.filter((r) => r.theme === themeId && r.date >= f.at!).length / days(f.at, last);
	return before > 0 && after < before / 2;
}

/** Share of complaint mentions whose theme is fixed and verified (0-100). */
export function fixScore(a: Analysis): number {
	const complaints = a.themes.filter((t) => t.type === 'complaint');
	const total = complaints.reduce((s, t) => s + count(a.main, t.id), 0);
	if (!total) return 0;
	const fixed = complaints.filter((t) => fixVerified(a.main, t.id)).reduce((s, t) => s + count(a.main, t.id), 0);
	return Math.round((fixed / total) * 100);
}

/** Group the reviews again with AI, without fetching new ones (fast). Returns the reason when it falls back. */
export async function regroup(a: Analysis): Promise<Analysis> {
	aiError = '';
	fallbackUsed = false;
	const all = [a.main, ...a.competitors];
	for (const p of all) for (const r of p.reviews) r.theme = undefined;
	a.themes = await groupThemes(all);
	a.themeNote = fallbackUsed ? aiError || 'AI grouping failed' : undefined;
	if (!a.themeNote) a.main.fixes = undefined;
	return a;
}


// ---------- editing competitors ----------
/** Add a competitor the user chose: its reviews are fetched and put into the report's existing topics. */
export async function addCompetitor(a: Analysis, input: string): Promise<Analysis> {
	if (a.competitors.length >= 5) throw new Error('A report compares up to 5 competitors.');
	const app = await resolveProduct(input);
	if (!app) throw new Error('We could not find this product. Try its website, App Store or Google Play link.');
	if ([a.main, ...a.competitors].some((p) => norm(p.app.name) === norm(app.name))) throw new Error(`${app.name} is already in this report.`);
	const got = await fetchAll(app, true);
	await assignThemes(a.themes, got.reviews.slice(0, 300));
	a.competitors.push({ app, reviews: got.reviews, sources: got.sources, badShare: got.badShare });
	return a;
}

/** Complaints per week for the last `weeks` weeks (oldest first), from the review dates. */
export function weeklyComplaints(p: ProductData, themes: Theme[], weeks = 8): number[] {
	const ids = new Set(themes.filter((t) => t.type === 'complaint').map((t) => t.id));
	const now = Date.now();
	const out = Array(weeks).fill(0);
	for (const r of p.reviews) {
		if (!r.theme || !ids.has(r.theme)) continue;
		const ago = Math.floor((now - Date.parse(r.date)) / (7 * 864e5));
		if (ago >= 0 && ago < weeks) out[weeks - 1 - ago]++;
	}
	return out;
}

/** The product's own store text (what it says it does), App Store first, else Google Play. Empty when none. */
export async function storeDescription(app: StoreApp): Promise<string> {
	try {
		if (app.iosId) {
			const r = await fetch(`https://itunes.apple.com/lookup?id=${encodeURIComponent(app.iosId)}&country=us`, { signal: AbortSignal.timeout(8000) });
			const j = await r.json();
			if (j.results?.[0]?.description) return String(j.results[0].description).slice(0, 3000);
		}
		if (app.playId) return String(((await gplay.app({ appId: app.playId, country: CC, lang: 'en' })) as any)?.description ?? '').slice(0, 3000);
	} catch {
		/* none */
	}
	return '';
}

/** The app's own store screenshots (App Store first, else Google Play). */
export async function storeScreens(app: StoreApp): Promise<string[]> {
	if (app.screenshots?.length) return app.screenshots;
	try {
		if (app.iosId) return (await lookup(app.iosId, 'us'))?.screenshots ?? [];
		if (app.playId) return ((await gplay.app({ appId: app.playId, country: CC, lang: 'en' })) as any)?.screenshots?.slice(0, 6) ?? [];
	} catch {
		/* none */
	}
	return [];
}
