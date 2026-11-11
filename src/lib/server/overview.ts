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

export type AreaKey = 'traffic' | 'search' | 'seo' | 'maps' | 'behaviour' | 'app';
export type AreaTile = { key: AreaKey; label: string; href: string; level: Level; value: string; sub: string; delta?: number; deltaInvert?: boolean; open: number };
export type Task = Insight & { done: boolean };

const AREA_OF: Record<Insight['area'], AreaKey> = {
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

	const extra: Draft[] = [...(audit ? seoTasks(audit, fixedIssues(client.id)) : []), ...(heat ? behaviourTasks(heat) : []), ...(app ? appTasks(app) : [])];
	const insights = metrics ? buildInsights(metrics, null, extra) : sortInsights(withIds(extra));
	const done = getDone(client.id);
	const tasks: Task[] = insights.map((i) => ({ ...i, done: Boolean(done[i.id]) }));
	const open = (key: AreaKey) => tasks.filter((t) => AREA_OF[t.area] === key && !t.done && t.level !== 'good');
	const level = (key: AreaKey) => worst(open(key).map((t) => t.level));

	const base = `/app/clients/${client.id}`;
	const areas: AreaTile[] = [];
	if (metrics) {
		areas.push({ key: 'traffic', label: 'Traffic', href: `${base}/traffic`, level: level('traffic'), value: metrics.visits.total.toLocaleString('en-US'), sub: 'visits', delta: pct(metrics.visits.total, metrics.visits.prev), open: open('traffic').length });
		areas.push({ key: 'search', label: 'Google Search', href: `${base}/search`, level: level('search'), value: `#${metrics.search.position}`, sub: `${metrics.search.clicks.toLocaleString('en-US')} clicks`, delta: +(metrics.search.position - metrics.search.prevPosition).toFixed(1), deltaInvert: true, open: open('search').length });
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
	if (app) areas.push({ key: 'app', label: 'App', href: `${base}/app`, level: level('app'), value: app.active.total.toLocaleString('en-US'), sub: `active users · ${app.crashFree}% crash-free`, delta: pct(app.active.total, app.active.prev), open: open('app').length });

	return { metrics, audit, heat, app, tasks, areas, health: healthScore(tasks.filter((t) => !t.done)) };
}
