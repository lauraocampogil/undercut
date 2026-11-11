// Deterministic demo data so every client looks realistic before Google is connected.
import type { Client, Metrics, Point } from '#lib/types.ts';

function rng(seedStr: string) {
	let h = 2166136261;
	for (const ch of seedStr) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
	return () => {
		h += 0x6d2b79f5;
		let t = h;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function dateRange(days: number) {
	const end = new Date();
	end.setUTCDate(end.getUTCDate() - 1);
	const start = new Date(end);
	start.setUTCDate(start.getUTCDate() - (days - 1));
	const iso = (d: Date) => d.toISOString().slice(0, 10);
	return { start: iso(start), end: iso(end), days };
}

const PAGES: Record<string, string[]> = {
	default: ['/', '/services', '/contact', '/about', '/blog/guide-2026', '/pricing', '/faq']
};

const QUERIES = [
	'{brand}',
	'{brand} bruxelles',
	'{niche} bruxelles',
	'{niche} près de moi',
	'meilleur {niche} ixelles',
	'{niche} prix',
	'{brand} horaires',
	'{niche} avis'
];

function niche(name: string) {
	const n = name.toLowerCase();
	if (n.includes('boulang')) return 'boulangerie';
	if (n.includes('archi')) return 'architecte';
	if (n.includes('kin')) return 'kiné';
	if (n.includes('vélo') || n.includes('velo')) return 'magasin vélo';
	return 'agence';
}

export function demoMetrics(client: Client, days = 28): Metrics {
	const r = rng(client.id + days);
	const range = dateRange(days);
	const base = 80 + Math.floor(r() * 400);
	const trend = (r() - 0.35) * 0.9; // mostly growing
	const daily: Point[] = [];
	const d0 = new Date(range.start + 'T00:00:00Z');
	for (let i = 0; i < days; i++) {
		const d = new Date(d0);
		d.setUTCDate(d0.getUTCDate() + i);
		const weekday = d.getUTCDay();
		const weekend = weekday === 0 || weekday === 6 ? 0.72 : 1;
		const v = base * (1 + (trend * i) / days) * weekend * (0.85 + r() * 0.3);
		daily.push({ date: d.toISOString().slice(0, 10), value: Math.round(v) });
	}
	const total = daily.reduce((s, p) => s + p.value, 0);
	const prev = Math.round(total / (1 + trend * 0.6 + (r() - 0.5) * 0.1));
	const users = Math.round(total * (0.68 + r() * 0.1));

	const organicShare = 0.3 + r() * 0.3;
	const channels = [
		{ name: 'Google Search', visits: Math.round(total * organicShare) },
		{ name: 'Direct', visits: Math.round(total * (0.2 + r() * 0.1)) },
		{ name: 'Social', visits: Math.round(total * (0.08 + r() * 0.12)) },
		{ name: 'Google Maps', visits: Math.round(total * (0.05 + r() * 0.1)) },
		{ name: 'Other sites', visits: Math.round(total * (0.03 + r() * 0.06)) }
	].sort((a, b) => b.visits - a.visits);

	const pages = PAGES.default
		.map((path, i) => ({
			path,
			views: Math.round((total * 1.6) / (i + 1.4) * (0.8 + r() * 0.4)),
			change: Math.round((r() - 0.4) * 60)
		}))
		.sort((a, b) => b.views - a.views);

	const brand = client.name.split(' ')[0].toLowerCase();
	const nic = niche(client.name);
	const clicks = Math.round(total * organicShare * 0.9);
	const queries = QUERIES.map((q, i) => {
		const impressions = Math.round((clicks * 6) / (i + 1.2) * (0.6 + r() * 0.8));
		const position = +(i < 2 ? 1 + r() * 1.5 : 4 + r() * 14).toFixed(1);
		const ctr = position < 3 ? 0.25 : position < 8 ? 0.06 : 0.012;
		return {
			query: q.replace('{brand}', brand).replace('{niche}', nic),
			impressions,
			clicks: Math.round(impressions * ctr),
			position
		};
	})
		.filter((q, i, all) => all.findIndex((x) => x.query === q.query) === i)
		.sort((a, b) => b.clicks - a.clicks);
	const position = +(6 + r() * 10).toFixed(1);

	const mapsBase = Math.round(base * (2 + r() * 3));
	return {
		range,
		sources: { ga4: 'demo', gsc: 'demo', gbp: 'demo', gtm: 'demo' },
		visits: { total, prev, daily },
		users: { total: users, prev: Math.round(users / (total / prev)) },
		engagementSec: { value: Math.round(35 + r() * 80), prev: Math.round(35 + r() * 80) },
		conversions: { total: Math.round(total * (0.01 + r() * 0.03)), prev: Math.round(prev * 0.02) },
		channels,
		topPages: pages.slice(0, 6),
		search: {
			clicks,
			prevClicks: Math.round(clicks / (1 + trend * 0.5)),
			impressions: queries.reduce((s, q) => s + q.impressions, 0) * 3,
			position,
			prevPosition: +(position + (r() - 0.6) * 3).toFixed(1),
			queries
		},
		maps: {
			views: mapsBase * 4,
			calls: Math.round(mapsBase * 0.06),
			directions: Math.round(mapsBase * 0.1),
			websiteClicks: Math.round(mapsBase * 0.12),
			prevTotal: Math.round(mapsBase * 0.28 / (1 + trend * 0.4))
		},
		tags: {
			container: 'GTM-' + client.id.slice(0, 6).toUpperCase(),
			googleTagFound: r() > 0.25,
			tagCount: 2 + Math.floor(r() * 7)
		},
		errors: []
	};
}

// ---- Search Console detail (demo) ----
import type { SearchConsoleDetail, GscRow } from '#lib/types.ts';

export function demoSearchConsole(client: Client, days = 28): SearchConsoleDetail {
	const m = demoMetrics(client, days);
	const r = rng(client.id + 'gsc' + days);
	const nic = m.search.queries[2]?.query.split(' ')[0] ?? 'service';
	const extra = ['horaires', 'adresse', 'contact', 'ouvert dimanche', 'tarifs', 'rendez-vous', 'parking', 'livraison', 'avis google', 'bruxelles centre', 'etterbeek', 'uccle'];
	const row = (key: string, base: number, pos: number): GscRow => {
		const impressions = Math.round(base * (0.6 + r() * 0.8));
		const ctr = pos < 3 ? 0.18 + r() * 0.12 : pos < 8 ? 0.03 + r() * 0.05 : pos < 15 ? 0.005 + r() * 0.012 : 0.002;
		const clicks = Math.round(impressions * ctr);
		return { key, impressions, clicks, ctr: clicks / Math.max(1, impressions), position: +pos.toFixed(1), prevClicks: Math.round(clicks * (0.7 + r() * 0.6)) };
	};
	const queries = [
		...m.search.queries.map((q) => ({ key: q.query, clicks: q.clicks, impressions: q.impressions, ctr: q.clicks / Math.max(1, q.impressions), position: q.position, prevClicks: Math.round(q.clicks * (0.7 + r() * 0.6)) })),
		...extra.map((e, i) => row(`${nic} ${e}`, 900 / (i + 2), 3 + r() * 22))
	]
		.filter((q, i, all) => all.findIndex((x) => x.key === q.key) === i)
		.sort((a, b) => b.clicks - a.clicks);
	const pages = m.topPages.map((p, i) => row(p.path, 4000 / (i + 1), 2 + r() * 14)).sort((a, b) => b.clicks - a.clicks);
	const countries = [['Belgium', 0.78], ['France', 0.1], ['Netherlands', 0.06], ['Luxembourg', 0.03], ['Spain', 0.03]].map(([k, s]) => row(String(k), m.search.impressions * Number(s), 4 + r() * 10));
	const devices = [['Mobile', 0.64], ['Desktop', 0.31], ['Tablet', 0.05]].map(([k, s]) => row(String(k), m.search.impressions * Number(s), 5 + r() * 8));
	const daily = m.visits.daily.map((d) => {
		const clicks = Math.round(d.value * 0.4 * (0.85 + r() * 0.3));
		return { date: d.date, clicks, impressions: Math.round(clicks * (28 + r() * 10)) };
	});
	const clicks = daily.reduce((s, d) => s + d.clicks, 0);
	const impressions = daily.reduce((s, d) => s + d.impressions, 0);
	return {
		source: 'demo',
		range: m.range,
		totals: {
			clicks,
			impressions,
			ctr: clicks / Math.max(1, impressions),
			position: m.search.position,
			prevClicks: Math.round(clicks / (1 + (r() - 0.35) * 0.4)),
			prevImpressions: Math.round(impressions / (1 + (r() - 0.35) * 0.4)),
			prevPosition: m.search.prevPosition
		},
		daily,
		queries,
		pages,
		countries,
		devices
	};
}
