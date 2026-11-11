import { redirect } from '@sveltejs/kit';
import { appTasks, getAppMetrics } from '#lib/server/app-analytics.ts';
import { hasApp } from '#lib/server/store.ts';

export const load = async ({ parent, url }) => {
	const { client } = await parent();
	if (!hasApp(client)) redirect(307, `/app/clients/${client.id}`);
	const days = [7, 28, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 28;
	const app = await getAppMetrics(client, days);
	return { days, app, tasks: appTasks(app).filter((t) => t.level !== 'good') };
};
