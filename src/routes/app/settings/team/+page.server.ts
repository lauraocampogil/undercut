import { fail } from '@sveltejs/kit';
import { getAccount, getAgency, listClients, listMembers, saveMembers, type Member } from '#lib/server/store.ts';
import { createInvite } from '#lib/server/auth.ts';
import { emailReady, sendEmail } from '#lib/server/email.ts';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export const load = ({ url }) => ({
	owner: (({ passwordHash: _p, ...o }) => o)(getAccount()),
	members: listMembers().map(({ passwordHash: _p, inviteToken, ...m }) => ({ ...m, link: inviteToken ? `${url.origin}/invite/${inviteToken}` : null })),
	clientsList: listClients().map((c) => ({ id: c.id, name: c.name })),
	preselect: url.searchParams.get('client'),
	emailReady: emailReady()
});

export const actions = {
	invite: async ({ request, url }) => {
		const f = await request.formData();
		const email = String(f.get('email') ?? '').trim().toLowerCase();
		const r = String(f.get('role') ?? 'member');
		const role = (['admin', 'member', 'client'].includes(r) ? r : 'member') as Member['role'];
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(400, { error: 'That email does not look right.' });
		if (email === getAccount().email.toLowerCase()) return fail(400, { error: 'That’s you — you’re already the owner.' });
		const clientId = role === 'client' ? String(f.get('clientId') || '') || undefined : undefined;
		if (role === 'client' && !clientId) return fail(400, { error: 'Pick the client this person may see.' });
		const token = createInvite({ email, role, clientId });
		const link = `${url.origin}/invite/${token}`;
		const agency = getAgency().name;
		const client = clientId ? listClients().find((c) => c.id === clientId)?.name : null;
		const sent = await sendEmail(
			email,
			`${agency} invited you to Undercut`,
			`<div style="font-family:system-ui,sans-serif;font-size:15px"><p><b>${esc(agency)}</b> invited you to ${client ? `see the dashboard of <b>${esc(client)}</b>` : 'their Undercut workspace'}.</p><p><a href="${link}" style="display:inline-block;background:#C6F432;color:#172000;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">Accept the invitation</a></p><p style="color:#85878d;font-size:13px">Or open: ${link}</p></div>`
		);
		return { invited: email, link, sent };
	},
	remove: async ({ request }) => {
		const email = String((await request.formData()).get('email') ?? '');
		saveMembers(listMembers().filter((m) => m.email !== email));
		return { removed: email };
	}
};
