// Campaigns — for communication agencies: "did the campaign bring calls, forms and WhatsApps?"
// 1. The agency creates a campaign → Undercut builds the tracked link (UTM).
// 2. The snippet stores utm_campaign on every visit and lead (no setup on the site).
// 3. Per campaign: visits, leads by kind, cost per lead, best posts (utm_content), daily curve.
//    GA4 (sessionCampaignName) is used as a fallback when the snippet is not installed.
import type { Client } from '#lib/types.ts';
import { readData, writeData } from '#lib/server/store.ts';
import { readEvents, type TrackEvent } from '#lib/server/tracking.ts';
import { gaReport, googleReady } from '#lib/server/google.ts';

export const CHANNELS = {
	instagram: { label: 'Instagram', source: 'instagram', medium: 'social', icon: '📸' },
	facebook: { label: 'Facebook', source: 'facebook', medium: 'social', icon: '👥' },
	linkedin: { label: 'LinkedIn', source: 'linkedin', medium: 'social', icon: '💼' },
	tiktok: { label: 'TikTok', source: 'tiktok', medium: 'social', icon: '🎵' },
	'meta-ads': { label: 'Meta Ads', source: 'facebook', medium: 'cpc', icon: '🎯' },
	'google-ads': { label: 'Google Ads', source: 'google', medium: 'cpc', icon: '🔎' },
	newsletter: { label: 'Newsletter', source: 'newsletter', medium: 'email', icon: '✉️' },
	print: { label: 'Print / QR', source: 'print', medium: 'qr', icon: '🖨️' },
	partner: { label: 'Partner / PR', source: 'partner', medium: 'referral', icon: '🤝' },
	other: { label: 'Other', source: 'other', medium: 'campaign', icon: '✦' }
} as const;
export type ChannelId = keyof typeof CHANNELS;

export type Campaign = {
	id: string;
	name: string;
	slug: string; // utm_campaign
	channel: ChannelId;
	url: string; // landing page
	start: string; // YYYY-MM-DD
	end?: string;
	budget?: number; // €
	goal?: number; // leads
	posts?: string[]; // utm_content variants (one per post / ad / visual)
	createdAt: string;
};

export type CampaignStats = {
	source: 'tracking' | 'ga4' | 'demo' | 'waiting';
	visits: number;
	leads: number;
	byKind: Record<'form' | 'phone' | 'email' | 'whatsapp', number>;
	daily: { date: string; visits: number; leads: number }[];
	posts: { key: string; visits: number; leads: number }[];
	pages: { key: string; visits: number; leads: number }[];
	conversion: number; // % of visits that became a lead
	cpl: number | null; // cost per lead
	status: 'scheduled' | 'live' | 'ended';
};

const file = (id: string) => `campaigns-${id}.json`;
const today = () => new Date().toISOString().slice(0, 10);
export const slugify = (s: string) =>
	s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 50) || 'campaign';

function hash(s: string) {
	let h = 0;
	for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
	return h;
}
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

function demoCampaigns(client: Client): Campaign[] {
	const url = client.domain || 'https://example.be';
	return [
		{ id: 'demo-1', name: 'Spring offer', slug: 'spring-offer', channel: 'instagram', url, start: daysAgo(20), budget: 400, goal: 25, posts: ['reel-1', 'story-promo', 'carousel'], createdAt: daysAgo(22) },
		{ id: 'demo-2', name: 'Newsletter — April', slug: 'newsletter-april', channel: 'newsletter', url, start: daysAgo(12), end: daysAgo(5), posts: ['header-button', 'footer-link'], createdAt: daysAgo(13) },
		{ id: 'demo-3', name: 'Local search ads', slug: 'local-search-ads', channel: 'google-ads', url, start: daysAgo(40), budget: 900, goal: 40, createdAt: daysAgo(41) }
	];
}

export function listCampaigns(client: Client): Campaign[] {
	return readData<Campaign[] | null>(file(client.id), null) ?? (client.demo ? demoCampaigns(client) : []);
}
function save(client: Client, list: Campaign[]) {
	writeData(file(client.id), list);
}
export function upsertCampaign(client: Client, c: Omit<Campaign, 'id' | 'createdAt' | 'slug'> & { id?: string; slug?: string }) {
	const list = listCampaigns(client);
	const existing = c.id ? list.find((x) => x.id === c.id) : undefined;
	let slug = c.slug ? slugify(c.slug) : existing?.slug ?? slugify(c.name);
	while (list.some((x) => x.slug === slug && x.id !== existing?.id)) slug += '-2';
	const { id: _id, ...fields } = c;
	const next: Campaign = { ...(existing ?? { id: crypto.randomUUID().slice(0, 8), createdAt: today() }), ...fields, slug } as Campaign;
	save(client, existing ? list.map((x) => (x.id === next.id ? next : x)) : [next, ...list]);
	return next;
}
export function deleteCampaign(client: Client, id: string) {
	save(client, listCampaigns(client).filter((x) => x.id !== id));
}

/** The tracked link to put in the post, ad, email or QR code. */
export function trackedLink(c: Campaign, post?: string) {
	const ch = CHANNELS[c.channel];
	let u: URL;
	try {
		u = new URL(c.url);
	} catch {
		u = new URL('https://example.be');
	}
	u.searchParams.set('utm_source', ch.source);
	u.searchParams.set('utm_medium', ch.medium);
	u.searchParams.set('utm_campaign', c.slug);
	if (post) u.searchParams.set('utm_content', slugify(post));
	return u.toString();
}

function statusOf(c: Campaign): CampaignStats['status'] {
	const t = today();
	if (c.start > t) return 'scheduled';
	if (c.end && c.end < t) return 'ended';
	return 'live';
}

function emptyStats(c: Campaign, source: CampaignStats['source']): CampaignStats {
	return { source, visits: 0, leads: 0, byKind: { form: 0, phone: 0, email: 0, whatsapp: 0 }, daily: [], posts: [], pages: [], conversion: 0, cpl: null, status: statusOf(c) };
}

function fromEvents(c: Campaign, events: TrackEvent[]): CampaignStats {
	const s = emptyStats(c, 'tracking');
	const end = c.end ?? today();
	const daily = new Map<string, { visits: number; leads: number }>();
	for (let d = new Date(c.start); d.toISOString().slice(0, 10) <= end && daily.size < 120; d = new Date(d.getTime() + 864e5)) daily.set(d.toISOString().slice(0, 10), { visits: 0, leads: 0 });
	const posts = new Map<string, { key: string; visits: number; leads: number }>();
	const pages = new Map<string, { key: string; visits: number; leads: number }>();
	const bump = (m: Map<string, { key: string; visits: number; leads: number }>, key: string, f: 'visits' | 'leads') => {
		const v = m.get(key) ?? { key, visits: 0, leads: 0 };
		v[f]++;
		m.set(key, v);
	};
	for (const e of events) {
		if (!('camp' in e) || e.camp !== c.slug) continue;
		const d = new Date(e.ts).toISOString().slice(0, 10);
		const content = e.cont || '(no post tag)';
		if (e.t === 'pv' && e.ent) {
			s.visits++;
			daily.get(d) && daily.get(d)!.visits++;
			bump(posts, content, 'visits');
			bump(pages, e.land ?? e.p, 'visits');
		} else if (e.t === 'l') {
			s.leads++;
			s.byKind[e.kind]++;
			daily.get(d) && daily.get(d)!.leads++;
			bump(posts, content, 'leads');
			bump(pages, e.land ?? e.p, 'leads');
		}
	}
	s.daily = [...daily].map(([date, v]) => ({ date, ...v }));
	s.posts = [...posts.values()].sort((a, b) => b.leads - a.leads || b.visits - a.visits);
	s.pages = [...pages.values()].sort((a, b) => b.leads - a.leads || b.visits - a.visits).slice(0, 5);
	return finish(c, s);
}

function finish(c: Campaign, s: CampaignStats) {
	s.conversion = s.visits ? +((s.leads / s.visits) * 100).toFixed(1) : 0;
	s.cpl = c.budget && s.leads ? Math.round((c.budget / s.leads) * 100) / 100 : null;
	return s;
}

function demoStats(c: Campaign): CampaignStats {
	const s = emptyStats(c, 'demo');
	const h = hash(c.slug);
	const end = c.end && c.end < today() ? c.end : today();
	const n = Math.max(1, Math.round((new Date(end).getTime() - new Date(c.start).getTime()) / 864e5) + 1);
	const rate = 0.025 + (h % 30) / 1000;
	for (let i = 0; i < Math.min(n, 120); i++) {
		const date = new Date(new Date(c.start).getTime() + i * 864e5).toISOString().slice(0, 10);
		const wave = 1 + Math.sin((i + (h % 7)) / 2.3) * 0.45 + (i < 3 ? 0.8 : 0);
		const visits = Math.round((18 + (h % 25)) * wave);
		const leads = Math.round(visits * rate + (((h + i) % 5) === 0 ? 1 : 0));
		s.daily.push({ date, visits, leads });
		s.visits += visits;
		s.leads += leads;
	}
	const share = [0.45, 0.3, 0.15, 0.1];
	(['form', 'whatsapp', 'phone', 'email'] as const).forEach((k, i) => (s.byKind[k] = Math.round(s.leads * share[i])));
	const tags = c.posts?.length ? c.posts : ['(no post tag)'];
	s.posts = tags.map((key, i) => ({ key, visits: Math.round((s.visits * (tags.length - i)) / ((tags.length * (tags.length + 1)) / 2)), leads: Math.round((s.leads * (tags.length - i)) / ((tags.length * (tags.length + 1)) / 2)) }));
	const path = (() => {
		try {
			return new URL(c.url).pathname || '/';
		} catch {
			return '/';
		}
	})();
	s.pages = [
		{ key: path, visits: Math.round(s.visits * 0.78), leads: Math.round(s.leads * 0.7) },
		{ key: '/contact', visits: Math.round(s.visits * 0.22), leads: Math.round(s.leads * 0.3) }
	];
	return finish(c, s);
}

async function fromGa4(client: Client, c: Campaign): Promise<CampaignStats | null> {
	const property = client.google.ga4PropertyId;
	if (!property || !googleReady()) return null;
	try {
		const j = await gaReport(property, {
			dateRanges: [{ startDate: c.start, endDate: c.end && c.end < today() ? c.end : 'today' }],
			dimensions: [{ name: 'date' }],
			metrics: [{ name: 'sessions' }, { name: 'keyEvents' }],
			dimensionFilter: { filter: { fieldName: 'sessionCampaignName', stringFilter: { value: c.slug, matchType: 'EXACT' } } },
			orderBys: [{ dimension: { dimensionName: 'date' } }]
		});
		const s = emptyStats(c, 'ga4');
		for (const r of j.rows ?? []) {
			const v = r.dimensionValues[0].value as string;
			const visits = Number(r.metricValues[0].value);
			const leads = Number(r.metricValues[1].value);
			s.daily.push({ date: `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`, visits, leads });
			s.visits += visits;
			s.leads += leads;
		}
		s.byKind.form = s.leads; // GA4 key events: kind unknown
		return finish(c, s);
	} catch {
		return null;
	}
}

export async function campaignStats(client: Client, list = listCampaigns(client)) {
	const oldest = list.reduce((m, c) => (c.start < m ? c.start : m), today());
	const span = Math.min(365, Math.ceil((Date.now() - new Date(oldest).getTime()) / 864e5) + 2);
	const events = readEvents(client.id, span);
	const live = events.some((e) => e.t === 'pv');
	const out: Record<string, CampaignStats> = {};
	for (const c of list) {
		if (client.demo && !live) out[c.id] = demoStats(c);
		else {
			const s = fromEvents(c, events);
			out[c.id] = s.visits || s.leads ? s : ((await fromGa4(client, c)) ?? { ...s, source: live ? 'tracking' : 'waiting' });
		}
	}
	// UTM campaigns seen on the site that were never created in Undercut (agency used links before)
	const known = new Set(list.map((c) => c.slug));
	const detected = new Map<string, { slug: string; source: string; medium: string; visits: number; leads: number }>();
	for (const e of events) {
		if (!('camp' in e) || !e.camp || known.has(e.camp) || (e.t !== 'l' && !(e.t === 'pv' && e.ent))) continue;
		const d = detected.get(e.camp) ?? { slug: e.camp, source: e.src ?? '', medium: e.med ?? '', visits: 0, leads: 0 };
		if (e.t === 'l') d.leads++;
		else d.visits++;
		detected.set(e.camp, d);
	}
	return { stats: out, detected: [...detected.values()].sort((a, b) => b.visits - a.visits).slice(0, 10) };
}

/** Visits & leads per social network (organic + paid) — the social overview for communication agencies. */
export function socialOverview(client: Client, days: number) {
	const netOf = (src = '') => {
		const s = src.toLowerCase();
		if (/instagram/.test(s)) return 'instagram';
		if (/facebook|fb\./.test(s)) return 'facebook';
		if (/linkedin|lnkd/.test(s)) return 'linkedin';
		if (/tiktok/.test(s)) return 'tiktok';
		if (/youtube|youtu\.be/.test(s)) return 'youtube';
		if (/pinterest/.test(s)) return 'pinterest';
		if (/(^|\.)t\.co|twitter|x\.com/.test(s)) return 'x';
		return null;
	};
	const events = readEvents(client.id, days);
	const m = new Map<string, { net: string; visits: number; leads: number }>();
	for (const e of events) {
		if (!('src' in e)) continue;
		const n = netOf(e.src);
		if (!n || (e.t !== 'l' && !(e.t === 'pv' && e.ent))) continue;
		const v = m.get(n) ?? { net: n, visits: 0, leads: 0 };
		if (e.t === 'l') v.leads++;
		else v.visits++;
		m.set(n, v);
	}
	if (!m.size && client.demo) {
		const h = hash(client.id);
		return {
			source: 'demo' as const,
			nets: [
				{ net: 'instagram', visits: 320 + (h % 200), leads: 14 + (h % 9) },
				{ net: 'facebook', visits: 180 + (h % 90), leads: 6 + (h % 5) },
				{ net: 'linkedin', visits: 90 + (h % 60), leads: 4 + (h % 4) },
				{ net: 'tiktok', visits: 140 + (h % 120), leads: 2 + (h % 3) }
			].map((x) => ({ ...x, visits: Math.round((x.visits * days) / 28), leads: Math.round((x.leads * days) / 28) }))
		};
	}
	return { source: m.size ? ('tracking' as const) : ('waiting' as const), nets: [...m.values()].sort((a, b) => b.leads - a.leads || b.visits - a.visits) };
}
