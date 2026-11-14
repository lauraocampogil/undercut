// Keywords per client.
// - Website: tracked Google keywords with position, clicks and impressions from Search Console
//   (demo numbers for demo clients / when Google is not connected).
// - App: tracked App Store keywords with the app's real rank in App Store search (iTunes Search API, no key).
import type { Client } from '#lib/types.ts';
import { readData, writeData } from '#lib/server/store.ts';
import { getSearchConsole, gscQuery } from '#lib/server/google.ts';
import { suggest, type Lang } from '#lib/server/ideas.ts';

export type Tracked = { web: string[]; app: string[]; lang: Lang; geo: string };
const file = (id: string) => `keywords-${id}.json`;

function seedFor(client: Client): Tracked {
	const words = client.name.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && w !== 'app');
	const appSeed = words.length > 1 ? [words.join(' '), `${words[words.length - 1]} app`] : [words[0] ?? client.name.toLowerCase()];
	return { web: [], app: client.type !== 'web' ? appSeed : [], lang: 'fr', geo: 'BE' };
}

export function getTracked(client: Client): Tracked {
	return readData<Tracked>(file(client.id), seedFor(client));
}
export function saveTracked(client: Client, t: Tracked) {
	writeData(file(client.id), t);
}
export function track(client: Client, kind: 'web' | 'app', keyword: string) {
	const k = keyword.trim().toLowerCase().slice(0, 80);
	if (!k) return;
	const t = getTracked(client);
	if (!t[kind].includes(k)) t[kind] = [k, ...t[kind]].slice(0, 50);
	saveTracked(client, t);
}
export function untrack(client: Client, kind: 'web' | 'app', keyword: string) {
	const t = getTracked(client);
	t[kind] = t[kind].filter((x) => x !== keyword);
	saveTracked(client, t);
}

// ---------- website ----------
export type WebRank = { keyword: string; position: number | null; clicks: number; impressions: number; prevClicks: number; ctr: number };

export async function webKeywords(client: Client, days = 28) {
	const t = getTracked(client);
	const gsc = await getSearchConsole(client, days);
	const find = (k: string) => gsc.queries.find((q) => q.key === k);
	// first visit: start tracking the client's top 5 searches so the page is never empty
	if (!t.web.length && gsc.queries.length) {
		t.web = gsc.queries.slice(0, 5).map((q) => q.key);
		saveTracked(client, t);
	}
	const tracked: WebRank[] = await Promise.all(
		t.web.map(async (k) => {
			let r: { position: number; clicks: number; impressions: number; ctr: number; prevClicks?: number } | null | undefined = find(k);
			if (!r && gsc.source === 'google') r = await gscQuery(client, k, days).catch(() => null);
			if (!r && gsc.source !== 'google') {
				// demo client: stable, plausible numbers so the flow can be tried
				const h = hash(k);
				const position = 3 + (h % 38);
				const impressions = 40 + (h % 900);
				r = { position, impressions, clicks: Math.round(impressions * (position < 10 ? 0.06 : 0.01)), ctr: 0, prevClicks: 0 };
			}
			return { keyword: k, position: r?.position ?? null, clicks: r?.clicks ?? 0, impressions: r?.impressions ?? 0, prevClicks: r?.prevClicks ?? r?.clicks ?? 0, ctr: r?.ctr ?? 0 };
		})
	);
	// Quick wins: already seen on Google, ranking 4–20 → a small push brings them to page 1 / top 3
	const opportunities = gsc.queries
		.filter((q) => q.position >= 4 && q.position <= 20 && !t.web.includes(q.key))
		.sort((a, b) => b.impressions - a.impressions)
		.slice(0, 5);
	return { source: gsc.source, tracked, opportunities, lang: t.lang, geo: t.geo };
}

// ---------- app (App Store) ----------
export type AppRank = { keyword: string; rank: number | null; top: { name: string; id: number; icon: string }[]; source: 'appstore' | 'demo' | 'error' };

const cache = new Map<string, { at: number; v: AppRank }>();
function hash(s: string) {
	let h = 0;
	for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
	return h;
}

export async function appRank(keyword: string, iosId: string | undefined, country = 'be'): Promise<AppRank> {
	const key = `${keyword}|${iosId}|${country}`;
	const hit = cache.get(key);
	if (hit && Date.now() - hit.at < 6 * 3600_000) return hit.v;
	let v: AppRank;
	try {
		const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(keyword)}&entity=software&country=${country}&limit=100`, { signal: AbortSignal.timeout(6000) });
		if (!res.ok) throw new Error(`App Store ${res.status}`);
		const j = (await res.json()) as { results: { trackId: number; trackName: string; artworkUrl60: string }[] };
		const idx = iosId ? j.results.findIndex((r) => String(r.trackId) === iosId) : -1;
		v = { keyword, rank: idx >= 0 ? idx + 1 : null, top: j.results.slice(0, 3).map((r) => ({ name: r.trackName, id: r.trackId, icon: r.artworkUrl60 })), source: 'appstore' };
	} catch {
		// Offline / blocked: deterministic demo numbers, clearly labelled
		const h = hash(keyword);
		v = { keyword, rank: iosId ? null : (h % 40) + 1, top: [{ name: `${keyword.split(' ')[0]} Pro`, id: 0, icon: '' }, { name: 'Top competitor', id: 0, icon: '' }, { name: 'Another app', id: 0, icon: '' }], source: 'demo' };
	}
	cache.set(key, { at: Date.now(), v });
	return v;
}

export async function appKeywords(client: Client) {
	const t = getTracked(client);
	const country = t.geo.toLowerCase();
	const tracked = await Promise.all(t.app.map((k) => appRank(k, client.app?.iosId, country)));
	return { tracked, hasIosId: Boolean(client.app?.iosId), geo: t.geo };
}

/** App keyword ideas: what people type in stores (Google autocomplete with "app") + competitor names. */
export async function appIdeas(term: string, client: Client) {
	const t = getTracked(client);
	const [a, b, rank] = await Promise.all([suggest(`${term} app`, t.lang, t.geo), suggest(term, t.lang, t.geo), appRank(term, client.app?.iosId, t.geo.toLowerCase())]);
	const ideas = [...new Set([...b, ...a.map((x) => x.replace(/\s+app$/, ''))].map((x) => x.toLowerCase()))].filter((x) => x !== term.toLowerCase()).slice(0, 16);
	return { term, ideas: ideas.length ? ideas : [`${term} gratuit`, `${term} belgique`, `meilleure app ${term}`, `${term} en ligne`], suggestSource: ideas.length ? 'google' : 'demo', rank };
}
