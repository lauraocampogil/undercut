// "Why did this change?" — splits a change across channels, pages, countries and devices
// and says in one sentence where most of it comes from. Pure arithmetic, no language model.
import type { Client } from '#lib/types.ts';
import { demoMetrics } from './demo.ts';
import { gaSegments, gscSegments, googleReady, type Seg } from './google.ts';
import { demoTrend, getLeads, trackingSegments } from './leads.ts';
import { getHeatmap } from './tracking.ts';

export type Metric = 'visits' | 'leads' | 'clicks';
export type Dim = 'channel' | 'page' | 'country' | 'device';
export type WhyResult = {
	metric: Metric;
	label: string;
	cur: number;
	prev: number;
	delta: number;
	pct: number;
	source: 'google' | 'tracking' | 'demo';
	dims: { dim: Dim; label: string; items: (Seg & { delta: number; share: number })[] }[];
	sentence: string;
};

const DIM_LABEL: Record<Dim, string> = { channel: 'Channel', page: 'Landing page', country: 'Country', device: 'Device' };
const METRIC_LABEL: Record<Metric, string> = { visits: 'Visits', leads: 'Leads', clicks: 'Google clicks' };

function rng(seed: string) {
	let h = 2166136261;
	for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
	return () => ((h = Math.imul(h ^ (h >>> 15), 2246822519) ^ Math.imul(h ^ (h >>> 13), 3266489917)) >>> 0) / 4294967296;
}

/** Spread a total change over segments; the "culprit" segment carries most of it (demo only). */
function demoSegments(client: Client, metric: Metric, dim: Dim, cur: number, prev: number): Seg[] {
	const r = rng(client.id + metric + dim);
	const t = demoTrend(client);
	const keys: Record<Dim, string[]> = {
		channel: metric === 'clicks' ? ['brand searches', 'service + city', 'questions', 'other searches'] : ['Google Search', 'Google Maps', 'Direct', 'Social', 'Paid ads', 'Email'],
		page: ['/', '/services', '/contact', '/pricing', '/blog/guide-2026'],
		country: ['Belgium', 'France', 'Netherlands', 'Luxembourg'],
		device: ['Mobile', 'Desktop', 'Tablet']
	};
	const shares: Record<Dim, number[]> = {
		channel: metric === 'clicks' ? [0.4, 0.3, 0.2, 0.1] : [0.42, 0.18, 0.2, 0.09, 0.07, 0.04],
		page: [0.38, 0.24, 0.18, 0.12, 0.08],
		country: [0.8, 0.1, 0.07, 0.03],
		device: [0.64, 0.31, 0.05]
	};
	const culpritIdx: Record<Dim, number> = { channel: t.culprit === 'Google Maps' && metric !== 'clicks' ? 1 : 0, page: 1, country: 0, device: 0 };
	const delta = cur - prev;
	return keys[dim].map((key, i) => {
		const p = Math.round(prev * shares[dim][i] * (0.9 + r() * 0.2));
		const part = i === culpritIdx[dim] ? 0.72 : 0.28 / (keys[dim].length - 1);
		return { key, prev: p, cur: Math.max(0, Math.round(p + delta * part)) };
	});
}

async function segments(client: Client, metric: Metric, dim: Dim, days: number, cur: number, prev: number): Promise<{ segs: Seg[]; source: WhyResult['source'] }> {
	if (!client.demo) {
		try {
			if (metric === 'leads') return { segs: trackingSegments(client, 'leads', dim, days), source: 'tracking' };
			if (metric === 'visits' && client.google.ga4PropertyId && googleReady()) return { segs: await gaSegments(client.google.ga4PropertyId, 'sessions', dim, days), source: 'google' };
			if (metric === 'visits' && getHeatmap(client).installed) return { segs: trackingSegments(client, 'visits', dim, days), source: 'tracking' };
			if (metric === 'clicks' && client.google.gscSiteUrl && googleReady()) return { segs: await gscSegments(client.google.gscSiteUrl, dim, days), source: 'google' };
		} catch {
			/* fall back to demo */
		}
	}
	return { segs: demoSegments(client, metric, dim, cur, prev), source: 'demo' };
}

export async function explain(client: Client, metric: Metric, days = 28): Promise<WhyResult> {
	let cur = 0,
		prev = 0;
	if (metric === 'leads') {
		const l = getLeads(client, days);
		cur = l.totals.leads;
		prev = l.totals.prev;
	} else {
		const m = demoMetrics(client, days);
		cur = metric === 'visits' ? m.visits.total : m.search.clicks;
		prev = metric === 'visits' ? m.visits.prev : m.search.prevClicks;
	}
	const dims: WhyResult['dims'] = [];
	let source: WhyResult['source'] = 'demo';
	for (const dim of ['channel', 'page', 'device', 'country'] as Dim[]) {
		const s = await segments(client, metric, dim, days, cur, prev);
		source = s.source;
		if (s.source !== 'demo' && dim === 'channel') {
			cur = s.segs.reduce((a, x) => a + x.cur, 0);
			prev = s.segs.reduce((a, x) => a + x.prev, 0);
		}
		const delta = cur - prev;
		const items = s.segs
			.map((x) => ({ ...x, delta: x.cur - x.prev, share: delta ? (x.cur - x.prev) / delta : 0 }))
			.filter((x) => x.cur || x.prev)
			.sort((a, b) => (delta >= 0 ? b.delta - a.delta : a.delta - b.delta))
			.slice(0, 5);
		dims.push({ dim, label: DIM_LABEL[dim], items });
	}
	const delta = cur - prev;
	const pct = prev ? Math.round((delta / prev) * 100) : 0;
	const top = (d: Dim) => dims.find((x) => x.dim === d)?.items[0];
	const ch = top('channel'),
		pg = top('page'),
		dv = top('device');
	const word = delta >= 0 ? 'growth' : 'drop';
	const sentence =
		Math.abs(pct) < 3 || !ch
			? `${METRIC_LABEL[metric]} are stable (${pct >= 0 ? '+' : ''}${pct}%). No single channel, page or device stands out.`
			: `${METRIC_LABEL[metric]} ${delta >= 0 ? 'up' : 'down'} ${Math.abs(pct)}% (${delta >= 0 ? '+' : ''}${delta}). ${Math.round(Math.min(1, Math.abs(ch.share)) * 100)}% of the ${word} comes from ${metric === 'clicks' ? `“${ch.key}”` : ch.key} (${ch.delta >= 0 ? '+' : ''}${ch.delta})${pg && Math.abs(pg.share) > 0.4 ? `, mostly on ${pg.key}` : ''}${dv && Math.abs(dv.share) > 0.6 ? `, on ${dv.key.toLowerCase()}` : ''}.`;
	return { metric, label: METRIC_LABEL[metric], cur, prev, delta, pct, source, dims, sentence };
}
