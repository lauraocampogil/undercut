import { fail } from '@sveltejs/kit';
import { getAccount, listClients, listMembers, saveMembers, type Member } from '#lib/server/store.ts';

export const load = ({ url }) => ({
	owner: getAccount(),
	members: listMembers(),
	clientsList: listClients().map((c) => ({ id: c.id, name: c.name })),
	preselect: url.searchParams.get('client')
});

export const actions = {
	invite: async ({ request }) => {
		const f = await request.formData();
		const email = String(f.get('email') ?? '').trim().toLowerCase();
		const role = String(f.get('role') ?? 'member') as Member['role'];
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(400, { error: 'That email does not look right.' });
		const all = listMembers().filter((m) => m.email !== email);
		all.push({ email, role: ['admin', 'member', 'client'].includes(role) ? role : 'member', status: 'invited', clientId: role === 'client' ? String(f.get('clientId') || '') || undefined : undefined, invitedAt: new Date().toISOString() });
		saveMembers(all);
		return { invited: email };
	},
	remove: async ({ request }) => {
		const email = String((await request.formData()).get('email') ?? '');
		saveMembers(listMembers().filter((m) => m.email !== email));
		return { removed: email };
	}
};
