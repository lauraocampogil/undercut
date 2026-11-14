import { redirect } from '@sveltejs/kit';
import { getClient, listClients } from '#lib/server/store.ts';

// Keywords now live per client (website + app). Old links land on the right client.
export const load = ({ url }) => {
	const client = getClient(url.searchParams.get('client') ?? '') ?? listClients()[0];
	const q = url.searchParams.get('q');
	redirect(307, client ? `/app/clients/${client.id}/keywords${q ? `?q=${encodeURIComponent(q)}` : ''}` : '/app/clients/new');
};
