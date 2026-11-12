import { error, json } from '@sveltejs/kit';
import { getClient } from '#lib/server/store.ts';
import { explain, type Metric } from '#lib/server/why.ts';

export const GET = async ({ url }) => {
	const client = getClient(url.searchParams.get('client') ?? '');
	if (!client) error(404);
	const metric = (['visits', 'leads', 'clicks'].includes(url.searchParams.get('metric') ?? '') ? url.searchParams.get('metric') : 'visits') as Metric;
	const days = [7, 28, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 28;
	return json(await explain(client, metric, days));
};
