import { error } from '@sveltejs/kit';
import { docTotal, getBiz, today } from '#lib/server/business.ts';
import { businessActions } from '#lib/server/business-actions.ts';
import { listClients } from '#lib/server/store.ts';
import { hostOf } from '#lib/server/analytics-rows.ts';

export const load = ({ params }) => {
	const b = getBiz();
	const client = b.clients.find((c) => c.id === params.id);
	if (!client) error(404, 'Client not found');
	// the same site tracked in Analytics (visits, leads, heatmaps, SEO)
	const h = hostOf(client.website);
	const sites = listClients().filter((c) => !c.demo);
	const tracked = sites.find((c) => c.id === client.siteId) ?? (h ? sites.find((c) => hostOf(c.domain) === h) : undefined);
	return {
		client,
		tracked: tracked ? { id: tracked.id } : null,
		tasks: b.tasks.filter((t) => t.clientId === client.id).sort((a, z) => Number(a.done) - Number(z.done) || (a.due ?? '9').localeCompare(z.due ?? '9')),
		meetings: b.meetings.filter((m) => m.clientId === client.id && m.date >= today()).sort((a, z) => a.date.localeCompare(z.date)),
		docs: b.docs.filter((d) => d.clientId === client.id).sort((a, z) => z.date.localeCompare(a.date)).map((d) => ({ id: d.id, kind: d.kind, number: d.number, date: d.date, status: d.status, total: docTotal(d).total })),
		currency: b.details.currency
	};
};

export const actions = businessActions;
