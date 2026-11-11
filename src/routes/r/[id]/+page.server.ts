import { error } from '@sveltejs/kit';
import { getAgency, getClient } from '#lib/server/store.ts';
import { getClientOverview } from '#lib/server/overview.ts';
import { aiSummary } from '#lib/server/insights.ts';
import { dateRange } from '#lib/server/demo.ts';

// White-label report the agency sends to its client. MVP: public link; production: signed share token.
export const load = async ({ params, url }) => {
	const client = getClient(params.id);
	if (!client) error(404, 'Report not found');
	const days = [7, 28, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 28;
	const o = await getClientOverview(client, days);
	const insights = o.tasks.filter((t) => !t.done);
	const summary = o.metrics
		? await aiSummary(client, o.metrics, insights)
		: { text: `${o.app?.active.total.toLocaleString('en') ?? 0} people used your app in the last ${days} days, and ${o.app?.crashFree ?? 0}% of them never saw a crash.`, ai: false };
	return { agency: getAgency(), client, range: o.metrics?.range ?? o.app?.range ?? dateRange(days), metrics: o.metrics, app: o.app, audit: o.audit ? { score: o.audit.score } : null, insights, summary };
};
