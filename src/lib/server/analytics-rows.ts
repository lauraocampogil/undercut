// One summary row per tracked site or app (the analytics module): health, headline number, areas, open fixes.
import { listClients } from './store.ts';
import { getClientOverview } from './overview.ts';

export async function analyticsRows() {
	const rows = await Promise.all(
		listClients()
			.filter((c) => !c.demo)
			.map(async (c) => {
				const o = await getClientOverview(c);
				return {
					client: { id: c.id, name: c.name, color: c.color, domain: c.domain, type: c.type ?? 'web' },
					health: o.health,
					areas: o.areas.map((a) => ({ key: a.key, label: a.label, level: a.level, value: a.value, sub: a.sub, href: a.href })),
					tasks: o.tasks.filter((t) => !t.done && t.level !== 'good').map((t) => ({ id: t.id, level: t.level, title: t.title })),
					// one headline number + its trend: website visits, or app users for app-only clients (null = nothing measured yet)
					main: o.metrics ? { value: o.metrics.visits.total, prev: o.metrics.visits.prev, label: 'visits', daily: o.metrics.visits.daily } : o.app ? { value: o.app.active.total, prev: o.app.active.prev, label: 'app users', daily: o.app.dau } : null
				};
			})
	);
	return rows.sort((a, b) => a.health.score - b.health.score);
}

export const hostOf = (u?: string) => (u ?? '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase();
