// Goals per client: "100 visits a day", "30 leads a month", "€10k MRR"…
// Undercut measures where the client stands today from real sources, projects when the goal will be reached at the
// current pace, works out what it takes (the funnel math), and turns it into concrete next actions from the
// client's own data (quick-win keywords, leaking pages, paywall, campaigns…).
import * as env from '$app/env/private';
import type { Client, Point } from '#lib/types.ts';
import { readData, writeData, hasApp, hasWeb } from './store.ts';
import { getMetrics, getSearchConsole } from './google.ts';
import { getLeads } from './leads.ts';
import { getErrors, getPaywall } from './app-events.ts';

export type GoalMetric = 'visits_day' | 'leads_month' | 'search_clicks_month' | 'mrr' | 'app_revenue_month' | 'conversion_rate';
export type Goal = { id: string; metric: GoalMetric; target: number; deadline: string; createdAt: string; startValue?: number; note?: string };
type GoalFile = { goals: Goal[]; stripeKey?: string; mrrManual?: { value: number; at: string }[]; arpu?: number };

export const METRICS: Record<GoalMetric, { label: string; unit: string; money?: boolean; help: string; web?: boolean; app?: boolean }> = {
	visits_day: { label: 'Visits per day', unit: 'visits/day', help: 'Average of the last 7 days (Undercut snippet or GA4).', web: true },
	leads_month: { label: 'Leads per month', unit: 'leads/month', help: 'Forms, calls, emails and WhatsApp in the last 30 days.', web: true },
	search_clicks_month: { label: 'Google clicks per month', unit: 'clicks/month', help: 'Clicks from Google Search in the last 28 days (Search Console).', web: true },
	conversion_rate: { label: 'Visit → lead rate', unit: '%', help: 'Share of visits that become a lead (last 30 days).', web: true },
	mrr: { label: 'MRR', unit: '€/month', money: true, help: 'Monthly recurring revenue from Stripe (read-only key) or updated by hand.' },
	app_revenue_month: { label: 'App revenue per month', unit: '€/month', money: true, help: 'Purchases sent by the Undercut app SDK in the last 30 days.', app: true }
};

const file = (id: string) => `goals-${id}.json`;
export function goalFile(client: Client): GoalFile {
	return readData<GoalFile>(file(client.id), { goals: [] });
}
export function saveGoalFile(client: Client, g: GoalFile) {
	writeData(file(client.id), g);
}

// ---------- Stripe MRR (restricted, read-only key of the client) ----------
const monthly = (amount: number, interval: string, count: number) => (interval === 'year' ? amount / 12 / count : interval === 'week' ? (amount * 52) / 12 / count : interval === 'day' ? (amount * 365) / 12 / count : amount / count);
export async function stripeMrr(key: string): Promise<{ mrr: number; customers: number; currency: string } | { error: string }> {
	let mrr = 0;
	let customers = 0;
	let currency = 'eur';
	let after = '';
	try {
		for (let page = 0; page < 20; page++) {
			const r = await fetch(`https://api.stripe.com/v1/subscriptions?status=active&limit=100${after ? `&starting_after=${after}` : ''}`, { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000) });
			const j = await r.json();
			if (!r.ok) return { error: j.error?.message ?? `Stripe answered ${r.status}` };
			for (const s of j.data ?? []) {
				customers++;
				for (const it of s.items?.data ?? []) {
					const p = it.price ?? it.plan;
					if (!p?.recurring && !p?.interval) continue;
					currency = p.currency ?? currency;
					const amount = ((p.unit_amount ?? p.amount ?? 0) * (it.quantity ?? 1)) / 100;
					mrr += monthly(amount, p.recurring?.interval ?? p.interval, p.recurring?.interval_count ?? p.interval_count ?? 1);
				}
				const off = s.discount?.coupon?.percent_off;
				if (off) mrr -= 0; // discounts kept simple: list price
			}
			if (!j.has_more) break;
			after = j.data.at(-1).id;
		}
		return { mrr: Math.round(mrr), customers, currency: currency.toUpperCase() };
	} catch (e) {
		return { error: (e as Error).message };
	}
}

// ---------- progress ----------
export type GoalProgress = {
	goal: Goal;
	label: string;
	unit: string;
	money: boolean;
	current: number | null;
	source: string;
	pct: number;
	series: Point[]; // weekly values, oldest first
	weeklyGrowth: number | null; // % per week at the current pace
	eta: string | null; // date the goal is reached at the current pace
	neededGrowth: number | null; // % per week needed to hit the deadline
	status: 'reached' | 'on_track' | 'behind' | 'no_data';
	math: string[]; // the funnel: what it takes
	actions: { title: string; why: string; href?: string; impact?: string }[];
	error?: string;
};

const weeksBetween = (a: Date, b: Date) => Math.max(0.1, (b.getTime() - a.getTime()) / (7 * 864e5));
const fmt = (n: number, money = false) => (money ? `€${Math.round(n).toLocaleString('en-US')}` : n >= 100 ? Math.round(n).toLocaleString('en-US') : String(+n.toFixed(1)));

function weekly(daily: Point[], agg: 'avg' | 'sum') {
	const out: Point[] = [];
	for (let i = daily.length; i > 0; i -= 7) {
		const w = daily.slice(Math.max(0, i - 7), i);
		if (w.length < 4) continue;
		const s = w.reduce((t, p) => t + p.value, 0);
		out.unshift({ date: w[0].date, value: agg === 'avg' ? s / w.length : (s / w.length) * 30 });
	}
	return out;
}
/** Compound weekly growth from a weekly series (ignores empty weeks at the start). */
function growth(series: Point[]) {
	const s = series.filter((p, i) => p.value > 0 || i > series.findIndex((x) => x.value > 0));
	if (s.length < 3 || s[0].value <= 0) return null;
	const g = Math.pow(s.at(-1)!.value / s[0].value, 1 / (s.length - 1)) - 1;
	return Number.isFinite(g) ? Math.round(g * 1000) / 10 : null;
}

export async function goalProgress(client: Client, goal: Goal): Promise<GoalProgress> {
	const m = METRICS[goal.metric];
	const gf = goalFile(client);
	const base = `/app/clients/${client.id}`;
	let current: number | null = null;
	let series: Point[] = [];
	let source = '';
	let error: string | undefined;
	const math: string[] = [];
	const actions: GoalProgress['actions'] = [];

	const [metrics, leads] = hasWeb(client) && ['visits_day', 'leads_month', 'conversion_rate', 'mrr', 'search_clicks_month'].includes(goal.metric) ? await Promise.all([getMetrics(client, 90).catch(() => null), Promise.resolve(getLeads(client, 90))]) : [null, null];
	const leads30 = hasWeb(client) ? getLeads(client, 30) : null;
	const visits30 = metrics ? metrics.visits.daily.slice(-30).reduce((s, p) => s + p.value, 0) : 0;
	const conv = leads30 && visits30 ? leads30.totals.leads / visits30 : null;

	if (goal.metric === 'visits_day' && metrics) {
		const d = metrics.visits.daily;
		current = d.slice(-7).reduce((s, p) => s + p.value, 0) / Math.max(1, Math.min(7, d.length));
		series = weekly(d, 'avg');
		source = metrics.sources.ga4 === 'google' ? 'Google Analytics' : 'Undercut snippet';
	} else if (goal.metric === 'leads_month' && leads) {
		current = leads30?.totals.leads ?? 0;
		series = weekly(leads.daily, 'sum');
		source = 'Undercut snippet';
	} else if (goal.metric === 'conversion_rate' && leads30) {
		current = conv != null ? Math.round(conv * 1000) / 10 : null;
		source = 'Undercut snippet';
	} else if (goal.metric === 'search_clicks_month') {
		const g = await getSearchConsole(client, 90).catch(() => null);
		if (g && g.source !== 'off') {
			current = g.daily.slice(-28).reduce((s, p) => s + p.clicks, 0);
			series = weekly(g.daily.map((p) => ({ date: p.date, value: p.clicks })), 'sum');
			source = 'Search Console';
		} else error = 'Link Search Console in Setup to measure Google clicks.';
	} else if (goal.metric === 'app_revenue_month' && hasApp(client)) {
		const r = getPaywall(client, 90);
		current = getPaywall(client, 30).totals.revenue;
		series = weekly(r.daily, 'sum');
		source = r.source === 'waiting' ? '' : 'Undercut app SDK';
		if (r.source === 'waiting') error = 'Add the Undercut SDK to the app (Paywall page) to measure purchases.';
	} else if (goal.metric === 'mrr') {
		if (gf.stripeKey) {
			const s = await stripeMrr(gf.stripeKey);
			if ('error' in s) error = `Stripe: ${s.error}`;
			else {
				current = s.mrr;
				source = `Stripe · ${s.customers} active subscriptions`;
				const hist = (gf.mrrManual ?? []).filter((x) => x.at.slice(0, 10) !== new Date().toISOString().slice(0, 10));
				gf.mrrManual = [...hist, { value: s.mrr, at: new Date().toISOString() }].slice(-60);
				gf.arpu = s.customers ? s.mrr / s.customers : gf.arpu;
				saveGoalFile(client, gf);
			}
		}
		if (current == null && gf.mrrManual?.length) {
			current = gf.mrrManual.at(-1)!.value;
			source = source || 'Updated by hand';
		}
		series = (gf.mrrManual ?? []).map((x) => ({ date: x.at.slice(0, 10), value: x.value }));
		if (current == null && !error) error = 'Connect Stripe (read-only key) or type the current MRR.';
	}

	const target = goal.target;
	const pct = current != null && target ? Math.min(100, Math.round((current / target) * 100)) : 0;
	const g = growth(series);
	const now = new Date();
	const deadline = new Date(goal.deadline + 'T23:59:59');
	const weeksLeft = weeksBetween(now, deadline);
	const neededGrowth = current && current > 0 && current < target ? Math.round((Math.pow(target / current, 1 / weeksLeft) - 1) * 1000) / 10 : null;
	let eta: string | null = null;
	if (current != null && current >= target) eta = now.toISOString().slice(0, 10);
	else if (current && g && g > 0) eta = new Date(now.getTime() + (Math.log(target / current) / Math.log(1 + g / 100)) * 7 * 864e5).toISOString().slice(0, 10);
	const status: GoalProgress['status'] = current == null ? 'no_data' : current >= target ? 'reached' : eta && eta <= goal.deadline ? 'on_track' : 'behind';

	// ---- the math: what it takes ----
	const convPct = conv != null && conv > 0 ? conv : null;
	if (current != null && current >= target) math.push(`Goal reached: ${fmt(current, Boolean(m.money))} for a target of ${fmt(target, Boolean(m.money))}. Set a bigger one?`);
	else if (goal.metric === 'visits_day' && current != null) {
		math.push(`You need ${fmt(target - current)} more visits a day (×${(target / Math.max(1, current)).toFixed(1)}).`);
		if (convPct) math.push(`At your ${(convPct * 100).toFixed(1)}% visit→lead rate, ${fmt(target)} visits/day ≈ ${fmt(target * 30 * convPct)} leads a month.`);
	}
	if (goal.metric === 'leads_month' && current != null && current < target) {
		if (convPct) math.push(`At ${(convPct * 100).toFixed(1)}% conversion you need ≈ ${fmt(target / convPct / 30)} visits a day (today ${fmt(visits30 / 30)}).`, `Or keep the traffic and raise conversion to ${((target / Math.max(1, visits30)) * 100).toFixed(1)}%.`);
		else math.push('Not enough visits yet to know the conversion rate — install the snippet and wait a week.');
	}
	if (goal.metric === 'mrr' && current != null && current < target) {
		const arpu = gf.arpu && gf.arpu > 0 ? gf.arpu : null;
		if (arpu) {
			const need = Math.ceil((target - current) / arpu);
			math.push(`At ${fmt(arpu, true)} per customer you need ${need} more paying customers (${Math.ceil(target / arpu)} in total).`);
			const perWeek = Math.ceil(need / weeksLeft);
			math.push(`That is about ${perWeek} new customer${perWeek > 1 ? 's' : ''} a week until ${goal.deadline}.`);
			if (convPct) math.push(`If ${(convPct * 100).toFixed(1)}% of visits become a lead and 1 lead in 5 pays: ≈ ${fmt((perWeek * 5) / convPct / 7)} visits a day.`);
		} else math.push('Add the price per customer (ARPU) to see how many customers it takes.');
	}
	if (goal.metric === 'app_revenue_month' && current != null && current < target) {
		const pw = getPaywall(client, 30);
		const avg = pw.totals.purchases ? pw.totals.revenue / pw.totals.purchases : 0;
		if (avg) math.push(`At ${fmt(avg, true)} per purchase: ${Math.ceil((target - current) / avg)} more purchases a month.`, `At ${pw.totals.conv}% paywall conversion that means ≈ ${fmt((target - current) / avg / Math.max(0.001, pw.totals.conv / 100))} more people seeing the paywall a month.`);
	}
	if (goal.metric === 'search_clicks_month' && current != null && current < target) math.push(`You need ${fmt(target - current)} more Google clicks a month.`);
	if (neededGrowth != null) math.push(`Needed pace: +${neededGrowth}% per week until ${goal.deadline}${g != null ? ` — current pace ${g >= 0 ? '+' : ''}${g}% per week` : ''}.`);

	// ---- next actions, from the client's own data ----
	const trafficGoal = ['visits_day', 'search_clicks_month', 'leads_month', 'mrr'].includes(goal.metric);
	if (trafficGoal && hasWeb(client)) {
		const gsc = await getSearchConsole(client, 28).catch(() => null);
		const wins = (gsc?.queries ?? []).filter((q) => q.position >= 4 && q.position <= 20).sort((a, b) => b.impressions - a.impressions).slice(0, 3);
		for (const w of wins) actions.push({ title: `Push “${w.key}” to the top 3`, why: `Seen ${w.impressions}× on Google at position ${w.position}. Reaching the top 3 usually multiplies clicks by 3–5.`, href: `${base}/keywords`, impact: `+${Math.max(1, Math.round(w.impressions * 0.12 - w.clicks))} clicks/month` });
		if (gsc?.source === 'off') actions.push({ title: 'Link Search Console', why: 'Without it Undercut cannot see which searches bring visits.', href: `${base}/settings` });
	}
	if (['leads_month', 'conversion_rate', 'mrr'].includes(goal.metric) && leads30) {
		const leak = [...leads30.byLanding].filter((l) => l.entries >= 5).sort((a, b) => b.entries - a.entries).find((l) => l.leads === 0);
		if (leak) actions.push({ title: `Add a clear call to action on ${leak.path}`, why: `${leak.entries} visits started there this month, none became a lead.`, href: `${base}/heatmaps?path=${encodeURIComponent(leak.path)}` });
		const best = [...leads30.byChannel].sort((a, b) => b.leads - a.leads)[0];
		if (best?.leads) actions.push({ title: `Do more of what works: ${best.channel}`, why: `${best.channel} brought ${best.leads} lead${best.leads > 1 ? 's' : ''} this month — the best channel.`, href: `${base}/leads` });
	}
	if (goal.metric === 'visits_day' || goal.metric === 'leads_month') actions.push({ title: 'Publish the open SEO fixes', why: 'Titles, descriptions and image texts Google can read better — live in one click.', href: `${base}/seo` });
	if (goal.metric === 'app_revenue_month' || (goal.metric === 'mrr' && hasApp(client))) {
		const pw = getPaywall(client, 30);
		if (pw.winner?.enough) actions.push({ title: `Show paywall variant “${pw.winner.best}” to everyone`, why: `It converts ${pw.winner.lift}% better.`, href: `${base}/paywall` });
		else actions.push({ title: 'A/B test the paywall', why: 'Yearly plan first or a free trial are the two tests that most often raise revenue.', href: `${base}/paywall` });
	}
	if (goal.metric === 'app_revenue_month' || (goal.metric === 'mrr' && hasApp(client))) {
		const crash = getErrors(client, 14).issues.find((i) => i.fatal && (i.status === 'open' || i.status === 'regressed'));
		if (crash) actions.push({ title: `Fix the crash “${crash.title.slice(0, 50)}”`, why: `${crash.users} people hit it in 14 days — people who crash rarely pay.`, href: `${base}/errors` });
		actions.push({ title: 'Answer the 1–2★ reviews', why: 'Ratings drive App Store ranking and downloads — reply within 48 h.', href: `${base}/store` });
	}
	if (goal.metric === 'mrr') actions.push({ title: 'Track a UTM link per campaign', why: 'See which post, newsletter or ad brings paying customers, not just visits.', href: `${base}/campaigns` });

	return { goal, label: m.label, unit: m.unit, money: Boolean(m.money), current: current == null ? null : Math.round(current * 10) / 10, source, pct, series, weeklyGrowth: g, eta, neededGrowth, status, math, actions: actions.slice(0, 5), error };
}

/** Optional: Claude turns the numbers into a short weekly coaching note. */
export async function goalCoach(client: Client, p: GoalProgress[]): Promise<string | null> {
	if (!env.ANTHROPIC_API_KEY || !p.length) return null;
	try {
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
			body: JSON.stringify({
				model: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
				max_tokens: 250,
				messages: [{ role: 'user', content: `You coach a web agency on a client goal. 3 short sentences, plain words, no markdown: where they stand, the single biggest lever, what to do this week. Use only these facts.\n\nClient: ${client.name}\n${p.map((x) => `Goal: ${x.label} ${x.goal.target} by ${x.goal.deadline}. Now: ${x.current ?? 'unknown'} (${x.pct}%). Pace ${x.weeklyGrowth ?? '?'}%/week, needed ${x.neededGrowth ?? '?'}%/week. Math: ${x.math.join(' ')} Actions: ${x.actions.map((a) => a.title + ' (' + a.why + ')').join('; ')}`).join('\n')}` }]
			})
		});
		if (!res.ok) return null;
		return (await res.json()).content?.[0]?.text?.trim() ?? null;
	} catch {
		return null;
	}
}
