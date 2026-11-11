import { error, redirect } from '@sveltejs/kit';
import { deleteClient, getClient, saveClient } from '#lib/server/store.ts';
import { googleConfigured, isConnected, listAccounts } from '#lib/server/google.ts';

export const load = async ({ params }) => {
	const client = getClient(params.id);
	if (!client) error(404, 'Client not found');
	const connected = isConnected() && googleConfigured();
	const options = connected ? await listAccounts() : null;
	return { client, connected, options };
};

export const actions = {
	save: async ({ params, request }) => {
		const client = getClient(params.id);
		if (!client) error(404);
		const f = await request.formData();
		const v = (k: string) => String(f.get(k) ?? '').trim() || undefined;
		client.name = v('name') ?? client.name;
		client.color = v('color') ?? client.color;
		client.google = {
			ga4PropertyId: v('ga4'),
			gscSiteUrl: v('gsc'),
			gbpLocation: v('gbp'),
			gtmContainer: v('gtm')
		};
		saveClient(client);
		redirect(303, `/app/clients/${client.id}`);
	},
	delete: async ({ params }) => {
		deleteClient(params.id);
		redirect(303, '/app');
	}
};
