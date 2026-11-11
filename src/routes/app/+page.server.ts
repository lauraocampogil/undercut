import { getClientOverview } from '#lib/server/overview.ts';
import { getClient, listClients, toggleDone } from '#lib/server/store.ts';

export const load = async () => {
	const clients = listClients();
	const rows = await Promise.all(
		clients.map(async (c) => {
			const o = await getClientOverview(c);
			return {
				client: { id: c.id, name: c.name, color: c.color, domain: c.domain, type: c.type ?? 'web' },
				health: o.health,
				areas: o.areas.map((a) => ({ key: a.key, label: a.label, level: a.level, value: a.value, sub: a.sub, delta: a.delta, deltaInvert: a.deltaInvert, href: a.href })),
				tasks: o.tasks.filter((t) => !t.done && t.level !== 'good').map((t) => ({ id: t.id, level: t.level, area: t.area, title: t.title, action: t.action })),
				visits: o.metrics?.visits ?? null,
				appUsers: o.app?.active ?? null
			};
		})
	);
	rows.sort((a, b) => a.health.score - b.health.score);
	return { rows };
};

export const actions = {
	toggle: async ({ request }) => {
		const f = await request.formData();
		const clientId = String(f.get('client') ?? '');
		const id = String(f.get('id') ?? '');
		if (getClient(clientId) && id) toggleDone(clientId, id);
		return { ok: true };
	}
};
