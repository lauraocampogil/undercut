import { error } from '@sveltejs/kit';
import { getAgency, getClient } from '#lib/server/store.ts';
import { getMetrics } from '#lib/server/google.ts';
import { aiSummary, buildInsights, healthScore } from '#lib/server/insights.ts';
import { sitemapFor } from '#lib/server/sitemap.ts';

// White-label report the agency sends to its client. MVP: public link; production: signed share token.
export const load = async ({ params, url }) => {
	const client = getClient(params.id);
	if (!client) error(404, 'Report not found');
	const days = [7, 28, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 28;
	const [metrics, sitemap] = await Promise.all([getMetrics(client, days), sitemapFor(client).catch(() => null)]);
	const insights = buildInsights(metrics, sitemap);
	return {
		agency: getAgency(),
		client,
		metrics,
		insights,
		health: healthScore(insights),
		summary: await aiSummary(client, metrics, insights)
	};
};
