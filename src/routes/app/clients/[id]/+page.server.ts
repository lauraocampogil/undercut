import { getClientOverview } from '#lib/server/overview.ts';
import { aiSummary } from '#lib/server/insights.ts';
import { getClient, toggleDone } from '#lib/server/store.ts';
import { goalFile, goalProgress } from '#lib/server/goals.ts';

export const load = async ({ parent, url }) => {
	const { client } = await parent();
	const days = [7, 28, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 28;
	const o = await getClientOverview(client, days);
	const open = o.tasks.filter((t) => !t.done && t.level !== 'good');
	let summary: { text: string; ai: boolean };
	if (o.metrics) summary = await aiSummary(client, o.metrics, o.tasks.filter((t) => !t.done));
	else if (o.app)
		summary = {
			text: `${o.app.active.total.toLocaleString('en')} people used ${client.app?.name ?? 'the app'} in the last ${days} days, ${o.app.crashFree}% without a crash. ${open[0] ? `Priority: ${open[0].action}` : 'Nothing urgent this week.'}`,
			ai: false
		};
	else summary = { text: 'No data yet.', ai: false };
	const goals = await Promise.all(goalFile(client).goals.slice(0, 2).map((g) => goalProgress(client, g).catch(() => null)));
	return { days, areas: o.areas, tasks: o.tasks, health: o.health, summary, goals: goals.filter((g) => g !== null) };
};

export const actions = {
	toggle: async ({ params, request }) => {
		const id = String((await request.formData()).get('id') ?? '');
		if (id && getClient(params.id)) toggleDone(params.id, id);
		return { ok: true };
	}
};
