import { redirect } from '@sveltejs/kit';
import * as env from '$app/env/private';
import { hasApp } from '#lib/server/store.ts';
import { getPaywall, paywallTasks } from '#lib/server/app-events.ts';

export const load = async ({ parent, url }) => {
	const { client } = await parent();
	if (!hasApp(client)) redirect(307, `/app/clients/${client.id}`);
	const days = [7, 28, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 28;
	const r = getPaywall(client, days);
	return { r, tasks: paywallTasks(r), api: env.PUBLIC_BASE_URL || url.origin };
};
