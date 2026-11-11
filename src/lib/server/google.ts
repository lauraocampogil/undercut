// Google OAuth + REST calls (no SDK, just fetch) for GA4, Search Console,
// Business Profile and Tag Manager. One "Connect with Google" asks for all scopes.
import * as env from '$app/env/private';
import { getTokens, saveTokens, type GoogleTokens } from './store';
import type { Client, Metrics } from '#lib/types.ts';
import { dateRange, demoMetrics } from './demo';

export const SCOPES = [
	'openid',
	'email',
	'https://www.googleapis.com/auth/analytics.readonly',
	'https://www.googleapis.com/auth/webmasters.readonly',
	'https://www.googleapis.com/auth/business.manage',
	'https://www.googleapis.com/auth/tagmanager.readonly'
];

export function googleConfigured() {
	return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

function redirectUri(origin: string) {
	return env.GOOGLE_REDIRECT_URI || `${origin}/auth/google/callback`;
}

export function authUrl(origin: string, state: string) {
	const p = new URLSearchParams({
		client_id: env.GOOGLE_CLIENT_ID ?? '',
		redirect_uri: redirectUri(origin),
		response_type: 'code',
		scope: SCOPES.join(' '),
		access_type: 'offline',
		prompt: 'consent',
		include_granted_scopes: 'true',
		state
	});
	return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export async function exchangeCode(code: string, origin: string) {
	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			code,
			client_id: env.GOOGLE_CLIENT_ID ?? '',
			client_secret: env.GOOGLE_CLIENT_SECRET ?? '',
			redirect_uri: redirectUri(origin),
			grant_type: 'authorization_code'
		})
	});
	if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
	const j = await res.json();
	let email: string | undefined;
	if (j.id_token) {
		try {
			email = JSON.parse(Buffer.from(j.id_token.split('.')[1], 'base64url').toString()).email;
		} catch {
			/* ignore */
		}
	}
	const tokens: GoogleTokens = {
		access_token: j.access_token,
		refresh_token: j.refresh_token,
		expires_at: Date.now() + j.expires_in * 1000,
		scope: j.scope,
		email
	};
	saveTokens(tokens);
	return tokens;
}

async function accessToken(): Promise<string | null> {
	const t = getTokens();
	if (!t) return null;
	if (t.expires_at - 60_000 > Date.now()) return t.access_token;
	if (!t.refresh_token) return null;
	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: env.GOOGLE_CLIENT_ID ?? '',
			client_secret: env.GOOGLE_CLIENT_SECRET ?? '',
			refresh_token: t.refresh_token,
			grant_type: 'refresh_token'
		})
	});
	if (!res.ok) return null;
	const j = await res.json();
	const next = { ...t, access_token: j.access_token, expires_at: Date.now() + j.expires_in * 1000 };
	saveTokens(next);
	return next.access_token;
}

async function g<T = any>(url: string, init: RequestInit = {}): Promise<T> {
	const token = await accessToken();
	if (!token) throw new Error('Google not connected');
	const res = await fetch(url, {
		...init,
		headers: { ...(init.headers ?? {}), authorization: `Bearer ${token}`, 'content-type': 'application/json' }
	});
	if (!res.ok) throw new Error(`${new URL(url).hostname}: ${res.status} ${(await res.text()).slice(0, 160)}`);
	return res.json();
}

export function isConnected() {
	return Boolean(getTokens());
}

// ---------- Pickers: what can this Google account see? ----------

export type Option = { value: string; label: string };

export async function listAccounts() {
	const out: Record<'ga4' | 'gsc' | 'gbp' | 'gtm', Option[]> = { ga4: [], gsc: [], gbp: [], gtm: [] };
	const errors: string[] = [];
	await Promise.all([
		g('https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200')
			.then((j) => {
				for (const a of j.accountSummaries ?? [])
					for (const p of a.propertySummaries ?? [])
						out.ga4.push({ value: p.property, label: `${p.displayName} (${a.displayName})` });
			})
			.catch((e) => errors.push(`GA4: ${e.message}`)),
		g('https://www.googleapis.com/webmasters/v3/sites')
			.then((j) => {
				for (const s of j.siteEntry ?? []) out.gsc.push({ value: s.siteUrl, label: s.siteUrl });
			})
			.catch((e) => errors.push(`Search Console: ${e.message}`)),
		g('https://mybusinessaccountmanagement.googleapis.com/v1/accounts')
			.then(async (j) => {
				for (const a of j.accounts ?? []) {
					const l = await g(
						`https://mybusinessbusinessinformation.googleapis.com/v1/${a.name}/locations?readMask=name,title&pageSize=100`
					);
					for (const loc of l.locations ?? []) out.gbp.push({ value: loc.name, label: loc.title });
				}
			})
			.catch((e) => errors.push(`Business Profile: ${e.message}`)),
		g('https://tagmanager.googleapis.com/tagmanager/v2/accounts')
			.then(async (j) => {
				for (const a of j.account ?? []) {
					const c = await g(`https://tagmanager.googleapis.com/tagmanager/v2/${a.path}/containers`);
					for (const ct of c.container ?? [])
						out.gtm.push({ value: ct.path, label: `${ct.name} · ${ct.publicId}` });
				}
			})
			.catch((e) => errors.push(`Tag Manager: ${e.message}`))
	]);
	return { ...out, errors };
}

// ---------- Metrics ----------

const pct = (a: number, b: number) => (b ? (a - b) / b : 0);
void pct;

function prevRange(days: number) {
	const cur = dateRange(days);
	const end = new Date(cur.start + 'T00:00:00Z');
	end.setUTCDate(end.getUTCDate() - 1);
	const start = new Date(end);
	start.setUTCDate(start.getUTCDate() - (days - 1));
	return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

async function ga4(m: Metrics, property: string, days: number) {
	const cur = m.range;
	const prev = prevRange(days);
	const url = `https://analyticsdata.googleapis.com/v1beta/${property}:runReport`;
	const dr = [
		{ startDate: cur.start, endDate: cur.end, name: 'cur' },
		{ startDate: prev.start, endDate: prev.end, name: 'prev' }
	];
	const [totals, daily, channels, pages] = await Promise.all([
		g(url, {
			method: 'POST',
			body: JSON.stringify({
				dateRanges: dr,
				metrics: [
					{ name: 'sessions' },
					{ name: 'totalUsers' },
					{ name: 'averageSessionDuration' },
					{ name: 'keyEvents' }
				]
			})
		}),
		g(url, {
			method: 'POST',
			body: JSON.stringify({
				dateRanges: [dr[0]],
				dimensions: [{ name: 'date' }],
				metrics: [{ name: 'sessions' }],
				orderBys: [{ dimension: { dimensionName: 'date' } }]
			})
		}),
		g(url, {
			method: 'POST',
			body: JSON.stringify({
				dateRanges: [dr[0]],
				dimensions: [{ name: 'sessionDefaultChannelGroup' }],
				metrics: [{ name: 'sessions' }],
				limit: 6
			})
		}),
		g(url, {
			method: 'POST',
			body: JSON.stringify({
				dateRanges: dr,
				dimensions: [{ name: 'pagePath' }],
				metrics: [{ name: 'screenPageViews' }],
				orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
				limit: 12
			})
		})
	]);
	const row = (name: string) =>
		(totals.rows ?? []).find((r: any) => r.dimensionValues?.some((d: any) => d.value === name));
	const val = (r: any, i: number) => Number(r?.metricValues?.[i]?.value ?? 0);
	const c = row('cur'),
		p = row('prev');
	m.visits.total = val(c, 0);
	m.visits.prev = val(p, 0);
	m.users = { total: val(c, 1), prev: val(p, 1) };
	m.engagementSec = { value: Math.round(val(c, 2)), prev: Math.round(val(p, 2)) };
	m.conversions = { total: val(c, 3), prev: val(p, 3) };
	m.visits.daily = (daily.rows ?? []).map((r: any) => {
		const d = r.dimensionValues[0].value as string;
		return { date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, value: Number(r.metricValues[0].value) };
	});
	const rename: Record<string, string> = {
		'Organic Search': 'Google Search',
		Direct: 'Direct',
		'Organic Social': 'Social',
		Referral: 'Other sites',
		'Paid Search': 'Google Ads'
	};
	m.channels = (channels.rows ?? []).map((r: any) => ({
		name: rename[r.dimensionValues[0].value] ?? r.dimensionValues[0].value,
		visits: Number(r.metricValues[0].value)
	}));
	const byPath = new Map<string, { cur: number; prev: number }>();
	for (const r of pages.rows ?? []) {
		const path = r.dimensionValues[0].value;
		const which = r.dimensionValues[1]?.value;
		const e = byPath.get(path) ?? { cur: 0, prev: 0 };
		if (which === 'prev') e.prev += Number(r.metricValues[0].value);
		else e.cur += Number(r.metricValues[0].value);
		byPath.set(path, e);
	}
	m.topPages = [...byPath.entries()]
		.map(([path, v]) => ({ path, views: v.cur, change: v.prev ? Math.round(((v.cur - v.prev) / v.prev) * 100) : 0 }))
		.sort((a, b) => b.views - a.views)
		.slice(0, 6);
	m.sources.ga4 = 'google';
}

async function gsc(m: Metrics, site: string, days: number) {
	const base = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
	const prev = prevRange(days);
	const [cur, old, queries] = await Promise.all([
		g(base, { method: 'POST', body: JSON.stringify({ startDate: m.range.start, endDate: m.range.end }) }),
		g(base, { method: 'POST', body: JSON.stringify({ startDate: prev.start, endDate: prev.end }) }),
		g(base, {
			method: 'POST',
			body: JSON.stringify({ startDate: m.range.start, endDate: m.range.end, dimensions: ['query'], rowLimit: 8 })
		})
	]);
	const c = cur.rows?.[0] ?? {},
		o = old.rows?.[0] ?? {};
	m.search = {
		clicks: c.clicks ?? 0,
		prevClicks: o.clicks ?? 0,
		impressions: c.impressions ?? 0,
		position: +(c.position ?? 0).toFixed(1),
		prevPosition: +(o.position ?? 0).toFixed(1),
		queries: (queries.rows ?? []).map((r: any) => ({
			query: r.keys[0],
			clicks: r.clicks,
			impressions: r.impressions,
			position: +r.position.toFixed(1)
		}))
	};
	m.sources.gsc = 'google';
}

async function gbp(m: Metrics, location: string, days: number) {
	const prev = prevRange(days);
	const metrics = [
		'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
		'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
		'CALL_CLICKS',
		'BUSINESS_DIRECTION_REQUESTS',
		'WEBSITE_CLICKS'
	];
	const q = (s: string, e: string) => {
		const [sy, sm, sd] = s.split('-').map(Number);
		const [ey, em, ed] = e.split('-').map(Number);
		const p = new URLSearchParams();
		metrics.forEach((x) => p.append('dailyMetrics', x));
		p.set('dailyRange.start_date.year', String(sy));
		p.set('dailyRange.start_date.month', String(sm));
		p.set('dailyRange.start_date.day', String(sd));
		p.set('dailyRange.end_date.year', String(ey));
		p.set('dailyRange.end_date.month', String(em));
		p.set('dailyRange.end_date.day', String(ed));
		return g(`https://businessprofileperformance.googleapis.com/v1/${location}:fetchMultiDailyMetricsTimeSeries?${p}`);
	};
	const sum = (j: any) => {
		const out: Record<string, number> = {};
		for (const s of j.multiDailyMetricTimeSeries ?? [])
			for (const t of s.dailyMetricTimeSeries ?? [])
				out[t.dailyMetric] =
					(out[t.dailyMetric] ?? 0) +
					(t.timeSeries?.datedValues ?? []).reduce((a: number, v: any) => a + Number(v.value ?? 0), 0);
		return out;
	};
	const [cur, old] = await Promise.all([q(m.range.start, m.range.end), q(prev.start, prev.end)]);
	const c = sum(cur),
		o = sum(old);
	m.maps = {
		views: (c.BUSINESS_IMPRESSIONS_MOBILE_MAPS ?? 0) + (c.BUSINESS_IMPRESSIONS_DESKTOP_MAPS ?? 0),
		calls: c.CALL_CLICKS ?? 0,
		directions: c.BUSINESS_DIRECTION_REQUESTS ?? 0,
		websiteClicks: c.WEBSITE_CLICKS ?? 0,
		prevTotal: (o.CALL_CLICKS ?? 0) + (o.BUSINESS_DIRECTION_REQUESTS ?? 0) + (o.WEBSITE_CLICKS ?? 0)
	};
	m.sources.gbp = 'google';
}

async function gtm(m: Metrics, container: string) {
	const ws = await g(`https://tagmanager.googleapis.com/tagmanager/v2/${container}/workspaces`);
	const w = ws.workspace?.[0];
	const c = await g(`https://tagmanager.googleapis.com/tagmanager/v2/${container}`);
	let tags: any[] = [];
	if (w) tags = (await g(`https://tagmanager.googleapis.com/tagmanager/v2/${w.path}/tags`)).tag ?? [];
	m.tags = {
		container: c.publicId ?? container,
		googleTagFound: tags.some((t) => ['googtag', 'gaawc', 'gaawe'].includes(t.type)),
		tagCount: tags.length
	};
	m.sources.gtm = 'google';
}

export async function getMetrics(client: Client, days = 28): Promise<Metrics> {
	// Start from demo data; every connected source overwrites its part with real numbers.
	const m = demoMetrics(client, days);
	if (!isConnected() || !googleConfigured()) return m;
	const gg = client.google;
	const run = async (key: keyof Metrics['sources'], enabled: string | undefined, fn: () => Promise<void>) => {
		if (!enabled) return;
		try {
			await fn();
		} catch (e) {
			m.sources[key] = 'error';
			m.errors.push((e as Error).message);
		}
	};
	await Promise.all([
		run('ga4', gg.ga4PropertyId, () => ga4(m, gg.ga4PropertyId!, days)),
		run('gsc', gg.gscSiteUrl, () => gsc(m, gg.gscSiteUrl!, days)),
		run('gbp', gg.gbpLocation, () => gbp(m, gg.gbpLocation!, days)),
		run('gtm', gg.gtmContainer, () => gtm(m, gg.gtmContainer!))
	]);
	return m;
}

// ---------- Search Console detail page ----------
import type { GscRow, SearchConsoleDetail } from '#lib/types.ts';
import { demoSearchConsole } from './demo.ts';

const COUNTRY: Record<string, string> = { bel: 'Belgium', fra: 'France', nld: 'Netherlands', lux: 'Luxembourg', esp: 'Spain', deu: 'Germany', gbr: 'United Kingdom', usa: 'United States' };

export async function getSearchConsole(client: Client, days = 28): Promise<SearchConsoleDetail> {
	const demo = demoSearchConsole(client, days);
	const site = client.google.gscSiteUrl;
	if (!site || !isConnected() || !googleConfigured()) return demo;
	const base = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
	const prev = prevRange(days);
	const q = (body: object) => g(base, { method: 'POST', body: JSON.stringify({ startDate: demo.range.start, endDate: demo.range.end, ...body }) });
	const toRows = (j: any, map = (k: string) => k): GscRow[] =>
		(j.rows ?? []).map((r: any) => ({ key: map(r.keys[0]), clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: +r.position.toFixed(1) }));
	try {
		const [tot, old, daily, queries, prevQueries, pages, countries, devices] = await Promise.all([
			q({}),
			g(base, { method: 'POST', body: JSON.stringify({ startDate: prev.start, endDate: prev.end }) }),
			q({ dimensions: ['date'] }),
			q({ dimensions: ['query'], rowLimit: 100 }),
			g(base, { method: 'POST', body: JSON.stringify({ startDate: prev.start, endDate: prev.end, dimensions: ['query'], rowLimit: 250 }) }),
			q({ dimensions: ['page'], rowLimit: 50 }),
			q({ dimensions: ['country'], rowLimit: 10 }),
			q({ dimensions: ['device'] })
		]);
		const t = tot.rows?.[0] ?? {},
			o = old.rows?.[0] ?? {};
		const prevMap = new Map<string, number>((prevQueries.rows ?? []).map((r: any) => [r.keys[0], r.clicks]));
		const origin = client.domain.replace(/\/$/, '');
		return {
			source: 'google',
			range: demo.range,
			totals: {
				clicks: t.clicks ?? 0,
				impressions: t.impressions ?? 0,
				ctr: t.ctr ?? 0,
				position: +(t.position ?? 0).toFixed(1),
				prevClicks: o.clicks ?? 0,
				prevImpressions: o.impressions ?? 0,
				prevPosition: +(o.position ?? 0).toFixed(1)
			},
			daily: (daily.rows ?? []).map((r: any) => ({ date: r.keys[0], clicks: r.clicks, impressions: r.impressions })),
			queries: toRows(queries).map((r) => ({ ...r, prevClicks: prevMap.get(r.key) ?? 0 })),
			pages: toRows(pages, (k) => k.replace(origin, '') || '/'),
			countries: toRows(countries, (k) => COUNTRY[k] ?? k.toUpperCase()),
			devices: toRows(devices, (k) => k.charAt(0) + k.slice(1).toLowerCase())
		};
	} catch (e) {
		return { ...demo, source: 'error', error: (e as Error).message };
	}
}
