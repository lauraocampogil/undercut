import { docTotal, getBiz, money } from '#lib/server/business.ts';
import { businessActions } from '#lib/server/business-actions.ts';

export const load = () => {
	const b = getBiz();
	const billed = (id: string) => b.docs.filter((d) => d.kind === 'invoice' && d.clientId === id && d.status === 'paid').reduce((t, d) => t + docTotal(d).total, 0);
	const open = (id: string) => b.tasks.filter((t) => t.clientId === id && !t.done).length;
	return {
		clients: b.clients
			.map((c) => ({ ...c, billed: billed(c.id), openTasks: open(c.id) }))
			.sort((a, z) => (a.status === z.status ? a.name.localeCompare(z.name) : a.status === 'active' ? -1 : z.status === 'active' ? 1 : 0)),
		money: money(b),
		currency: b.details.currency
	};
};

export const actions = businessActions;
