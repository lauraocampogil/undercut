import { docTotal, getBiz, money } from '#lib/server/business.ts';
import { businessActions } from '#lib/server/business-actions.ts';

export const load = ({ url }) => {
	const b = getBiz();
	const names = Object.fromEntries(b.clients.map((c) => [c.id, c.name]));
	return {
		docs: b.docs.sort((a, z) => z.date.localeCompare(a.date) || z.number.localeCompare(a.number)).map((d) => ({ id: d.id, kind: d.kind, number: d.number, date: d.date, due: d.due, status: d.status, client: names[d.clientId] ?? 'Deleted client', ...docTotal(d) })),
		clients: b.clients.filter((c) => c.status !== 'ended').map((c) => ({ id: c.id, name: c.name })),
		details: b.details,
		money: money(b),
		tab: url.searchParams.get('tab') === 'quotes' ? 'quotes' : url.searchParams.get('tab') === 'settings' ? 'settings' : 'invoices'
	};
};

export const actions = businessActions;
