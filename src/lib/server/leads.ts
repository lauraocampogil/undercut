// Leads: what actually pays. Detected automatically by the snippet (no events to configure):
// form sent, phone tap, email click, WhatsApp — each credited to the channel and landing page of the visit.
import type { Client, Point } from '#lib/types.ts';
import { readEvents, type LeadKind, type TrackEvent } from './tracking.ts';
import { dateRange } from './demo.ts';

export const CHANNELS = ['Google Search', 'Google Maps', 'Paid ads', 'Social', 'Email', 'Other search', 'Other sites', 'Direct'] as const;
export type Channel = (typeof CHANNELS)[number];

export function channelOf(src = '', med = ''): Channel {
	const s = src.toLowerCase(),
		m = med.toLowerCase();
	if (/cpc|ppc|paid|ads|display/.test(m)) return 'Paid ads';
	if (/mail/.test(m) || /mail|newsletter|mailchimp|brevo/.test(s)) return 'Email';
	if (/maps\.google|gmb|google_business|business\.google|local/.test(s + m)) return 'Google Maps';
	if (/(^|\.)google\./.test(s) || s === 'google') return 'Google Search';
	if (/bing|duckduckgo|yahoo|ecosia|qwant|brave|yandex/.test(s)) return 'Other search';
	if (/facebook|instagram|linkedin|lnkd|t\.co|twitter|x\.com|tiktok|reddit|pinterest|youtube|threads|social/.test(s + m)) return 'Social';
	if (!s || m === 'none') return 'Direct';
	return 'Other sites';
}

export type LeadsReport = {
	source: 'live' | 'demo' | 'waiting';
	range: { start: string; end: string; days: number };
	totals: { leads: number; prev: number; visits: number; prevVisits: number };
	byKind: { kind: LeadKind; n: number; prev: number }[];
	byChannel: { channel: Channel; visits: number; leads: number; prevLeads: number }[];
	byLanding: { path: string; entries: number; leads: number }[];
	outbound: { label: string; n: number }[];
	downloads: { label: string; n: number }[];
	daily: Point[];
	recent: { kind: LeadKind; channel: Channel; landing: string; page: string; device: string; ts: number }[];
};

const KINDS: LeadKind[] = ['form', 'phone', 'email', 'whatsapp'];

function aggregate(events: TrackEvent[], days: number): Omit<LeadsReport, 'source'> {
	const range = dateRange(days);
	const startTs = Date.parse(range.start + 'T00:00:00Z');
	const cur = events.filter((e) => e.ts >= startTs);
	const prev = events.filter((e) => e.ts < startTs);
	const leads = (list: TrackEvent[]) => list.filter((e) => e.t === 'l') as Extract<TrackEvent, { t: 'l' }>[];
	const entries = (list: TrackEvent[]) => list.filter((e) => e.t === 'pv' && e.ent) as Extract<TrackEvent, { t: 'pv' }>[];
	const ch = (e: { src?: string; med?: string }) => channelOf(e.src, e.med);

	const byChannel = CHANNELS.map((channel) => ({
		channel,
		visits: entries(cur).filter((e) => ch(e) === channel).length,
		leads: leads(cur).filter((e) => ch(e) === channel).length,
		prevLeads: leads(prev).filter((e) => ch(e) === channel).length
	}))
		.filter((c) => c.visits || c.leads || c.prevLeads)
		.sort((a, b) => b.leads - a.leads || b.visits - a.visits);

	const land = new Map<string, { path: string; entries: number; leads: number }>();
	for (const e of entries(cur)) {
		const r = land.get(e.p) ?? { path: e.p, entries: 0, leads: 0 };
		r.entries++;
		land.set(e.p, r);
	}
	for (const e of leads(cur)) {
		const key = e.land ?? e.p;
		const r = land.get(key) ?? { path: key, entries: 0, leads: 0 };
		r.leads++;
		land.set(key, r);
	}
	const count = (list: { label: string }[]) => {
		const m = new Map<string, number>();
		for (const x of list) m.set(x.label, (m.get(x.label) ?? 0) + 1);
		return [...m].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n).slice(0, 8);
	};
	const outs = cur.filter((e) => e.t === 'o') as Extract<TrackEvent, { t: 'o' }>[];
	const daily: Point[] = [];
	const d0 = new Date(range.start + 'T00:00:00Z');
	for (let i = 0; i < days; i++) {
		const d = new Date(d0);
		d.setUTCDate(d0.getUTCDate() + i);
		const iso = d.toISOString().slice(0, 10);
		daily.push({ date: iso, value: leads(cur).filter((e) => new Date(e.ts).toISOString().slice(0, 10) === iso).length });
	}
	return {
		range,
		totals: { leads: leads(cur).length, prev: leads(prev).length, visits: entries(cur).length, prevVisits: entries(prev).length },
		byKind: KINDS.map((kind) => ({ kind, n: leads(cur).filter((e) => e.kind === kind).length, prev: leads(prev).filter((e) => e.kind === kind).length })),
		byChannel,
		byLanding: [...land.values()].sort((a, b) => b.leads - a.leads || b.entries - a.entries).slice(0, 10),
		outbound: count(outs.filter((o) => o.kind === 'out')),
		downloads: count(outs.filter((o) => o.kind === 'download')),
		daily,
		recent: leads(cur)
			.slice(-10)
			.reverse()
			.map((e) => ({ kind: e.kind, channel: ch(e), landing: e.land ?? e.p, page: e.p, device: e.d, ts: e.ts }))
	};
}

// ---------- demo ----------
function rng(seed: string) {
	let h = 2166136261;
	for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
	return () => ((h = Math.imul(h ^ (h >>> 15), 2246822519) ^ Math.imul(h ^ (h >>> 13), 3266489917)) >>> 0) / 4294967296;
}

/** Trend per example client so the demo tells a story (one client loses leads from Google Maps, etc.). */
export function demoTrend(client: Client) {
	let h = 0;
	for (const c of client.id) h = (h * 31 + c.charCodeAt(0)) % 997;
	const story = h % 4; // 0 growing, 1 maps drop, 2 stable, 3 search drop
	return { story, factor: story === 0 ? 1.28 : story === 1 ? 0.62 : story === 2 ? 1.03 : 0.7, culprit: story === 1 ? 'Google Maps' : story === 3 ? 'Google Search' : null };
}

function demoLeads(client: Client, days: number): LeadsReport {
	const r = rng(client.id + 'leads' + days);
	const range = dateRange(days);
	const t = demoTrend(client);
	const scale = days / 28;
	const base: Record<Channel, [number, number]> = {
		'Google Search': [1600, 26],
		'Google Maps': [420, 14],
		'Paid ads': [300, 6],
		Social: [380, 3],
		Email: [90, 4],
		'Other search': [70, 1],
		'Other sites': [160, 2],
		Direct: [900, 9]
	};
	const byChannel = CHANNELS.map((channel) => {
		const [v, l] = base[channel];
		const prevLeads = Math.round(l * scale * (0.8 + r() * 0.4));
		const culprit = t.culprit === channel;
		const leads = Math.round(prevLeads * (culprit ? 0.25 : t.story === 0 ? 1.25 + r() * 0.2 : 0.92 + r() * 0.2));
		return { channel, visits: Math.round(v * scale * (0.8 + r() * 0.4) * (culprit ? 0.55 : 1)), leads, prevLeads };
	}).sort((a, b) => b.leads - a.leads);
	const total = byChannel.reduce((s, c) => s + c.leads, 0);
	const prevTotal = byChannel.reduce((s, c) => s + c.prevLeads, 0);
	const kinds: [LeadKind, number][] = [
		['form', 0.46],
		['phone', 0.34],
		['email', 0.12],
		['whatsapp', 0.08]
	];
	const daily: Point[] = [];
	const d0 = new Date(range.start + 'T00:00:00Z');
	let left = total;
	for (let i = 0; i < days; i++) {
		const d = new Date(d0);
		d.setUTCDate(d0.getUTCDate() + i);
		const v = i === days - 1 ? left : Math.max(0, Math.round((total / days) * (0.4 + r() * 1.2) * (t.factor < 1 ? 1.4 - (i / days) * 0.8 : 1)));
		left = Math.max(0, left - v);
		daily.push({ date: d.toISOString().slice(0, 10), value: v });
	}
	const pages = ['/', '/services', '/contact', '/pricing', '/blog/guide-2026', '/faq'];
	return {
		source: 'demo',
		range,
		totals: { leads: total, prev: prevTotal, visits: byChannel.reduce((s, c) => s + c.visits, 0), prevVisits: Math.round(byChannel.reduce((s, c) => s + c.visits, 0) / (t.factor < 1 ? 0.8 : 1.05)) },
		byKind: kinds.map(([kind, share]) => ({ kind, n: Math.round(total * share), prev: Math.round(prevTotal * share) })),
		byChannel,
		byLanding: pages.map((path, i) => ({ path, entries: Math.round((2400 * scale) / (i + 1.3)), leads: Math.round((total * [0.32, 0.27, 0.2, 0.11, 0.06, 0.04][i])) })),
		outbound: [
			{ label: 'instagram.com', n: Math.round(40 * scale) },
			{ label: 'google.com/maps', n: Math.round(31 * scale) },
			{ label: 'facebook.com', n: Math.round(12 * scale) }
		],
		downloads: [
			{ label: 'tarifs-2026.pdf', n: Math.round(23 * scale) },
			{ label: 'menu.pdf', n: Math.round(9 * scale) }
		],
		daily,
		recent: Array.from({ length: 6 }, (_, i) => ({
			kind: kinds[i % 4][0],
			channel: byChannel[i % 3].channel,
			landing: pages[i % 3],
			page: i % 2 ? '/contact' : pages[i % 3],
			device: i % 3 ? 'mobile' : 'desktop',
			ts: Date.now() - (i + 1) * 3.7 * 3600_000
		}))
	};
}

export function getLeads(client: Client, days = 28): LeadsReport {
	if (client.demo) return demoLeads(client, days);
	const events = readEvents(client.id, days * 2);
	const rep = aggregate(events, days);
	return { source: events.length ? 'live' : 'waiting', ...rep };
}

/** Segments for "why did this change?" from the snippet data (leads or visits). */
export function trackingSegments(client: Client, metric: 'leads' | 'visits', dim: 'channel' | 'page' | 'country' | 'device', days: number) {
	const events = readEvents(client.id, days * 2);
	const startTs = Date.parse(dateRange(days).start + 'T00:00:00Z');
	const pick = (e: TrackEvent) => (metric === 'leads' ? e.t === 'l' : e.t === 'pv' && (e as { ent?: boolean }).ent);
	const keyOf = (e: TrackEvent & { src?: string; med?: string; land?: string; cc?: string }) =>
		dim === 'channel' ? channelOf(e.src, e.med) : dim === 'page' ? (e.land ?? e.p) : dim === 'country' ? e.cc || 'Unknown' : e.d === 'mobile' ? 'Mobile' : 'Desktop';
	const m = new Map<string, { key: string; cur: number; prev: number }>();
	for (const e of events.filter(pick)) {
		const k = keyOf(e as never);
		const r = m.get(k) ?? { key: k, cur: 0, prev: 0 };
		e.ts >= startTs ? r.cur++ : r.prev++;
		m.set(k, r);
	}
	return [...m.values()];
}

import type { Draft } from './insights.ts';
export function leadsTasks(r: LeadsReport): Draft[] {
	const out: Draft[] = [];
	if (r.source === 'waiting') {
		out.push({ level: 'warn', area: 'Leads', title: 'Leads are not tracked yet', meaning: 'Install the Undercut snippet: forms, calls, emails and WhatsApp clicks are then counted automatically, per channel.', action: 'Copy the snippet from Setup and paste it on the site (or in Tag Manager).' });
		return out;
	}
	const pct = r.totals.prev ? Math.round(((r.totals.leads - r.totals.prev) / r.totals.prev) * 100) : 0;
	const worst = [...r.byChannel].sort((a, b) => a.leads - a.prevLeads - (b.leads - b.prevLeads))[0];
	if (pct <= -25 && r.totals.prev >= 5)
		out.push({ level: 'bad', area: 'Leads', title: `Leads down ${Math.abs(pct)}%`, meaning: `${r.totals.leads} leads vs ${r.totals.prev} before. Biggest loss: ${worst.channel} (${worst.leads - worst.prevLeads}).`, action: worst.channel === 'Google Maps' ? 'Check the Google Business profile: hours, phone number, recent photos and reviews.' : worst.channel === 'Google Search' ? 'Check which pages lost Google clicks (Search & Maps) and fix their titles.' : `Check what changed on ${worst.channel} (posts, ads, campaigns).` });
	else if (pct >= 15)
		out.push({ level: 'good', area: 'Leads', title: `Leads up ${pct}%`, meaning: `${r.totals.leads} leads (forms, calls, emails, WhatsApp). Best channel: ${r.byChannel[0]?.channel}.`, action: `Put more effort on ${r.byChannel[0]?.channel}.` });
	const leak = r.byLanding.find((l) => l.entries >= 40 && l.leads === 0);
	if (leak) out.push({ level: 'warn', area: 'Leads', title: `${leak.path} brings visits but no leads`, meaning: `${leak.entries} visits started on this page and none became a contact.`, action: 'Add a clear call / quote button and the phone number in the first screen of this page.' });
	return out;
}
