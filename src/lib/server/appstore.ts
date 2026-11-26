// App Store tracker per client app (iOS) — public Apple data, no key needed:
// - lookup: rating, rating count, version, release notes, genre
// - top charts (free / paid / grossing, overall + the app's category) → daily rank
// - customer reviews RSS (most recent 100)
// - competitors: same data for up to 5 other apps
// One snapshot per day is stored, so rank / rating history builds up over time.
import type { Client } from '#lib/types.ts';
import type { Draft } from './insights.ts';
import { readData, writeData, listClients, hasApp } from './store.ts';

export type StoreApp = { id: string; name: string; icon: string; seller: string; genre: string; genreId: string; rating: number; count: number; version: string; updated: string; notes: string; price: string; url: string };
export type Review = { id: string; stars: number; title: string; text: string; author: string; version: string; date: string };
export type Snap = { date: string; rating: number; count: number; version: string; rankAll: number | null; rankCat: number | null; chart: 'free' | 'paid' };
export type StoreState = { cc: string; competitors: string[]; history: Snap[]; versions: { version: string; date: string; notes: string }[]; comp: Record<string, Snap[]>; seenReviews?: string[] };

const file = (id: string) => `appstore-${id}.json`;
const today = () => new Date().toISOString().slice(0, 10);
const cache = new Map<string, { at: number; v: unknown }>();
async function cached<T>(key: string, ms: number, fn: () => Promise<T>): Promise<T> {
	const hit = cache.get(key);
	if (hit && Date.now() - hit.at < ms) return hit.v as T;
	const v = await fn();
	cache.set(key, { at: Date.now(), v });
	return v;
}
const get = (url: string) => fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'Mozilla/5.0 (Undercut app tracker)' } }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Apple answered ${r.status}`))));

export function storeState(client: Client): StoreState {
	return readData<StoreState>(file(client.id), { cc: 'be', competitors: [], history: [], versions: [], comp: {} });
}
export function saveStoreState(client: Client, s: StoreState) {
	writeData(file(client.id), s);
}

export async function lookup(id: string, cc: string): Promise<StoreApp | null> {
	return cached(`lk|${id}|${cc}`, 3600_000, async () => {
		const j = await get(`https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}&country=${cc}`);
		const a = j.results?.[0];
		if (!a) return null;
		return {
			id: String(a.trackId),
			name: a.trackName,
			icon: a.artworkUrl100 ?? a.artworkUrl60 ?? '',
			seller: a.sellerName ?? a.artistName ?? '',
			genre: a.primaryGenreName ?? '',
			genreId: String(a.primaryGenreId ?? ''),
			rating: +(a.averageUserRating ?? 0).toFixed(2),
			count: a.userRatingCount ?? 0,
			version: a.version ?? '',
			updated: String(a.currentVersionReleaseDate ?? '').slice(0, 10),
			notes: String(a.releaseNotes ?? '').slice(0, 600),
			price: a.formattedPrice ?? 'Free',
			url: a.trackViewUrl ?? '',
			screenshots: [...(a.screenshotUrls ?? []), ...(a.ipadScreenshotUrls ?? [])].slice(0, 6)
		};
	});
}

/** Search apps by name (to add competitors). */
export async function searchApps(term: string, cc: string) {
	return cached(`s|${term}|${cc}`, 3600_000, async () => {
		const j = await get(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&country=${cc}&limit=8`);
		return (j.results ?? []).map((a: any) => ({ id: String(a.trackId), name: a.trackName as string, icon: (a.artworkUrl60 ?? '') as string, seller: (a.sellerName ?? '') as string }));
	});
}

type ChartKind = 'topfreeapplications' | 'toppaidapplications' | 'topgrossingapplications';
async function chart(cc: string, kind: ChartKind, genreId?: string): Promise<string[]> {
	return cached(`ch|${cc}|${kind}|${genreId ?? ''}`, 3 * 3600_000, async () => {
		const j = await get(`https://itunes.apple.com/${cc}/rss/${kind}/limit=200${genreId ? `/genre=${genreId}` : ''}/json`);
		return (j.feed?.entry ?? []).map((e: any) => String(e.id?.attributes?.['im:id'] ?? ''));
	});
}

export async function reviews(id: string, cc: string): Promise<Review[]> {
	return cached(`rv|${id}|${cc}`, 3600_000, async () => {
		const pages = await Promise.all([1, 2].map((p) => get(`https://itunes.apple.com/${cc}/rss/customerreviews/page=${p}/id=${id}/sortby=mostrecent/json`).catch(() => null)));
		const out: Review[] = [];
		for (const j of pages) {
			const entries = j?.feed?.entry;
			for (const e of Array.isArray(entries) ? entries : entries ? [entries] : []) {
				if (!e['im:rating']) continue; // first entry of old feeds is the app itself
				out.push({ id: String(e.id?.label ?? ''), stars: Number(e['im:rating']?.label ?? 0), title: e.title?.label ?? '', text: String(e.content?.label ?? '').slice(0, 800), author: e.author?.name?.label ?? '', version: e['im:version']?.label ?? '', date: String(e.updated?.label ?? '').slice(0, 10) });
			}
		}
		return out;
	});
}

async function rankOf(id: string, cc: string, paid: boolean, genreId: string) {
	const kind: ChartKind = paid ? 'toppaidapplications' : 'topfreeapplications';
	const [all, cat] = await Promise.all([chart(cc, kind).catch(() => [] as string[]), genreId ? chart(cc, kind, genreId).catch(() => [] as string[]) : Promise.resolve([] as string[])]);
	const pos = (l: string[]) => (l.indexOf(id) >= 0 ? l.indexOf(id) + 1 : null);
	return { rankAll: pos(all), rankCat: pos(cat) };
}

async function snapFor(id: string, cc: string): Promise<{ app: StoreApp; snap: Snap } | null> {
	const app = await lookup(id, cc);
	if (!app) return null;
	const paid = app.price !== 'Free' && !/^0/.test(app.price) && app.price !== 'Gratuit';
	const r = await rankOf(id, cc, paid, app.genreId);
	return { app, snap: { date: today(), rating: app.rating, count: app.count, version: app.version, chart: paid ? 'paid' : 'free', ...r } };
}

const upsert = (list: Snap[], s: Snap) => [...list.filter((x) => x.date !== s.date), s].sort((a, b) => a.date.localeCompare(b.date)).slice(-400);

/** Take today's snapshot (app + competitors). Cheap to call: Apple data is cached. */
export async function snapshotStore(client: Client, force = false) {
	const iosId = client.app?.iosId;
	if (!iosId || client.demo) return;
	const s = storeState(client);
	if (!force && s.history.at(-1)?.date === today() && s.competitors.every((c) => s.comp[c]?.at(-1)?.date === today())) return;
	const main = await snapFor(iosId, s.cc).catch(() => null);
	if (main) {
		s.history = upsert(s.history, main.snap);
		if (main.app.version && !s.versions.some((v) => v.version === main.app.version)) s.versions = [{ version: main.app.version, date: main.app.updated, notes: main.app.notes }, ...s.versions].slice(0, 30);
	}
	for (const c of s.competitors) {
		const r = await snapFor(c, s.cc).catch(() => null);
		if (r) s.comp[c] = upsert(s.comp[c] ?? [], r.snap);
	}
	saveStoreState(client, s);
}

/** Daily job: every app client of the workspace. */
export async function snapshotAllApps() {
	for (const c of listClients()) if (hasApp(c) && c.app?.iosId) await snapshotStore(c).catch(() => null);
}

export type StoreTracker = {
	source: 'live' | 'demo' | 'off' | 'error';
	error?: string;
	cc: string;
	app: StoreApp | null;
	today: Snap | null;
	prev: Snap | null;
	history: Snap[];
	versions: StoreState['versions'];
	reviews: Review[];
	stars: number[]; // count of 1..5 stars in recent reviews
	competitors: { app: StoreApp; snap: Snap | null; prev: Snap | null }[];
};

export async function getStoreTracker(client: Client): Promise<StoreTracker> {
	if (client.demo) return demoStore(client);
	const s = storeState(client);
	const empty = { cc: s.cc, app: null, today: null, prev: null, history: [], versions: [], reviews: [], stars: [0, 0, 0, 0, 0], competitors: [] };
	if (!client.app?.iosId) return { source: 'off', ...empty };
	try {
		await snapshotStore(client);
		const fresh = storeState(client);
		const [app, rv] = await Promise.all([lookup(client.app.iosId, fresh.cc), reviews(client.app.iosId, fresh.cc).catch(() => [])]);
		if (!app) return { source: 'error', error: `No app with ID ${client.app.iosId} in the ${fresh.cc.toUpperCase()} App Store. Check the ID in Setup, or switch country.`, ...empty };
		const stars = [1, 2, 3, 4, 5].map((n) => rv.filter((r) => r.stars === n).length);
		const competitors = (
			await Promise.all(
				fresh.competitors.map(async (id) => {
					const a = await lookup(id, fresh.cc).catch(() => null);
					const h = fresh.comp[id] ?? [];
					return a ? { app: a, snap: h.at(-1) ?? null, prev: h.at(-2) ?? null } : null;
				})
			)
		).filter((x): x is NonNullable<typeof x> => Boolean(x));
		return { source: 'live', cc: fresh.cc, app, today: fresh.history.at(-1) ?? null, prev: fresh.history.at(-2) ?? null, history: fresh.history, versions: fresh.versions, reviews: rv, stars, competitors };
	} catch (e) {
		return { source: 'error', error: `Apple could not be reached (${(e as Error).message}). Try again in a minute.`, ...empty };
	}
}

export function storeTasks(t: StoreTracker): Draft[] {
	const out: Draft[] = [];
	if (!t.app) return out;
	const bad = t.reviews.filter((r) => r.stars <= 2 && Date.now() - Date.parse(r.date) < 7 * 864e5);
	if (bad.length) out.push({ level: bad.length >= 3 ? 'bad' : 'warn', area: 'App', title: `${bad.length} bad review${bad.length > 1 ? 's' : ''} this week (1–2★)`, meaning: `Latest: “${bad[0].title}” — ${bad[0].text.slice(0, 120)}`, action: 'Answer them in App Store Connect within 48 h, and fix what comes back twice.' });
	if (t.today?.rankCat && t.prev?.rankCat && t.today.rankCat - t.prev.rankCat >= 10) out.push({ level: 'warn', area: 'App', title: `Dropped ${t.today.rankCat - t.prev.rankCat} places in ${t.app.genre}`, meaning: `Now #${t.today.rankCat} (was #${t.prev.rankCat}) in the ${t.cc.toUpperCase()} top ${t.today.chart} chart.`, action: 'Check recent reviews and the last update; a fresh screenshot or a small update often helps.' });
	if (t.today?.rankCat && t.prev?.rankCat && t.prev.rankCat - t.today.rankCat >= 10) out.push({ level: 'good', area: 'App', title: `Up ${t.prev.rankCat - t.today.rankCat} places in ${t.app.genre}`, meaning: `Now #${t.today.rankCat} in the ${t.cc.toUpperCase()} chart.`, action: 'Tell the client — and look at what changed (campaign, update, feature).' });
	const old = t.history.find((h) => Date.now() - Date.parse(h.date) >= 28 * 864e5);
	if (old && t.app.rating && old.rating - t.app.rating >= 0.1) out.push({ level: 'warn', area: 'App', title: `Rating down to ${t.app.rating.toFixed(1)}★`, meaning: `It was ${old.rating.toFixed(1)}★ a month ago.`, action: 'Read the 1–2★ reviews: usually one bug or one annoying screen explains it.' });
	return out;
}

// ---------- demo ----------
function demoStore(client: Client): StoreTracker {
	const days = 60;
	const history: Snap[] = [];
	let rank = 48;
	for (let i = days; i >= 0; i--) {
		const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
		rank = Math.max(3, Math.min(120, rank + Math.round(Math.sin(i / 4) * 3 + (i < 12 ? -2 : 0.6))));
		history.push({ date: d, rating: +(4.4 + Math.sin(i / 10) * 0.08).toFixed(2), count: 3400 + (days - i) * 11, version: i > 20 ? '3.4.0' : '3.5.0', rankAll: rank > 60 ? null : rank * 3 + 40, rankCat: rank, chart: 'free' });
	}
	const app: StoreApp = { id: client.app?.iosId ?? '0', name: client.app?.name ?? client.name, icon: '', seller: client.name, genre: 'Health & Fitness', genreId: '6013', rating: 4.5, count: history.at(-1)!.count, version: '3.5.0', updated: history.at(-20)!.date, notes: 'New: dark mode, Apple Watch workouts, faster sync.', price: 'Free', url: '#' };
	const reviews: Review[] = [
		{ id: '1', stars: 5, title: 'Super app', text: 'Simple et efficace, je l’utilise tous les jours.', author: 'Sophie', version: '3.5.0', date: history.at(-1)!.date },
		{ id: '2', stars: 2, title: 'Crash au démarrage', text: 'Depuis la dernière mise à jour l’app se ferme quand j’ouvre mon profil.', author: 'Tom', version: '3.5.0', date: history.at(-2)!.date },
		{ id: '3', stars: 4, title: 'Très bien', text: 'Il manque juste un widget.', author: 'Lien', version: '3.5.0', date: history.at(-4)!.date },
		{ id: '4', stars: 1, title: 'Abonnement trop cher', text: 'L’écran premium revient à chaque séance.', author: 'Karim', version: '3.4.0', date: history.at(-6)!.date },
		{ id: '5', stars: 5, title: 'Top', text: 'Les programmes sont géniaux.', author: 'Marie', version: '3.4.0', date: history.at(-9)!.date }
	];
	const comp = (name: string, r: number, c: number, k: number): StoreTracker['competitors'][number] => ({ app: { ...app, id: name, name, rating: r, count: c, version: '2.1', seller: name }, snap: { ...history.at(-1)!, rating: r, count: c, rankCat: k }, prev: { ...history.at(-2)!, rating: r, count: c, rankCat: k + 2 } });
	return { source: 'demo', cc: 'be', app, today: history.at(-1)!, prev: history.at(-2)!, history, versions: [{ version: '3.5.0', date: app.updated, notes: app.notes }, { version: '3.4.0', date: history[10].date, notes: 'Bug fixes.' }], reviews, stars: [1, 1, 0, 1, 2], competitors: [comp('FitPlan', 4.7, 18200, 9), comp('Gymly', 4.3, 2100, 27)] };
}
