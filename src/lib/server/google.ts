// Google OAuth + REST calls (no SDK, just fetch) for GA4, Search Console,
// Business Profile and Tag Manager. One "Connect with Google" asks for all scopes.
import * as env from '$app/env/private';
import { getTokens, saveTokens, type GoogleTokens } from './store';
import type { Client, Metrics } from '#lib/types.ts';
import { dateRange, demoMetrics } from './demo';
import { trackingMetrics } from './metrics-tracking.ts';

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

/** mode "data": connect Analytics, Search Console, Maps, Tag Manager. mode "login": only sign in (name + email). */
export function authUrl(origin: string, state: string, mode: 'data' | 'login' = 'data') {
	const p = new URLSearchParams({
		client_id: env.GOOGLE_CLIENT_ID ?? '',
		redirect_uri: redirectUri(origin),
		response_type: 'code',
		scope: mode === 'login' ? 'openid email profile' : SCOPES.join(' '),
		state
	});
	if (mode === 'data') {
		p.set('access_type', 'offline');
		p.set('prompt', 'consent');
		p.set('include_granted_scopes', 'true');
	} else p.set('prompt', 'select_account');
	return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

/** Sign in with Google: returns the verified identity. The id_token comes straight from Google's token endpoint over TLS. */
export async function googleIdentity(code: string, origin: string) {
	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID ?? '', client_secret: env.GOOGLE_CLIENT_SECRET ?? '', redirect_uri: redirectUri(origin), grant_type: 'authorization_code' })
	});
	if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
	const j = await res.json();
	const claims = JSON.parse(Buffer.from(String(j.id_token).split('.')[1], 'base64url').toString());
	if (claims.aud !== env.GOOGLE_CLIENT_ID || !/accounts\.google\.com$/.test(claims.iss) || claims.exp * 1000 < Date.now()) throw new Error('Invalid Google identity');
	if (!claims.email || claims.email_verified === false) throw new Error('Google account has no verified email');
	return { email: String(claims.email).toLowerCase(), name: String(claims.name ?? claims.email.split('@')[0]) };
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
	clearGoogleCache();
	Object.assign(health, { ok: true, revoked: false, lastError: undefined, lastOk: Date.now() });
	return tokens;
}

// ---------- Robust token + request layer ----------
// - one refresh at a time (no stampede when 20 requests start together)
// - timeouts, retries with backoff on 429 / 5xx / network errors
// - a 401 forces a token refresh and one retry
// - a revoked login (invalid_grant) disconnects cleanly with a clear message
// - GET-like reads are cached 10 min, so dashboards open instantly and quota is spared

export type GoogleHealth = { ok: boolean; lastOk?: number; lastError?: string; lastErrorAt?: number; revoked?: boolean };
const health: GoogleHealth = { ok: true };
export const googleHealth = () => ({ ...health });

let refreshing: Promise<string | null> | null = null;

async function refreshToken(force = false): Promise<string | null> {
	const t = getTokens();
	if (!t) return null;
	if (!force && t.expires_at - 120_000 > Date.now()) return t.access_token;
	if (!t.refresh_token) return null;
	refreshing ??= (async () => {
		try {
			const res = await fetch('https://oauth2.googleapis.com/token', {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					client_id: env.GOOGLE_CLIENT_ID ?? '',
					client_secret: env.GOOGLE_CLIENT_SECRET ?? '',
					refresh_token: t.refresh_token!,
					grant_type: 'refresh_token'
				}),
				signal: AbortSignal.timeout(10_000)
			});
			const j = await res.json().catch(() => ({}));
			if (!res.ok) {
				if (j.error === 'invalid_grant') {
					// the user revoked access or the refresh token expired (7 days in "testing" mode)
					saveTokens(null);
					Object.assign(health, { ok: false, revoked: true, lastError: 'Google access was revoked or expired — please reconnect.', lastErrorAt: Date.now() });
				}
				return null;
			}
			const next = { ...t, access_token: j.access_token, expires_at: Date.now() + j.expires_in * 1000 };
			saveTokens(next);
			return next.access_token as string;
		} catch {
			return null;
		} finally {
			setTimeout(() => (refreshing = null), 0);
		}
	})();
	return refreshing;
}

async function accessToken() {
	return refreshToken(false);
}

const cache = new Map<string, { at: number; value: unknown }>();
const CACHE_MS = 10 * 60_000;
let active = 0;
const queue: (() => void)[] = [];
async function slot<T>(fn: () => Promise<T>): Promise<T> {
	if (active >= 8) await new Promise<void>((r) => queue.push(r));
	active++;
	try {
		return await fn();
	} finally {
		active--;
		queue.shift()?.();
	}
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function g<T = any>(url: string, init: RequestInit = {}, opts: { cache?: boolean } = {}): Promise<T> {
	const key = url + '|' + (typeof init.body === 'string' ? init.body : '');
	const useCache = opts.cache !== false;
	const hit = cache.get(key);
	if (useCache && hit && Date.now() - hit.at < CACHE_MS) return hit.value as T;

	return slot(async () => {
		let token = await accessToken();
		if (!token) throw new Error(health.revoked ? health.lastError! : 'Google not connected');
		let lastErr = '';
		for (let attempt = 0; attempt < 3; attempt++) {
			try {
				const res = await fetch(url, {
					...init,
					headers: { ...(init.headers ?? {}), authorization: `Bearer ${token}`, 'content-type': 'application/json' },
					signal: AbortSignal.timeout(15_000)
				});
				if (res.status === 401 && attempt === 0) {
					token = await refreshToken(true);
					if (!token) throw new Error(health.lastError ?? 'Google login expired — please reconnect.');
					continue;
				}
				if (res.status === 429 || res.status >= 500) {
					lastErr = `${res.status}`;
					await sleep(500 * 2 ** attempt + Math.random() * 300);
					continue;
				}
				if (!res.ok) {
					const text = (await res.text()).slice(0, 1200);
					throw new Error(`${new URL(url).hostname.split('.')[0]}: ${res.status} ${humanError(res.status, text)}`);
				}
				const value = (await res.json()) as T;
				if (useCache) cache.set(key, { at: Date.now(), value });
				Object.assign(health, { ok: true, lastOk: Date.now(), revoked: false });
				return value;
			} catch (e) {
				const err = e as Error;
				if (err.name !== 'TimeoutError' && err.name !== 'TypeError') {
					Object.assign(health, { ok: false, lastError: err.message, lastErrorAt: Date.now() });
					throw err;
				}
				lastErr = err.name === 'TimeoutError' ? 'timeout' : 'network error';
				await sleep(500 * 2 ** attempt);
			}
		}
		const msg = `${new URL(url).hostname.split('.')[0]}: ${lastErr} after 3 tries`;
		Object.assign(health, { ok: false, lastError: msg, lastErrorAt: Date.now() });
		// serve stale data rather than nothing
		if (hit) return hit.value as T;
		throw new Error(msg);
	});
}

function humanError(status: number, text: string) {
	if (status === 403 && /has not been used|disabled/i.test(text)) {
		const project = text.match(/project (\d+)/)?.[1];
		const link = text.match(/https:\/\/console\.developers\.google\.com\/apis\/api\/[^\s"\\]+/)?.[0];
		return `this API is not enabled${project ? ` in Google Cloud project ${project}` : ''} (enable it, wait 2 minutes, then reconnect)${link ? ` → ${link}` : ''}`;
	}
	if (status === 403 && /insufficient|scope/i.test(text)) return 'permission missing — reconnect Google and tick every box on the consent screen';
	if (status === 403) return 'no access to this property with the connected Google account';
	if (status === 404) return 'property not found — pick it again in Setup';
	return text.replace(/\s+/g, ' ');
}

export function clearGoogleCache() {
	cache.clear();
}

/** Quick check used by the "Test connection" button. */
export async function testConnection() {
	const started = Date.now();
	try {
		await g('https://www.googleapis.com/oauth2/v3/userinfo', {}, { cache: false });
		return { ok: true, ms: Date.now() - started };
	} catch (e) {
		return { ok: false, ms: Date.now() - started, error: (e as Error).message };
	}
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
	// Example clients start from demo data. Real clients start from the snippet's own numbers (or zeros) —
	// never invented data. Every connected Google source then overwrites its part with real numbers.
	const m = client.demo ? demoMetrics(client, days) : trackingMetrics(client, days);
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
	const empty: SearchConsoleDetail = { source: 'off', range: demo.range, totals: { clicks: 0, impressions: 0, ctr: 0, position: 0, prevClicks: 0, prevImpressions: 0, prevPosition: 0 }, daily: [], queries: [], pages: [], countries: [], devices: [] };
	if (client.demo && (!site || !isConnected() || !googleConfigured())) return demo;
	if (!site || !isConnected() || !googleConfigured()) return empty;
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
		return client.demo ? { ...demo, source: 'error', error: (e as Error).message } : { ...empty, source: 'error', error: (e as Error).message };
	}
}

// ---------- shared helpers for other modules ----------
export const googleReady = () => isConnected() && googleConfigured();
export function gaReport(property: string, body: object) {
	return g(`https://analyticsdata.googleapis.com/v1beta/${property}:runReport`, { method: 'POST', body: JSON.stringify(body) });
}

// ---------- segments for "why did this change?" ----------
export type Seg = { key: string; cur: number; prev: number };
const GA_DIM = { channel: 'sessionDefaultChannelGroup', page: 'landingPage', country: 'country', device: 'deviceCategory' } as const;

export async function gaSegments(property: string, metric: 'sessions' | 'keyEvents', dim: keyof typeof GA_DIM, days: number): Promise<Seg[]> {
	const cur = dateRange(days);
	const prev = prevRange(days);
	const j = await gaReport(property, {
		dateRanges: [
			{ startDate: cur.start, endDate: cur.end, name: 'cur' },
			{ startDate: prev.start, endDate: prev.end, name: 'prev' }
		],
		dimensions: [{ name: GA_DIM[dim] }],
		metrics: [{ name: metric }],
		limit: 50
	});
	const m = new Map<string, Seg>();
	for (const r of j.rows ?? []) {
		const key = r.dimensionValues[0].value || '(not set)';
		const which = r.dimensionValues[1]?.value;
		const s = m.get(key) ?? { key, cur: 0, prev: 0 };
		if (which === 'prev') s.prev += Number(r.metricValues[0].value);
		else s.cur += Number(r.metricValues[0].value);
		m.set(key, s);
	}
	return [...m.values()];
}

const GSC_DIM = { channel: 'query', page: 'page', country: 'country', device: 'device' } as const;
export async function gscSegments(site: string, dim: keyof typeof GSC_DIM, days: number): Promise<Seg[]> {
	const base = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
	const cur = dateRange(days);
	const prev = prevRange(days);
	const q = (r: { start: string; end: string }) => g(base, { method: 'POST', body: JSON.stringify({ startDate: r.start, endDate: r.end, dimensions: [GSC_DIM[dim]], rowLimit: 50 }) });
	const [a, b] = await Promise.all([q(cur), q(prev)]);
	const m = new Map<string, Seg>();
	for (const r of a.rows ?? []) m.set(r.keys[0], { key: r.keys[0], cur: r.clicks, prev: 0 });
	for (const r of b.rows ?? []) {
		const s = m.get(r.keys[0]) ?? { key: r.keys[0], cur: 0, prev: 0 };
		s.prev = r.clicks;
		m.set(r.keys[0], s);
	}
	return [...m.values()];
}

/** Search Console numbers for one exact query (used for tracked keywords outside the top 100). */
export async function gscQuery(client: Client, query: string, days = 28): Promise<GscRow | null> {
	const site = client.google.gscSiteUrl;
	if (!site || !isConnected() || !googleConfigured()) return null;
	const range = demoSearchConsole(client, days).range;
	const j = await g(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
		method: 'POST',
		body: JSON.stringify({ startDate: range.start, endDate: range.end, dimensions: ['query'], dimensionFilterGroups: [{ filters: [{ dimension: 'query', operator: 'equals', expression: query }] }] })
	});
	const r = j.rows?.[0];
	return r ? { key: query, clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: +r.position.toFixed(1) } : null;
}
