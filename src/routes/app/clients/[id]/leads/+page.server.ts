import { redirect } from '@sveltejs/kit';
import * as env from '$app/env/private';
import { hasWeb } from '#lib/server/store.ts';
import { getLeads } from '#lib/server/leads.ts';

export const load = async ({ parent, url }) => {
	const { client } = await parent();
	if (!hasWeb(client)) redirect(307, `/app/clients/${client.id}`);
	const days = [7, 28, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 28;
	const base = env.PUBLIC_BASE_URL || url.origin;
	return { days, leads: getLeads(client, days), snippet: `<script defer src="${base}/u.js" data-site="${client.id}"></script>` };
};
