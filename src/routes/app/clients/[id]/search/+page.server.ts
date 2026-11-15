import { getMetrics, getSearchConsole } from '#lib/server/google.ts';

export const load = async ({ parent, url }) => {
	const { client } = await parent();
	const days = [7, 28, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 28;
	const [gsc, metrics] = await Promise.all([getSearchConsole(client, days), getMetrics(client, days)]);
	// Opportunities: where a small change brings the most clicks
	// small sites: the minimum number of impressions scales with the site's traffic
	const min = Math.max(3, Math.min(30, Math.round(gsc.totals.impressions * 0.02)));
	const page2 = gsc.queries.filter((q) => q.position > 10 && q.position <= 20 && q.impressions >= min).sort((a, b) => b.impressions - a.impressions).slice(0, 6);
	const almostTop = gsc.queries.filter((q) => q.position > 3 && q.position <= 10 && q.impressions >= min).sort((a, b) => b.impressions - a.impressions).slice(0, 6);
	const lowCtr = gsc.queries.filter((q) => q.position <= 5 && q.impressions >= min * 2 && q.ctr < 0.03).sort((a, b) => b.impressions - a.impressions).slice(0, 6);
	return { days, gsc, maps: metrics.maps, mapsSource: metrics.sources.gbp, gbpLinked: Boolean(client.google.gbpLocation), mapsError: metrics.errors.find((e) => /business|mybusiness/i.test(e)) ?? null, opportunities: { page2, almostTop, lowCtr } };
};
