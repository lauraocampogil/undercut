import { fail, redirect } from '@sveltejs/kit';
import { googleConfigured } from '#lib/server/google.ts';
import { authEnabled, failedAttempt, findUser, startSession, tooManyAttempts, verifyPassword } from '#lib/server/auth.ts';

const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/app');

export const load = ({ url, locals }) => {
	if (!authEnabled()) redirect(303, safeNext(url.searchParams.get('next')));
	if (locals.user) redirect(303, safeNext(url.searchParams.get('next')));
	const errors: Record<string, string> = { unknown: 'This Google account has no access to this workspace. Ask the owner for an invitation.', google: 'Google sign-in failed. Try again.', state: 'The sign-in took too long. Try again.', not_configured: 'Google sign-in is not set up on this server yet.', access_denied: 'Google sign-in was cancelled.' };
	const e = url.searchParams.get('error');
	return { next: safeNext(url.searchParams.get('next')), google: googleConfigured(), googleError: e ? (errors[e] ?? 'Google sign-in failed.') : null };
};

export const actions = {
	default: async ({ request, cookies, url, getClientAddress }) => {
		const f = await request.formData();
		const email = String(f.get('email') ?? '').trim().toLowerCase();
		const password = String(f.get('password') ?? '');
		const key = `${getClientAddress()}|${email}`;
		if (tooManyAttempts(key)) return fail(429, { email, error: 'Too many tries. Wait 15 minutes and try again.' });
		const u = findUser(email);
		if (!u || !verifyPassword(password, u.passwordHash)) {
			failedAttempt(key);
			return fail(400, { email, error: 'Wrong email or password.' });
		}
		startSession(cookies, u.email, url.protocol === 'https:');
		const next = safeNext(String(f.get('next') ?? ''));
		redirect(303, u.role === 'client' && u.clientId && !next.startsWith(`/app/clients/${u.clientId}`) ? `/app/clients/${u.clientId}` : next);
	}
};
