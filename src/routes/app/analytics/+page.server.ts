import { fail, redirect } from '@sveltejs/kit';
import { analyticsRows } from '#lib/server/analytics-rows.ts';
import { getClient } from '#lib/server/store.ts';
import { saveClient } from '#lib/server/business.ts';

export const load = async () => ({ rows: await analyticsRows() });

export const actions = {
	/** A site tracked in Analytics becomes a client record too (same client, one place). */
	addToClients: async ({ request }) => {
		const site = getClient(String((await request.formData()).get('id') ?? ''));
		if (!site) return fail(404, { error: 'Not found' });
		const c = saveClient({ name: site.name, website: site.domain || undefined, siteId: site.id, services: [] });
		redirect(303, `/app/crm/${c.id}`);
	}
};
