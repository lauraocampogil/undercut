import { error, fail, redirect } from '@sveltejs/kit';
import { acceptInvite, inviteByToken, inviteWorkspace, passwordProblem, startSession } from '#lib/server/auth.ts';
import { addLogin, getAgency, getClient, loadWorkspace } from '#lib/server/store.ts';
import { inWorkspace } from '#lib/server/context.ts';
import { dbOn } from '#lib/server/db.ts';
import { googleConfigured } from '#lib/server/google.ts';

// multi-agency mode: the token starts with the workspace id
async function inInviteWs<T>(token: string, fn: () => T | Promise<T>) {
	const ws = dbOn() ? inviteWorkspace(token) : null;
	if (dbOn() && !ws) error(404, 'This invitation does not exist.');
	if (!ws) return fn();
	await loadWorkspace(ws);
	return inWorkspace(ws, fn);
}

export const load = ({ params, url }) => inInviteWs(params.token, () => {
	const m = inviteByToken(params.token);
	if (!m) error(404, 'This invitation was already used or does not exist.');
	return { email: m.email, role: m.role, agency: getAgency().name, client: m.clientId ? getClient(m.clientId)?.name : null, google: googleConfigured(), token: params.token, emailError: url.searchParams.get('error') === 'email' };
});

export const actions = {
	default: async ({ params, request, cookies, url }) => {
		const f = await request.formData();
		const name = String(f.get('name') ?? '').trim();
		const pw = String(f.get('password') ?? '');
		const problem = passwordProblem(pw);
		if (problem) return fail(400, { name, error: problem });
		const m = await inInviteWs(params.token, async () => {
			const m = acceptInvite(params.token, name, pw);
			if (!m) error(404, 'This invitation was already used.');
			const ws = inviteWorkspace(params.token);
			if (dbOn() && ws) await addLogin(m.email, ws);
			startSession(cookies, m.email, url.protocol === 'https:');
			return m;
		});
		redirect(303, m.role === 'client' && m.clientId ? `/app/clients/${m.clientId}` : '/app');
	}
};
