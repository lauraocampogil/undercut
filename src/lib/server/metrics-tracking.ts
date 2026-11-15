// Real numbers for a real client, from the Undercut snippet alone (no Google needed):
// visits (sessions), visitors, time on site, leads, channels, top pages, daily curve.
// Google sources (GA4, Search Console, Maps, Tag Manager) overwrite their part when connected.
import type { Client, Metrics } from '#lib/types.ts';
import { readEvents, type TrackEvent } from './tracking.ts';
import { channelOf } from './leads.ts';
import { dateRange } from './demo.ts';

export function emptyMetrics(days: number): Metrics {
	return {
		range: dateRange(days),
		sources: { ga4: 'off', gsc: 'off', gbp: 'off', gtm: 'off' },
		visits: { total: 0, prev: 0, daily: [] },
		users: { total: 0, prev: 0 },
		engagementSec: { value: 0, prev: 0 },
		conversions: { total: 0, prev: 0 },
		channels: [],
		topPages: [],
		search: { clicks: 0, prevClicks: 0, impressions: 0, position: 0, prevPosition: 0, queries: [] },
		maps: null,
		tags: null,
		errors: []
	};
}

type Ev = TrackEvent & { sid?: string; src?: string; med?: string; ent?: boolean };

export function trackingMetrics(client: Client, days: number): Metrics {
	const m = emptyMetrics(days);
	const events = readEvents(client.id, days * 2 + 1) as Ev[];
	if (!events.some((e) => e.t === 'pv')) return m;
	// Snippet data is live: the period runs up to today (Google data stops at yesterday).
	const today = new Date().toISOString().slice(0, 10);
	const startTs = Date.parse(today + 'T00:00:00Z') - (days - 1) * 864e5;
	const endTs = Date.parse(today + 'T23:59:59Z');
	m.range = { start: new Date(startTs).toISOString().slice(0, 10), end: today, days };
	const prevStartTs = startTs - days * 864e5;
	const cur = events.filter((e) => e.ts >= startTs && e.ts <= endTs);
	const prev = events.filter((e) => e.ts >= prevStartTs && e.ts < startTs);

	const sessions = (list: Ev[]) => list.filter((e) => e.t === 'pv' && e.ent);
	const visitors = (list: Ev[]) => new Set(sessions(list).map((e) => e.sid ?? String(e.ts))).size;
	const leads = (list: Ev[]) => list.filter((e) => e.t === 'l').length;
	const engagement = (list: Ev[]) => {
		const span = new Map<string, [number, number]>();
		for (const e of list) {
			if (!e.sid) continue;
			const s = span.get(e.sid);
			span.set(e.sid, s ? [Math.min(s[0], e.ts), Math.max(s[1], e.ts)] : [e.ts, e.ts]);
		}
		const secs = [...span.values()].map(([a, b]) => Math.min(1800, (b - a) / 1000));
		return secs.length ? Math.round(secs.reduce((a, b) => a + b, 0) / secs.length) : 0;
	};

	m.visits.total = sessions(cur).length;
	m.visits.prev = sessions(prev).length;
	m.users = { total: visitors(cur), prev: visitors(prev) };
	m.engagementSec = { value: engagement(cur), prev: engagement(prev) };
	m.conversions = { total: leads(cur), prev: leads(prev) };

	const daily = new Map<string, number>();
	for (let t = startTs; t <= endTs; t += 864e5) daily.set(new Date(t).toISOString().slice(0, 10), 0);
	for (const e of sessions(cur)) {
		const d = new Date(e.ts).toISOString().slice(0, 10);
		if (daily.has(d)) daily.set(d, daily.get(d)! + 1);
	}
	m.visits.daily = [...daily].map(([date, value]) => ({ date, value }));

	const ch = new Map<string, number>();
	for (const e of sessions(cur)) {
		const c = channelOf(e.src, e.med);
		ch.set(c, (ch.get(c) ?? 0) + 1);
	}
	m.channels = [...ch].map(([name, visits]) => ({ name, visits })).sort((a, b) => b.visits - a.visits);

	const views = (list: Ev[]) => {
		const v = new Map<string, number>();
		for (const e of list) if (e.t === 'pv') v.set(e.p, (v.get(e.p) ?? 0) + 1);
		return v;
	};
	const vc = views(cur),
		vp = views(prev);
	m.topPages = [...vc]
		.map(([path, n]) => ({ path, views: n, change: vp.get(path) ? Math.round(((n - vp.get(path)!) / vp.get(path)!) * 100) : 0 }))
		.sort((a, b) => b.views - a.views)
		.slice(0, 6);
	m.sources.ga4 = 'tracking';
	return m;
}
