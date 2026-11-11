import { error } from '@sveltejs/kit';
import { getClient, hasApp, hasWeb } from '#lib/server/store.ts';

export const load = ({ params }) => {
	const client = getClient(params.id);
	if (!client) error(404, 'Client not found');
	return { client, web: hasWeb(client), app: hasApp(client) };
};
