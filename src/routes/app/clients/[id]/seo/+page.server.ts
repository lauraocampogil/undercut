import { redirect } from '@sveltejs/kit';
import { getSeoAudit } from '#lib/server/seo-audit.ts';
import { getClient, hasWeb } from '#lib/server/store.ts';

export const load = async ({ parent }) => {
	const { client } = await parent();
	if (!hasWeb(client)) redirect(307, `/app/clients/${client.id}`);
	return { audit: await getSeoAudit(client) };
};

export const actions = {
	rerun: async ({ params }) => {
		const client = getClient(params.id);
		if (client) await getSeoAudit(client, true);
		return { ok: true };
	}
};
