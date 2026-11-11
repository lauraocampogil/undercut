import { redirect } from '@sveltejs/kit';
import { getMetrics } from '#lib/server/google.ts';
import { hasWeb } from '#lib/server/store.ts';

export const load = async ({ parent, url }) => {
	const { client } = await parent();
	if (!hasWeb(client)) redirect(307, `/app/clients/${client.id}`);
	const days = [7, 28, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 28;
	return { days, metrics: await getMetrics(client, days) };
};
