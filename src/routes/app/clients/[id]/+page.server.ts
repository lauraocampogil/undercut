import { getMetrics } from '#lib/server/google.ts';
import { aiSummary, buildInsights, healthScore } from '#lib/server/insights.ts';
import { sitemapFor } from '#lib/server/sitemap.ts';

export const load = async ({ parent, url }) => {
	const { client } = await parent();
	const days = [7, 28, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 28;
	const [metrics, sitemap] = await Promise.all([getMetrics(client, days), sitemapFor(client).catch(() => null)]);
	const insights = buildInsights(metrics, sitemap);
	const summary = await aiSummary(client, metrics, insights);
	return { days, metrics, sitemap, insights, health: healthScore(insights), summary };
};
