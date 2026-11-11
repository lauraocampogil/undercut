import { error } from '@sveltejs/kit';
import { getClient } from '#lib/server/store.ts';

export const load = ({ params }) => {
	const client = getClient(params.id);
	if (!client) error(404, 'Client not found');
	return { client };
};
