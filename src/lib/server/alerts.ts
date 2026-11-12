// Alerts instead of dashboards: Undercut watches every client and sends a message only when
// something needs the agency — by email (Resend) and/or Slack, plus a bell in the app.
// Runs daily from /api/cron (Vercel Cron) or with "Check now" in Settings → Alerts.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as env from '$app/env/private';
import type { AlertRule, Client, Level } from '#lib/types.ts';
import { getAgency, listClients, hasApp, hasWeb } from './store.ts';
import { getLeads } from './leads.ts';
import { getMetrics } from './google.ts';
import { getSeoAudit } from './seo-audit.ts';
import { getAppMetrics } from './app-analytics.ts';
import { explain } from './why.ts';
import { getClientOverview } from './overview.ts';

export type Alert = { id: string; clientId: string; clientName: string; rule: AlertRule; level: Level; title: string; detail: string; href: string; createdAt: string; read: boolean; sentTo: string[] };

export const RULES: { id: AlertRule; label: string; help: string }[] = [
	{ id: 'leads_drop', label: 'Leads drop', help: 'Leads down 30%+ week over week (with the channel responsible)' },
	{ id: 'no_leads', label: 'No leads', help: 'Zero leads in 7 days while there were some before' },
	{ id: 'traffic_drop', label: 'Traffic drop', help: 'Visits down 30%+ week over week' },
	{ id: 'site_down', label: 'Site down', help: 'Homepage does not answer or returns an error' },
	{ id: 'console_errors', label: 'JavaScript errors', help: 'New errors in the browser console' },
	{ id: 'seo_drop', label: 'SEO health drop', help: 'SEO score falls 10 points or more' },
	{ id: 'app_crashes', label: 'App crashes', help: 'Crash-free users below 99%' },
	{ id: 'bad_reviews', label: 'Bad reviews', help: 'New 1–2★ app store reviews' }
];

const FILE = join(process.cwd(), '.data', 'alerts.json');
const STATE = join(process.cwd(), '.data', 'alerts-state.json');
const readJson = <T>(f: string, d: T): T => {
	if (!existsSync(f)) return d;
	try {
		return JSON.parse(readFileSync(f, 'utf8'));
	} catch {
		return d;
	}
};
const writeJson = (f: string, v: unknown) => {
	mkdirSync(join(process.cwd(), '.data'), { recursive: true });
	writeFileSync(f, JSON.stringify(v, null, 2));
};

export const listAlerts = (): Alert[] => readJson<Alert[]>(FILE, []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export const unreadCount = () => listAlerts().filter((a) => !a.read).length;
export function markAllRead() {
	writeJson(FILE, listAlerts().map((a) => ({ ...a, read: true })));
}

const week = () => {
	const d = new Date();
	const onejan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	return `${d.getUTCFullYear()}-w${Math.ceil(((d.getTime() - onejan.getTime()) / 864e5 + onejan.getUTCDay() + 1) / 7)}`;
};

async function checkClient(c: Client, enabled: (r: AlertRule) => boolean, state: Record<string, number>) {
	const found: Omit<Alert, 'id' | 'createdAt' | 'read' | 'sentTo' | 'clientId' | 'clientName'>[] = [];
	const base = `/app/clients/${c.id}`;
	if (hasWeb(c)) {
		const leads = getLeads(c, 7);
		if (leads.source !== 'waiting') {
			const pct = leads.totals.prev ? Math.round(((leads.totals.leads - leads.totals.prev) / leads.totals.prev) * 100) : 0;
			if (enabled('no_leads') && leads.totals.leads === 0 && leads.totals.prev > 0)
				found.push({ rule: 'no_leads', level: 'bad', title: 'No leads in 7 days', detail: `There were ${leads.totals.prev} the week before. Check the contact form and phone link still work.`, href: `${base}/leads` });
			else if (enabled('leads_drop') && pct <= -30 && leads.totals.prev >= 3) {
				const why = await explain(c, 'leads', 7);
				found.push({ rule: 'leads_drop', level: 'bad', title: `Leads down ${Math.abs(pct)}% this week`, detail: why.sentence, href: `${base}/leads` });
			}
		}
		const m = await getMetrics(c, 7);
		const vp = m.visits.prev ? Math.round(((m.visits.total - m.visits.prev) / m.visits.prev) * 100) : 0;
		if (enabled('traffic_drop') && vp <= -30) {
			const why = await explain(c, 'visits', 7);
			found.push({ rule: 'traffic_drop', level: 'warn', title: `Visits down ${Math.abs(vp)}% this week`, detail: why.sentence, href: `${base}/traffic` });
		}
		if (enabled('site_down') && !c.demo && c.domain) {
			const status = await fetch(c.domain, { signal: AbortSignal.timeout(10_000), redirect: 'follow' }).then((r) => r.status).catch(() => 0);
			if (status === 0 || status >= 500) found.push({ rule: 'site_down', level: 'bad', title: 'The website is down', detail: status ? `The homepage answers with error ${status}.` : 'The homepage does not answer (timeout or DNS).', href: c.domain });
		}
		const audit = await getSeoAudit(c).catch(() => null);
		if (audit) {
			const prevScore = state[`seo:${c.id}`];
			if (enabled('seo_drop') && prevScore !== undefined && prevScore - audit.score >= 10)
				found.push({ rule: 'seo_drop', level: 'warn', title: `SEO health fell from ${prevScore} to ${audit.score}`, detail: audit.issues[0] ? `Main issue: ${audit.issues[0].title}.` : '', href: `${base}/seo` });
			state[`seo:${c.id}`] = audit.score;
			const n = audit.console?.items.length ?? 0;
			if (enabled('console_errors') && n > (state[`console:${c.id}`] ?? 0))
				found.push({ rule: 'console_errors', level: 'warn', title: `${n} JavaScript error${n > 1 ? 's' : ''} on the site`, detail: audit.console!.items[0].message, href: `${base}/seo` });
			state[`console:${c.id}`] = n;
		}
	}
	if (hasApp(c)) {
		const a = await getAppMetrics(c, 7);
		if (enabled('app_crashes') && a.crashFree < 99) found.push({ rule: 'app_crashes', level: 'bad', title: `App crash-free users at ${a.crashFree}%`, detail: `Latest version ${a.versions[0]?.version ?? ''}. Good apps stay above 99.5%.`, href: `${base}/app` });
		const bad = a.store.reviews.filter((r) => r.stars <= 2);
		if (enabled('bad_reviews') && bad.length) found.push({ rule: 'bad_reviews', level: 'warn', title: `${bad.length} negative review${bad.length > 1 ? 's' : ''}`, detail: `“${bad[0].title}” (${bad[0].platform}, ${bad[0].stars}★)`, href: `${base}/app` });
	}
	return found;
}

async function deliver(alerts: Alert[], subject: string, html: string, text: string) {
	const a = getAgency().alerts ?? {};
	const sent: string[] = [];
	if (a.slackWebhook) {
		const ok = await fetch(a.slackWebhook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(10_000) }).then((r) => r.ok).catch(() => false);
		if (ok) sent.push('slack');
	}
	if (a.email && env.RESEND_API_KEY) {
		const ok = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
			body: JSON.stringify({ from: env.ALERTS_FROM || 'Undercut <onboarding@resend.dev>', to: a.email.split(',').map((x) => x.trim()), subject, html }),
			signal: AbortSignal.timeout(10_000)
		}).then((r) => r.ok).catch(() => false);
		if (ok) sent.push('email');
	}
	for (const al of alerts) al.sentTo = sent;
	return sent;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Daily check. Each alert fires once per client, rule and week. */
export async function runAlerts(origin = '') {
	const agency = getAgency();
	const rules = agency.alerts?.rules ?? {};
	const enabled = (r: AlertRule) => rules[r] !== false;
	const state = readJson<Record<string, number>>(STATE, {});
	const existing = listAlerts();
	const fresh: Alert[] = [];
	for (const c of listClients()) {
		for (const f of await checkClient(c, enabled, state)) {
			const id = `${c.id}:${f.rule}:${week()}`;
			if (existing.some((e) => e.id === id)) continue;
			fresh.push({ ...f, id, clientId: c.id, clientName: c.name, createdAt: new Date().toISOString(), read: false, sentTo: [] });
		}
	}
	writeJson(STATE, state);
	if (fresh.length) {
		const text = `🔔 Undercut — ${fresh.length} alert${fresh.length > 1 ? 's' : ''}\n` + fresh.map((a) => `• ${a.clientName}: ${a.title} — ${a.detail} ${a.href.startsWith('/') ? origin + a.href : a.href}`).join('\n');
		const html = `<div style="font-family:system-ui,sans-serif"><h2>${fresh.length} thing${fresh.length > 1 ? 's' : ''} need${fresh.length > 1 ? '' : 's'} you</h2>${fresh.map((a) => `<p><b>${esc(a.clientName)} — ${esc(a.title)}</b><br>${esc(a.detail)}<br><a href="${esc(a.href.startsWith('/') ? origin + a.href : a.href)}">Open in Undercut →</a></p>`).join('')}</div>`;
		await deliver(fresh, `Undercut: ${fresh[0].clientName} — ${fresh[0].title}${fresh.length > 1 ? ` (+${fresh.length - 1})` : ''}`, html, text);
		writeJson(FILE, [...fresh, ...existing].slice(0, 300));
	}
	return fresh;
}

/** Monday summary: one line per client, ready to forward. */
export async function weeklyDigest(origin = '') {
	const rows = await Promise.all(
		listClients().map(async (c) => {
			const o = await getClientOverview(c, 7);
			const top = o.tasks.find((t) => !t.done && t.level !== 'good');
			const leads = o.leads && o.leads.source !== 'waiting' ? `${o.leads.totals.leads} leads (${o.leads.totals.prev ? Math.round(((o.leads.totals.leads - o.leads.totals.prev) / o.leads.totals.prev) * 100) : 0}%)` : o.app ? `${o.app.active.total} app users` : '';
			return { c, score: o.health.score, leads, top };
		})
	);
	rows.sort((a, b) => a.score - b.score);
	const text = `📊 Undercut weekly summary\n` + rows.map((r) => `• ${r.c.name} — ${r.score}/100 · ${r.leads}${r.top ? ` · Next: ${r.top.title}` : ''}`).join('\n');
	const html = `<div style="font-family:system-ui,sans-serif"><h2>Your clients this week</h2><table cellpadding="6">${rows.map((r) => `<tr><td><b>${esc(r.c.name)}</b></td><td>${r.score}/100</td><td>${esc(r.leads)}</td><td>${r.top ? esc(r.top.title) : 'All good'}</td><td><a href="${origin}/app/clients/${r.c.id}">Open</a></td></tr>`).join('')}</table></div>`;
	const sent = await deliver([], 'Undercut — your clients this week', html, text);
	return { sent, text };
}

export async function sendTest() {
	return deliver([], 'Undercut test alert', '<p>Alerts are working ✓</p>', '✅ Undercut test alert — alerts are working.');
}
