import { getSearchConsole } from '#lib/server/google.ts';

export const load = async ({ parent, url }) => {
	const { client } = await parent();
	const days = [7, 28, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 28;
	const gsc = await getSearchConsole(client, days);
	// Opportunities: where a small change brings the most clicks
	const page2 = gsc.queries.filter((q) => q.position > 10 && q.position <= 20 && q.impressions >= 30).sort((a, b) => b.impressions - a.impressions).slice(0, 6);
	const almostTop = gsc.queries.filter((q) => q.position > 3 && q.position <= 10 && q.impressions >= 30).sort((a, b) => b.impressions - a.impressions).slice(0, 6);
	const lowCtr = gsc.queries.filter((q) => q.position <= 5 && q.impressions >= 80 && q.ctr < 0.03).sort((a, b) => b.impressions - a.impressions).slice(0, 6);
	return { days, gsc, opportunities: { page2, almostTop, lowCtr } };
};
