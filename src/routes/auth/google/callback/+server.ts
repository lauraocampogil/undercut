import { redirect } from '@sveltejs/kit';
import { exchangeCode, googleIdentity } from '#lib/server/google.ts';
import { acceptInviteWithGoogle, findUser, startSession } from '#lib/server/auth.ts';
import { getAccount, listClients, saveAccount, writeData } from '#lib/server/store.ts';

export const GET = async ({ url, cookies, locals }) => {
	const mode = cookies.get('oauth_mode') === 'login' ? 'login' : 'data';
	const next = cookies.get('oauth_next') || (mode === 'login' ? '/app' : '/app/settings');
	const invite = cookies.get('oauth_invite');
	for (const k of ['oauth_next', 'oauth_mode', 'oauth_invite']) cookies.delete(k, { path: '/' });
	const back = (q: string) => (mode === 'login' ? `/login?${q}` : `${next}${next.includes('?') ? '&' : '?'}${q}`);
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	if (url.searchParams.get('error')) redirect(303, back(`error=${encodeURIComponent(url.searchParams.get('error')!)}`));
	if (!code || !state || state !== cookies.get('oauth_state')) redirect(303, back('error=state'));
	cookies.delete('oauth_state', { path: '/' });
	const secure = url.protocol === 'https:';

	if (mode === 'login') {
		let id: { email: string; name: string };
		try {
			id = await googleIdentity(code, url.origin);
		} catch (e) {
			console.error(e);
			redirect(303, back('error=google'));
		}
		// 1) accepting an invitation
		if (invite) {
			const m = acceptInviteWithGoogle(invite, id.email, id.name);
			if (!m) redirect(303, `/invite/${invite}?error=email`);
			startSession(cookies, m.email, secure);
			redirect(303, m.role === 'client' && m.clientId ? `/app/clients/${m.clientId}` : '/app');
		}
		const owner = getAccount();
		// 2) first visit: no workspace yet → this Google account becomes the owner
		if (!owner.email && !owner.passwordHash) {
			saveAccount({ ...owner, name: id.name, email: id.email, googleLogin: true });
			writeData('clients.json', listClients().filter((c) => !c.demo)); // a real workspace starts clean
			startSession(cookies, id.email, secure);
			redirect(303, '/onboarding');
		}
		// 3) owner or team member signing in
		const u = findUser(id.email);
		if (!u) redirect(303, back('error=unknown'));
		if (u.role === 'owner' && !owner.googleLogin) saveAccount({ ...owner, googleLogin: true });
		startSession(cookies, u.email, secure);
		redirect(303, u.role === 'client' && u.clientId ? `/app/clients/${u.clientId}` : next);
	}

	// data connection
	if (!locals.user) redirect(303, '/login');
	try {
		await exchangeCode(code, url.origin);
	} catch (e) {
		console.error(e);
		redirect(303, back('error=token'));
	}
	redirect(303, back('ok=1'));
};
