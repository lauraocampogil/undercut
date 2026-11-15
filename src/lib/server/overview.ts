// One place that gathers everything about a client and turns it into:
// - area tiles (Traffic, Search, SEO, Maps, Behaviour, Tracking, App) with a status each
// - one prioritised task list (insights from every area), with the agency's ticks
import type { Client, Insight, Level, Metrics } from '#lib/types.ts';
import { getMetrics } from './google.ts';
import { buildInsights, healthScore, sortInsights, withIds, type Draft } from './insights.ts';
import { getSeoAudit, seoTasks, type SeoAudit } from './seo-audit.ts';
import { getHeatmap, behaviourTasks, type HeatmapData } from './tracking.ts';
import { getAppMetrics, appTasks, type AppMetrics } from './app-analytics.ts';
import { getDone, hasApp, hasWeb } from './store.ts';
import { fixedIssues } from './fixes.ts';
import { getLeads, leadsTasks, type LeadsReport } from './leads.ts';

export type AreaKey = 'leads' | 'traffic' | 'search' | 'seo' | 'maps' | 'behaviour' | 'app';
export type AreaTile = { key: AreaKey; label: string; href: string; level: Level; value: string; sub: string; delta?: number; deltaInvert?: boolean; open: number };
export type Task = Insight & { done: boolean };

const AREA_OF: Record<Insight['area'], AreaKey> = {
	Leads: 'leads',
	Traffic: 'traffic',
	Conversions: 'traffic',
	'Google Search': 'search',
	'Google Maps': 'maps',
	SEO: 'seo',
	Sitemap: 'seo',
	Tracking: 'seo',
	Behaviour: 'behaviour',
	App: 'app'
};

const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : 0);
const worst = (levels: Level[]): Level => (levels.includes('bad') ? 'bad' : levels.includes('warn') ? 'warn' : 'good');

export type ClientOverview = {
	metrics: Metrics | null;
	leads: LeadsReport | null;
	audit: SeoAudit | null;
	heat: HeatmapData | null;
	app: AppMetrics | null;
	tasks: Task[];
	areas: AreaTile[];
	health: { score: number; level: Level };
};

export async function getClientOverview(client: Client, days = 28): Promise<ClientOverview> {
	const web = hasWeb(client);
	const [metrics, audit, app] = await Promise.all([
		web ? getMetrics(client, days) : Promise.resolve(null),
		web ? getSeoAudit(client).catch(() => null) : Promise.resolve(null),
		hasApp(client) ? getAppMetrics(client, days) : Promise.resolve(null)
	]);
	const heat = web ? getHeatmap(client, '/', 'mobile', days) : null;
	const leads = web ? getLeads(client, days) : null;

	const extra: Draft[] = [...(leads ? leadsTasks(leads) : []), ...(audit ? seoTasks(audit, fixedIssues(client.id)) : []), ...(heat ? behaviourTasks(heat) : []), ...(app ? appTasks(app) : [])];
	const insights = metrics ? buildInsights(metrics, null, extra) : sortInsights(withIds(extra));
	const done = getDone(client.id);
	const tasks: Task[] = insights.map((i) => ({ ...i, done: Boolean(done[i.id]) }));
	const open = (key: AreaKey) => tasks.filter((t) => AREA_OF[t.area] === key && !t.done && t.level !== 'good');
	const level = (key: AreaKey) => worst(open(key).map((t) => t.level));

	const base = `/app/clients/${client.id}`;
	const areas: AreaTile[] = [];
	if (leads) areas.push({ key: 'leads', label: 'Leads', href: `${base}/leads`, level: level('leads'), value: leads.source === 'waiting' ? '—' : String(leads.totals.leads), sub: leads.source === 'waiting' ? 'install the snippet' : 'forms, calls, emails', delta: leads.source === 'waiting' ? undefined : pct(leads.totals.leads, leads.totals.prev), open: open('leads').length });
	if (metrics) {
		const measuring = metrics.sources.ga4 === 'google' || metrics.sources.ga4 === 'demo' || metrics.visits.total > 0 || metrics.visits.prev > 0;
		areas.push(
			measuring
				? { key: 'traffic', label: 'Traffic', href: `${base}/traffic`, level: level('traffic'), value: metrics.visits.total.toLocaleString('en-US'), sub: 'visits', delta: pct(metrics.visits.total, metrics.visits.prev), open: open('traffic').length }
				: { key: 'traffic', label: 'Traffic', href: `${base}/settings`, level: 'warn', value: '—', sub: 'install the snippet or link GA4', open: open('traffic').length }
		);
		const gscOn = metrics.sources.gsc !== 'off' && metrics.search.position > 0;
		areas.push(
			gscOn
				? { key: 'search', label: 'Google Search', href: `${base}/search`, level: level('search'), value: `#${metrics.search.position}`, sub: `${metrics.search.clicks.toLocaleString('en-US')} clicks`, delta: metrics.search.prevPosition ? +(metrics.search.position - metrics.search.prevPosition).toFixed(1) : undefined, deltaInvert: true, open: open('search').length }
				: { key: 'search', label: 'Google Search', href: metrics.sources.gsc === 'off' ? `${base}/settings` : `${base}/search`, level: metrics.sources.gsc === 'off' ? 'warn' : level('search'), value: '—', sub: metrics.sources.gsc === 'off' ? 'link Search Console' : 'no searches yet', open: open('search').length }
		);
	}
	if (audit) areas.push({ key: 'seo', label: 'SEO health', href: `${base}/seo`, level: level('seo'), value: `${audit.score}`, sub: `/100 · ${audit.issues.length} issues`, open: open('seo').length });
	if (metrics?.maps) {
		const a = metrics.maps.calls + metrics.maps.directions + metrics.maps.websiteClicks;
		areas.push({ key: 'maps', label: 'Google Maps', href: `${base}/search#maps`, level: level('maps'), value: a.toLocaleString('en-US'), sub: 'calls, routes, clicks', delta: pct(a, metrics.maps.prevTotal), open: open('maps').length });
	}
	if (heat)
		areas.push({
			key: 'behaviour',
			label: 'Behaviour',
			href: `${base}/heatmaps`,
			level: heat.installed ? level('behaviour') : 'warn',
			value: heat.installed ? `${heat.reach[9]}%` : '—',
			sub: heat.installed ? 'reach mid-page (mobile)' : 'install the tracking snippet',
			open: open('behaviour').length
		});
	if (app)
		areas.push(
			app.source.usage === 'google' || app.source.usage === 'demo'
				? { key: 'app', label: 'App', href: `${base}/app`, level: level('app'), value: app.active.total.toLocaleString('en-US'), sub: `active users · ${app.crashFree}% crash-free`, delta: pct(app.active.total, app.active.prev), open: open('app').length }
				: { key: 'app', label: 'App', href: `${base}/settings`, level: 'warn', value: app.store.ios ? `${app.store.ios.rating}★` : '—', sub: app.store.ios ? `${app.store.ios.count} ratings · link GA4 for usage` : 'link GA4 / Firebase', open: open('app').length }
		);

	return { metrics, leads, audit, heat, app, tasks, areas, health: healthScore(tasks.filter((t) => !t.done)) };
}
