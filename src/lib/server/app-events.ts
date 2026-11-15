// Events sent by the Undercut app SDK (React Native / Expo, Swift, Kotlin, Flutter) and by the web snippet's error catcher.
// - Paywall tracker: paywall_view → trial_start / purchase (per paywall + variant = A/B test), revenue
// - Errors (Sentry-like): every error grouped into issues by fingerprint, with users, versions and a stack sample
// Stored as JSON lines per client per day on the data volume (like the web snippet events).
import { mkdirSync, appendFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { Client } from '#lib/types.ts';
import type { Draft } from './insights.ts';
import { readData, writeData } from './store.ts';

const DIR = join(process.cwd(), '.data', 'app-events');
const safe = (s: string) => s.replace(/[^a-z0-9-]/gi, '').slice(0, 60);
const day = (ts = Date.now()) => new Date(ts).toISOString().slice(0, 10);
const str = (v: unknown, n = 120) => (typeof v === 'string' ? v.slice(0, n) : v == null ? undefined : String(v).slice(0, n));

export type Platform = 'ios' | 'android' | 'web';
export type AppEvent = {
	t: 'session' | 'screen' | 'paywall_view' | 'paywall_close' | 'trial_start' | 'purchase' | 'error';
	ts: number;
	u?: string; // anonymous install / visitor id
	pf?: Platform;
	av?: string; // app version
	os?: string;
	// paywall
	pw?: string; // paywall id ("onboarding", "settings")
	vr?: string; // variant ("A", "yearly-first")
	pr?: string; // product id
	price?: number;
	cur?: string;
	// error
	msg?: string;
	stack?: string;
	fatal?: boolean;
	url?: string;
	name?: string; // screen name
};

const TYPES = new Set(['session', 'screen', 'paywall_view', 'paywall_close', 'trial_start', 'purchase', 'error']);

export function recordApp(site: string, raw: unknown[], platformHint?: Platform) {
	const dir = join(DIR, safe(site));
	mkdirSync(dir, { recursive: true });
	const lines = raw
		.filter((e): e is Record<string, unknown> => Boolean(e) && typeof e === 'object' && TYPES.has(String((e as any).t)))
		.slice(0, 100)
		.map((e) => {
			const pf = ['ios', 'android', 'web'].includes(String(e.pf)) ? (e.pf as Platform) : platformHint;
			const ev: AppEvent = { t: e.t as AppEvent['t'], ts: Date.now(), u: str(e.u, 40), pf, av: str(e.av, 20), os: str(e.os, 20), pw: str(e.pw, 60), vr: str(e.vr, 40), pr: str(e.pr, 80), price: typeof e.price === 'number' && Number.isFinite(e.price) ? Math.max(0, Math.min(10000, e.price)) : undefined, cur: str(e.cur, 3)?.toUpperCase(), msg: str(e.msg, 400), stack: str(e.stack, 3000), fatal: e.fatal === true || undefined, url: str(e.url, 300), name: str(e.name, 80) };
			return JSON.stringify(ev);
		})
		.join('\n');
	if (lines) appendFileSync(join(dir, `${day()}.jsonl`), lines + '\n');
	return lines ? lines.split('\n').length : 0;
}

export function readApp(site: string, days: number): AppEvent[] {
	const dir = join(DIR, safe(site));
	if (!existsSync(dir)) return [];
	const out: AppEvent[] = [];
	for (let i = 0; i < days; i++) {
		const f = join(dir, `${day(Date.now() - i * 864e5)}.jsonl`);
		if (!existsSync(f)) continue;
		for (const l of readFileSync(f, 'utf8').split('\n')) {
			if (!l) continue;
			try {
				out.push(JSON.parse(l));
			} catch {
				/* skip broken line */
			}
		}
	}
	return out.sort((a, b) => a.ts - b.ts);
}

const series = (events: AppEvent[], days: number, pick: (e: AppEvent) => number) => {
	const m = new Map<string, number>();
	for (let i = days - 1; i >= 0; i--) m.set(day(Date.now() - i * 864e5), 0);
	for (const e of events) {
		const k = day(e.ts);
		if (m.has(k)) m.set(k, m.get(k)! + pick(e));
	}
	return [...m].map(([date, value]) => ({ date, value: Math.round(value * 100) / 100 }));
};
const uniq = (l: (string | undefined)[]) => new Set(l.filter(Boolean)).size;

// ---------- Paywall ----------
export type PaywallRow = { paywall: string; variant: string; views: number; viewers: number; trials: number; purchases: number; conv: number; revenue: number; closes: number };
export type PaywallReport = {
	source: 'live' | 'demo' | 'waiting';
	days: number;
	currency: string;
	totals: { views: number; viewers: number; trials: number; purchases: number; conv: number; revenue: number };
	rows: PaywallRow[];
	products: { product: string; purchases: number; revenue: number }[];
	daily: { date: string; value: number }[]; // revenue
	dailyConv: { date: string; value: number }[];
	winner: { paywall: string; best: string; worst: string; lift: number; enough: boolean } | null;
};

export function getPaywall(client: Client, days = 28): PaywallReport {
	const events = client.demo ? demoEvents(client, days) : readApp(client.id, days);
	const pw = events.filter((e) => ['paywall_view', 'paywall_close', 'trial_start', 'purchase'].includes(e.t));
	const currency = pw.find((e) => e.cur)?.cur ?? 'EUR';
	const key = (e: AppEvent) => `${e.pw || 'paywall'}|${e.vr || 'default'}`;
	const map = new Map<string, AppEvent[]>();
	for (const e of pw) map.set(key(e), [...(map.get(key(e)) ?? []), e]);
	const rows: PaywallRow[] = [...map].map(([k, l]) => {
		const [paywall, variant] = k.split('|');
		const views = l.filter((e) => e.t === 'paywall_view').length;
		const viewers = uniq(l.filter((e) => e.t === 'paywall_view').map((e) => e.u));
		const trials = l.filter((e) => e.t === 'trial_start').length;
		const purchases = l.filter((e) => e.t === 'purchase').length;
		return { paywall, variant, views, viewers, trials, purchases, closes: l.filter((e) => e.t === 'paywall_close').length, revenue: Math.round(l.filter((e) => e.t === 'purchase').reduce((s, e) => s + (e.price ?? 0), 0) * 100) / 100, conv: viewers ? Math.round(((trials + purchases) / viewers) * 1000) / 10 : 0 };
	});
	rows.sort((a, b) => b.views - a.views);
	const prodMap = new Map<string, { purchases: number; revenue: number }>();
	for (const e of pw.filter((e) => e.t === 'purchase')) {
		const p = prodMap.get(e.pr || 'unknown') ?? { purchases: 0, revenue: 0 };
		p.purchases++;
		p.revenue = Math.round((p.revenue + (e.price ?? 0)) * 100) / 100;
		prodMap.set(e.pr || 'unknown', p);
	}
	const viewers = uniq(pw.filter((e) => e.t === 'paywall_view').map((e) => e.u));
	const trials = pw.filter((e) => e.t === 'trial_start').length;
	const purchases = pw.filter((e) => e.t === 'purchase').length;
	// A/B: per paywall with ≥2 variants
	let winner: PaywallReport['winner'] = null;
	const byPw = new Map<string, PaywallRow[]>();
	for (const r of rows) byPw.set(r.paywall, [...(byPw.get(r.paywall) ?? []), r]);
	for (const [paywall, vs] of byPw) {
		if (vs.length < 2) continue;
		const s = [...vs].sort((a, b) => b.conv - a.conv);
		winner = { paywall, best: s[0].variant, worst: s.at(-1)!.variant, lift: s.at(-1)!.conv ? Math.round(((s[0].conv - s.at(-1)!.conv) / s.at(-1)!.conv) * 100) : 0, enough: s.every((v) => v.viewers >= 100) };
		break;
	}
	const viewsByDay = series(pw.filter((e) => e.t === 'paywall_view'), days, () => 1);
	const convByDay = series(pw.filter((e) => e.t === 'trial_start' || e.t === 'purchase'), days, () => 1);
	return {
		source: client.demo ? 'demo' : pw.length ? 'live' : 'waiting',
		days,
		currency,
		totals: { views: pw.filter((e) => e.t === 'paywall_view').length, viewers, trials, purchases, conv: viewers ? Math.round(((trials + purchases) / viewers) * 1000) / 10 : 0, revenue: Math.round(pw.filter((e) => e.t === 'purchase').reduce((s, e) => s + (e.price ?? 0), 0) * 100) / 100 },
		rows,
		products: [...prodMap].map(([product, v]) => ({ product, ...v })).sort((a, b) => b.revenue - a.revenue),
		daily: series(pw.filter((e) => e.t === 'purchase'), days, (e) => e.price ?? 0),
		dailyConv: viewsByDay.map((v, i) => ({ date: v.date, value: v.value ? Math.round((convByDay[i].value / v.value) * 1000) / 10 : 0 })),
		winner
	};
}

export function paywallTasks(r: PaywallReport): Draft[] {
	const out: Draft[] = [];
	if (r.source === 'waiting') return out;
	if (r.winner && r.winner.enough && r.winner.lift >= 15) out.push({ level: 'good', area: 'App', title: `Paywall “${r.winner.paywall}”: variant ${r.winner.best} converts ${r.winner.lift}% better`, meaning: `Compared to variant ${r.winner.worst}, with 100+ people on each side.`, action: `Show variant ${r.winner.best} to everyone and test a new challenger.` });
	const weak = r.rows.find((x) => x.viewers >= 200 && x.conv < 2);
	if (weak) out.push({ level: 'warn', area: 'App', title: `Paywall “${weak.paywall}” converts only ${weak.conv}%`, meaning: `${weak.viewers} people saw it, ${weak.trials + weak.purchases} started a trial or paid.`, action: 'Test a free trial, a yearly plan shown first, or showing it later (after the first success in the app).' });
	return out;
}

// ---------- Errors ----------
export type Issue = {
	id: string;
	title: string;
	culprit: string;
	platform: Platform | 'mixed';
	fatal: boolean;
	count: number;
	users: number;
	firstSeen: number;
	lastSeen: number;
	versions: string[];
	stack: string;
	url?: string;
	daily: { date: string; value: number }[];
	status: 'open' | 'resolved' | 'ignored' | 'regressed';
};
export type ErrorsReport = { source: 'live' | 'demo' | 'waiting'; days: number; issues: Issue[]; total: number; users: number; crashFree: number | null; sessions: number; platforms: Platform[] };

type Status = Record<string, { s: 'resolved' | 'ignored'; at: number }>;
const statusFile = (id: string) => `errors-status-${id}.json`;
export function setIssueStatus(client: Client, issue: string, s: 'resolved' | 'ignored' | 'open') {
	const st = readData<Status>(statusFile(client.id), {});
	if (s === 'open') delete st[issue];
	else st[issue] = { s, at: Date.now() };
	writeData(statusFile(client.id), st);
}

const norm = (m: string) =>
	m
		.replace(/https?:\/\/\S+/g, '<url>')
		.replace(/\b[0-9a-f]{8,}\b/gi, '<id>')
		.replace(/\d+/g, 'N')
		.trim();
const firstFrame = (stack = '') =>
	stack
		.split('\n')
		.map((l) => l.trim())
		.find((l) => /^at |@|\.(js|ts|tsx|swift|kt|dart|java)/.test(l) && !/node_modules|undercut/i.test(l))
		?.replace(/:\d+:\d+\)?$/, '')
		.replace(/^at /, '')
		.slice(0, 140) ?? '';

export function getErrors(client: Client, days = 14): ErrorsReport {
	const events = client.demo ? demoEvents(client, days) : readApp(client.id, days);
	const errs = events.filter((e) => e.t === 'error' && e.msg);
	const st = readData<Status>(statusFile(client.id), {});
	const groups = new Map<string, AppEvent[]>();
	for (const e of errs) {
		const fp = createHash('sha1').update(norm(e.msg!) + '|' + firstFrame(e.stack)).digest('hex').slice(0, 12);
		groups.set(fp, [...(groups.get(fp) ?? []), e]);
	}
	const issues: Issue[] = [...groups].map(([id, l]) => {
		const last = l.at(-1)!;
		const pfs = new Set(l.map((e) => e.pf ?? 'web'));
		const s = st[id];
		const status: Issue['status'] = !s ? 'open' : s.s === 'ignored' ? 'ignored' : last.ts > s.at ? 'regressed' : 'resolved';
		return {
			id,
			title: last.msg!.split('\n')[0].slice(0, 160),
			culprit: firstFrame(last.stack) || last.url || last.name || '',
			platform: pfs.size > 1 ? 'mixed' : ([...pfs][0] as Platform),
			fatal: l.some((e) => e.fatal),
			count: l.length,
			users: uniq(l.map((e) => e.u)) || 1,
			firstSeen: l[0].ts,
			lastSeen: last.ts,
			versions: [...new Set(l.map((e) => e.av).filter(Boolean) as string[])].slice(0, 5),
			stack: last.stack ?? '',
			url: last.url,
			daily: series(l, days, () => 1),
			status
		};
	});
	const order = { regressed: 0, open: 1, resolved: 2, ignored: 3 };
	issues.sort((a, b) => order[a.status] - order[b.status] || Number(b.fatal) - Number(a.fatal) || b.users - a.users || b.count - a.count);
	const sessions = events.filter((e) => e.t === 'session');
	const crashed = uniq(errs.filter((e) => e.fatal).map((e) => `${e.u}|${day(e.ts)}`));
	return {
		source: client.demo ? 'demo' : events.length ? 'live' : 'waiting',
		days,
		issues,
		total: errs.length,
		users: uniq(errs.map((e) => e.u)),
		sessions: sessions.length,
		crashFree: sessions.length ? Math.max(0, Math.round((1 - crashed / sessions.length) * 1000) / 10) : null,
		platforms: [...new Set(events.map((e) => e.pf).filter(Boolean) as Platform[])]
	};
}

export function errorTasks(r: ErrorsReport): Draft[] {
	const out: Draft[] = [];
	const hot = r.issues.filter((i) => (i.status === 'open' || i.status === 'regressed') && Date.now() - i.lastSeen < 2 * 864e5);
	const crash = hot.find((i) => i.fatal);
	if (crash) out.push({ level: 'bad', area: 'App', title: `Crash: ${crash.title.slice(0, 70)}`, meaning: `${crash.users} user${crash.users > 1 ? 's' : ''} hit it ${crash.count}× (${crash.platform}${crash.versions[0] ? `, v${crash.versions[0]}` : ''}).`, action: 'Open Errors to see the stack trace, send it to the developer, mark it resolved once the fix is out.' });
	const reg = hot.find((i) => i.status === 'regressed' && i !== crash);
	if (reg) out.push({ level: 'warn', area: 'App', title: `Error came back: ${reg.title.slice(0, 70)}`, meaning: 'It was marked resolved but happened again.', action: 'Check the last release — the fix may not be in it.' });
	const fresh = hot.filter((i) => Date.now() - i.firstSeen < 864e5 && i !== crash && i !== reg);
	if (fresh.length) out.push({ level: 'warn', area: 'App', title: `${fresh.length} new error${fresh.length > 1 ? 's' : ''} since yesterday`, meaning: fresh.map((i) => i.title.slice(0, 60)).join(' · '), action: 'Look at them in Errors; most come from the latest release.' });
	return out;
}

// ---------- demo ----------
function demoEvents(client: Client, days: number): AppEvent[] {
	let h = 2166136261;
	for (const ch of client.id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
	const r = () => ((h = Math.imul(h ^ (h >>> 15), 2246822519) ^ Math.imul(h ^ (h >>> 13), 3266489917)) >>> 0) / 4294967296;
	const out: AppEvent[] = [];
	for (let d = days - 1; d >= 0; d--) {
		const t0 = Date.now() - d * 864e5;
		const n = 40 + Math.floor(r() * 30);
		for (let i = 0; i < n; i++) {
			const u = `u${Math.floor(r() * 4000)}`;
			const pf: Platform = r() < 0.55 ? 'ios' : 'android';
			const av = d > 9 ? '3.4.0' : '3.5.0';
			out.push({ t: 'session', ts: t0 - i * 6e4, u, pf, av });
			if (r() < 0.45) {
				const vr = r() < 0.5 ? 'A · monthly first' : 'B · yearly first';
				const pw = r() < 0.7 ? 'onboarding' : 'settings';
				out.push({ t: 'paywall_view', ts: t0 - i * 6e4 + 1000, u, pf, av, pw, vr });
				const p = (vr.startsWith('B') ? 0.09 : 0.055) * (pw === 'settings' ? 0.5 : 1);
				const x = r();
				if (x < p * 0.6) out.push({ t: 'trial_start', ts: t0 - i * 6e4 + 2000, u, pf, av, pw, vr, pr: 'premium_yearly' });
				else if (x < p) out.push({ t: 'purchase', ts: t0 - i * 6e4 + 2000, u, pf, av, pw, vr, pr: vr.startsWith('B') ? 'premium_yearly' : 'premium_monthly', price: vr.startsWith('B') ? 49.99 : 7.99, cur: 'EUR' });
				else out.push({ t: 'paywall_close', ts: t0 - i * 6e4 + 3000, u, pf, av, pw, vr });
			}
			if (r() < 0.02 && av === '3.5.0') out.push({ t: 'error', ts: t0 - i * 6e4 + 4000, u, pf: 'android', av, fatal: true, msg: "TypeError: Cannot read property 'avatarUrl' of undefined", stack: "TypeError: Cannot read property 'avatarUrl' of undefined\n    at ProfileHeader (src/screens/Profile.tsx:42:18)\n    at renderWithHooks (node_modules/react/cjs/react.js:1)", name: 'Profile' });
			if (r() < 0.012) out.push({ t: 'error', ts: t0 - i * 6e4 + 5000, u, pf, av, msg: 'Network request failed', stack: 'Error: Network request failed\n    at syncWorkouts (src/lib/sync.ts:88:11)', name: 'Home' });
			if (r() < 0.004) out.push({ t: 'error', ts: t0 - i * 6e4 + 6000, u, pf: 'ios', av, msg: 'StoreKit: purchase cancelled by system (code 2)', stack: 'SKErrorDomain 2\n    at PaywallView.purchase (Paywall.swift:120)', name: 'Paywall' });
		}
	}
	return out;
}
