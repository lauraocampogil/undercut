import { error } from '@sveltejs/kit';
import { getClient, hasApp, hasWeb } from '#lib/server/store.ts';
import { autoLink } from '#lib/server/autolink.ts';

export const load = async ({ params }) => {
	const found = getClient(params.id);
	if (!found) error(404, 'Client not found');
	const client = await autoLink(found);
	return { client, web: hasWeb(client), app: hasApp(client) };
};
