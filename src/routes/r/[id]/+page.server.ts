import { error } from '@sveltejs/kit';
import { getAgency, getClient, withSite } from '#lib/server/store.ts';
import { getClientOverview } from '#lib/server/overview.ts';
import { aiSummary } from '#lib/server/insights.ts';
import { dateRange } from '#lib/server/demo.ts';
import { CHANNELS, campaignStats, listCampaigns } from '#lib/server/campaigns.ts';

// White-label report the agency sends to its client. MVP: public link; production: signed share token.
export const load = async ({ params, url }) => {
	// public link: always run in the workspace that owns this client (whoever is looking)
	const r = await withSite(params.id, () => report(params.id, url));
	if (!r) error(404, 'Report not found');
	return r;
};

async function report(id: string, url: URL) {
	const client = getClient(id);
	if (!client) error(404, 'Report not found');
	const days = [7, 28, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 28;
	const o = await getClientOverview(client, days);
	const insights = o.tasks.filter((t) => !t.done);
	const summary = o.metrics
		? await aiSummary(client, o.metrics, insights)
		: { text: `${o.app?.active.total.toLocaleString('en') ?? 0} people used your app in the last ${days} days, and ${o.app?.crashFree ?? 0}% of them never saw a crash.`, ai: false };
	const range = o.metrics?.range ?? o.app?.range ?? dateRange(days);
	const only = url.searchParams.get('campaign');
	const list = listCampaigns(client).filter((c) => (only ? c.id === only : c.start <= range.end && (!c.end || c.end >= range.start)));
	const stats = list.length ? (await campaignStats(client, list)).stats : ({} as Awaited<ReturnType<typeof campaignStats>>['stats']);
	const campaigns = list.map((c) => ({ id: c.id, name: c.name, channel: CHANNELS[c.channel].label, icon: CHANNELS[c.channel].icon, start: c.start, end: c.end, budget: c.budget, goal: c.goal, stats: stats[c.id] }));
	return { campaigns, campaignOnly: Boolean(only && campaigns.length), agency: getAgency(), client, range: o.metrics?.range ?? o.app?.range ?? dateRange(days), metrics: o.metrics, app: o.app, audit: o.audit ? { score: o.audit.score } : null, insights, summary };
}
