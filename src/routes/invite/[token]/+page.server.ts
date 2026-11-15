import { error, fail, redirect } from '@sveltejs/kit';
import { acceptInvite, inviteByToken, passwordProblem, startSession } from '#lib/server/auth.ts';
import { getAgency, getClient } from '#lib/server/store.ts';
import { googleConfigured } from '#lib/server/google.ts';

export const load = ({ params, url }) => {
	const m = inviteByToken(params.token);
	if (!m) error(404, 'This invitation was already used or does not exist.');
	return { email: m.email, role: m.role, agency: getAgency().name, client: m.clientId ? getClient(m.clientId)?.name : null, google: googleConfigured(), token: params.token, emailError: url.searchParams.get('error') === 'email' };
};

export const actions = {
	default: async ({ params, request, cookies, url }) => {
		const f = await request.formData();
		const name = String(f.get('name') ?? '').trim();
		const pw = String(f.get('password') ?? '');
		const problem = passwordProblem(pw);
		if (problem) return fail(400, { name, error: problem });
		const m = acceptInvite(params.token, name, pw);
		if (!m) error(404, 'This invitation was already used.');
		startSession(cookies, m.email, url.protocol === 'https:');
		redirect(303, m.role === 'client' && m.clientId ? `/app/clients/${m.clientId}` : '/app');
	}
};
