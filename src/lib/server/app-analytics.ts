// App analytics for clients with an iOS / Android app.
// - Usage, retention, screens, versions, crashes: GA4 (the Firebase-linked GA4 property
//   of the app, same Google login as the website). Filtered on platform iOS + Android.
// - Ratings & reviews: App Store public API (free, no key). Google Play needs a service
//   account (Play Developer API) → demo until connected.
// - Downloads: App Store Connect / Play Console reports → demo until connected.
import type { Client, Point } from '#lib/types.ts';
import type { Draft } from './insights.ts';
import { dateRange } from './demo.ts';
import { gaReport, googleReady } from './google.ts';

export type AppMetrics = {
	source: { usage: 'google' | 'demo' | 'error'; ios: 'live' | 'demo' | 'off'; android: 'demo' | 'off'; downloads: 'demo' };
	error?: string;
	range: { start: string; end: string; days: number };
	dau: Point[];
	active: { total: number; prev: number };
	newUsers: { total: number; prev: number };
	mau: number;
	stickiness: number; // DAU / MAU in %
	sessionsPerUser: number;
	avgSessionSec: number;
	crashFree: number; // % of users without a crash
	platforms: { name: 'iOS' | 'Android'; users: number }[];
	retention: { cohort: string; size: number; weeks: number[] }[]; // weeks[0]=100, then week 1..4 in %
	screens: { name: string; views: number }[];
	versions: { version: string; users: number }[];
	downloads: { total: number; prev: number };
	store: {
		ios: { rating: number; count: number; version: string; url?: string } | null;
		android: { rating: number; count: number } | null;
		reviews: { platform: 'iOS' | 'Android'; stars: number; title: string; text: string; date: string; author: string }[];
	};
};

function rng(seed: string) {
	let h = 2166136261;
	for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
	return () => ((h = Math.imul(h ^ (h >>> 15), 2246822519) ^ Math.imul(h ^ (h >>> 13), 3266489917)) >>> 0) / 4294967296;
}

function demoApp(client: Client, days: number): AppMetrics {
	const r = rng(client.id + 'app' + days);
	const range = dateRange(days);
	const base = 900 + Math.floor(r() * 2500);
	const dau: Point[] = [];
	const d0 = new Date(range.start + 'T00:00:00Z');
	for (let i = 0; i < days; i++) {
		const d = new Date(d0);
		d.setUTCDate(d0.getUTCDate() + i);
		const wd = d.getUTCDay();
		const weekendBoost = wd === 0 || wd === 6 ? 1.18 : 1;
		dau.push({ date: d.toISOString().slice(0, 10), value: Math.round(base * (1 + i * 0.006) * weekendBoost * (0.9 + r() * 0.2)) });
	}
	const avgDau = dau.reduce((s, p) => s + p.value, 0) / days;
	const mau = Math.round(avgDau * (4.2 + r() * 1.5));
	const active = Math.round(mau * (days / 28) ** 0.4);
	const w1 = 28 + Math.round(r() * 14);
	const retention = ['4 weeks ago', '3 weeks ago', '2 weeks ago', 'Last week'].map((cohort, i) => {
		const weeks = [100, w1 + Math.round((r() - 0.5) * 6), Math.round(w1 * 0.72), Math.round(w1 * 0.6), Math.round(w1 * 0.52)];
		return { cohort, size: Math.round(400 + r() * 500), weeks: weeks.slice(0, 5 - i) };
	});
	const screens = ['Home', 'Workout player', 'Plans', 'Progress', 'Profile', 'Settings', 'Paywall'].map((name, i) => ({ name, views: Math.round((active * 9) / (i + 1.3) * (0.8 + r() * 0.4)) })).sort((a, b) => b.views - a.views);
	const ver = `${2 + Math.floor(r() * 2)}.${Math.floor(r() * 9)}`;
	const versions = [
		{ version: `${ver}.1`, users: Math.round(active * 0.58) },
		{ version: `${ver}.0`, users: Math.round(active * 0.27) },
		{ version: 'Older', users: Math.round(active * 0.15) }
	];
	const iosShare = 0.45 + r() * 0.2;
	const rating = +(3.9 + r() * 0.9).toFixed(1);
	const reviews: AppMetrics['store']['reviews'] = [
		{ platform: 'iOS', stars: 5, title: 'Super app', text: 'Simple et efficace, je l’utilise tous les jours.', date: '2026-11-08', author: 'Sophie' },
		{ platform: 'Android', stars: 2, title: 'Crash au démarrage', text: 'Depuis la dernière mise à jour l’app se ferme quand j’ouvre mon profil.', date: '2026-11-07', author: 'Tom' },
		{ platform: 'iOS', stars: 4, title: 'Très bien', text: 'Il manque juste le mode sombre.', date: '2026-11-05', author: 'Lien' },
		{ platform: 'Android', stars: 1, title: 'Trop de pubs', text: 'L’écran premium revient à chaque séance.', date: '2026-11-03', author: 'Karim' }
	];
	return {
		source: { usage: 'demo', ios: client.app?.iosId ? 'demo' : 'demo', android: 'demo', downloads: 'demo' },
		range,
		dau,
		active: { total: active, prev: Math.round(active / (1.04 + r() * 0.12)) },
		newUsers: { total: Math.round(active * 0.22), prev: Math.round(active * 0.2) },
		mau,
		stickiness: Math.round((avgDau / mau) * 100),
		sessionsPerUser: +(2.2 + r() * 2).toFixed(1),
		avgSessionSec: Math.round(150 + r() * 240),
		crashFree: +(98.4 + r() * 1.5).toFixed(2),
		platforms: [
			{ name: 'iOS', users: Math.round(active * iosShare) },
			{ name: 'Android', users: Math.round(active * (1 - iosShare)) }
		],
		retention,
		screens,
		versions,
		downloads: { total: Math.round(active * 0.3), prev: Math.round(active * 0.26) },
		store: { ios: { rating, count: 120 + Math.floor(r() * 900), version: `${ver}.1` }, android: { rating: +(rating - 0.3).toFixed(1), count: 300 + Math.floor(r() * 1500) }, reviews }
	};
}

async function appStore(iosId: string, country = 'be') {
	const [lookup, rss] = await Promise.all([
		fetch(`https://itunes.apple.com/lookup?id=${encodeURIComponent(iosId)}&country=${country}`).then((r) => r.json()),
		fetch(`https://itunes.apple.com/${country}/rss/customerreviews/id=${encodeURIComponent(iosId)}/sortBy=mostRecent/json`)
			.then((r) => r.json())
			.catch(() => null)
	]);
	const app = lookup.results?.[0];
	if (!app) throw new Error('App not found on the App Store');
	const entries = (rss?.feed?.entry ?? []).filter((e: any) => e['im:rating']).slice(0, 6);
	return {
		ios: { rating: +(app.averageUserRating ?? 0).toFixed(1), count: app.userRatingCount ?? 0, version: app.version, url: app.trackViewUrl },
		reviews: entries.map((e: any) => ({
			platform: 'iOS' as const,
			stars: Number(e['im:rating'].label),
			title: e.title?.label ?? '',
			text: e.content?.label ?? '',
			date: (e.updated?.label ?? '').slice(0, 10),
			author: e.author?.name?.label ?? ''
		}))
	};
}

export async function getAppMetrics(client: Client, days = 28): Promise<AppMetrics> {
	const m = demoApp(client, days);
	if (!client.app) m.source.ios = 'off';

	// Live App Store ratings + reviews (public, no login)
	if (client.app?.iosId && !client.demo) {
		try {
			const s = await appStore(client.app.iosId);
			m.store.ios = s.ios;
			m.store.reviews = [...s.reviews, ...m.store.reviews.filter((r) => r.platform === 'Android')];
			m.source.ios = 'live';
		} catch (e) {
			m.error = (e as Error).message;
		}
	}

	// Live usage from GA4 / Firebase
	const property = client.google.ga4PropertyId;
	if (property && googleReady() && !client.demo) {
		try {
			const appFilter = { filter: { fieldName: 'platform', inListFilter: { values: ['iOS', 'Android'] } } };
			const cur = { startDate: m.range.start, endDate: m.range.end };
			const prevEnd = new Date(m.range.start + 'T00:00:00Z');
			prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
			const prevStart = new Date(prevEnd);
			prevStart.setUTCDate(prevStart.getUTCDate() - (days - 1));
			const prev = { startDate: prevStart.toISOString().slice(0, 10), endDate: prevEnd.toISOString().slice(0, 10) };
			const [totals, prevTotals, daily, platforms, screens, versions] = await Promise.all([
				gaReport(property, { dateRanges: [cur], dimensionFilter: appFilter, metrics: ['activeUsers', 'newUsers', 'sessionsPerUser', 'averageSessionDuration', 'crashFreeUsersRate', 'active28DayUsers', 'dauPerMau'].map((name) => ({ name })) }),
				gaReport(property, { dateRanges: [prev], dimensionFilter: appFilter, metrics: [{ name: 'activeUsers' }, { name: 'newUsers' }] }),
				gaReport(property, { dateRanges: [cur], dimensionFilter: appFilter, dimensions: [{ name: 'date' }], metrics: [{ name: 'activeUsers' }], orderBys: [{ dimension: { dimensionName: 'date' } }] }),
				gaReport(property, { dateRanges: [cur], dimensionFilter: appFilter, dimensions: [{ name: 'platform' }], metrics: [{ name: 'activeUsers' }] }),
				gaReport(property, { dateRanges: [cur], dimensionFilter: appFilter, dimensions: [{ name: 'unifiedScreenName' }], metrics: [{ name: 'screenPageViews' }], limit: 8, orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }] }),
				gaReport(property, { dateRanges: [cur], dimensionFilter: appFilter, dimensions: [{ name: 'appVersion' }], metrics: [{ name: 'activeUsers' }], limit: 4, orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }] })
			]);
			const v = (j: any, i: number) => Number(j.rows?.[0]?.metricValues?.[i]?.value ?? 0);
			if (!totals.rows?.length) throw new Error('No app data in this GA4 property (is the Firebase app linked?)');
			m.active = { total: v(totals, 0), prev: v(prevTotals, 0) };
			m.newUsers = { total: v(totals, 1), prev: v(prevTotals, 1) };
			m.sessionsPerUser = +v(totals, 2).toFixed(1);
			m.avgSessionSec = Math.round(v(totals, 3));
			m.crashFree = +(v(totals, 4) * 100).toFixed(2);
			m.mau = v(totals, 5);
			m.stickiness = Math.round(v(totals, 6) * 100);
			m.dau = (daily.rows ?? []).map((r: any) => {
				const d = r.dimensionValues[0].value as string;
				return { date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, value: Number(r.metricValues[0].value) };
			});
			m.platforms = (platforms.rows ?? []).map((r: any) => ({ name: r.dimensionValues[0].value, users: Number(r.metricValues[0].value) }));
			m.screens = (screens.rows ?? []).map((r: any) => ({ name: r.dimensionValues[0].value, views: Number(r.metricValues[0].value) }));
			m.versions = (versions.rows ?? []).map((r: any) => ({ version: r.dimensionValues[0].value, users: Number(r.metricValues[0].value) }));
			m.source.usage = 'google';
		} catch (e) {
			m.source.usage = 'error';
			m.error = (e as Error).message;
		}
	}
	return m;
}

export function appTasks(a: AppMetrics): Draft[] {
	const out: Draft[] = [];
	if (a.crashFree < 99)
		out.push({
			level: a.crashFree < 98 ? 'bad' : 'warn',
			area: 'App',
			title: `${(100 - a.crashFree).toFixed(1)}% of users had a crash`,
			meaning: `Crash-free users: ${a.crashFree}%. Good apps stay above 99.5%. Crashes are the #1 reason for 1-star reviews.`,
			action: `Open Crashlytics, fix the top crash of version ${a.versions[0]?.version ?? 'latest'} and ship a hotfix.`
		});
	const w1 = a.retention.at(-2)?.weeks[1];
	if (w1 !== undefined && w1 < 25)
		out.push({
			level: 'warn',
			area: 'App',
			title: `Only ${w1}% come back after week 1`,
			meaning: 'Most new users try the app once and leave.',
			action: 'Improve onboarding and add a reminder notification on day 2 and day 6.'
		});
	const low = a.store.reviews.filter((r) => r.stars <= 2);
	if (low.length)
		out.push({
			level: 'warn',
			area: 'App',
			title: `${low.length} recent negative review${low.length > 1 ? 's' : ''}`,
			meaning: `"${low[0].title}" (${low[0].platform}, ${low[0].stars}★). Unanswered bad reviews scare new users away.`,
			action: 'Reply to each one within 48 h and mention the fix in the next release notes.'
		});
	const growth = a.active.prev ? Math.round(((a.active.total - a.active.prev) / a.active.prev) * 100) : 0;
	out.push({
		level: growth >= 0 ? 'good' : 'warn',
		area: 'App',
		title: `Active users ${growth >= 0 ? 'up' : 'down'} ${Math.abs(growth)}%`,
		meaning: `${a.active.total.toLocaleString('en')} people used the app in ${a.range.days} days. ${a.stickiness}% open it on a typical day.`,
		action: growth >= 0 ? 'Ask your happiest users for a store rating (in-app review prompt).' : 'Check which version or platform lost users and push a re-engagement notification.'
	});
	return out;
}
