import { listClients } from '#lib/server/store.ts';
import { getMetrics } from '#lib/server/google.ts';
import { buildInsights, healthScore } from '#lib/server/insights.ts';
import { sitemapFor } from '#lib/server/sitemap.ts';

export const load = async () => {
	const clients = listClients();
	const rows = await Promise.all(
		clients.map(async (c) => {
			const [m, sm] = await Promise.all([getMetrics(c), sitemapFor(c).catch(() => null)]);
			const insights = buildInsights(m, sm);
			const health = healthScore(insights);
			const todo = insights.filter((i) => i.level !== 'good');
			return {
				client: c,
				visits: m.visits,
				clicks: m.search.clicks,
				prevClicks: m.search.prevClicks,
				conversions: m.conversions,
				health,
				todo: todo.slice(0, 2).map((i) => i.title),
				todoCount: todo.length,
				live: Object.values(m.sources).some((s) => s === 'google')
			};
		})
	);
	rows.sort((a, b) => a.health.score - b.health.score);
	return { rows };
};
