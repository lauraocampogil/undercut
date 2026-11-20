import { agenda, getBiz } from '#lib/server/business.ts';
import { businessActions } from '#lib/server/business-actions.ts';
import { getOS } from '#lib/server/agency-os.ts';

export const load = () => {
	const b = getBiz();
	return {
		tasks: b.tasks.sort((a, z) => Number(a.done) - Number(z.done) || (a.due ?? '9').localeCompare(z.due ?? '9') || a.createdAt.localeCompare(z.createdAt)),
		clients: b.clients.filter((c) => c.status !== 'ended').map((c) => ({ id: c.id, name: c.name })),
		names: Object.fromEntries(b.clients.map((c) => [c.id, c.name])),
		agenda: agenda(b, getOS().pipeline, 14),
		meetings: b.meetings
	};
};

export const actions = businessActions;
