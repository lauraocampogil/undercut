import { redirect } from '@sveltejs/kit';
import { exchangeCode, googleIdentity } from '#lib/server/google.ts';
import { acceptInviteWithGoogle, findUser, inviteWorkspace, startSession } from '#lib/server/auth.ts';
import { addLogin, createWorkspace, getAccount, getAgency, listClients, loadWorkspace, lookupLogin, saveAccount, saveAgency, writeData } from '#lib/server/store.ts';
import { dbOn } from '#lib/server/db.ts';
import { inWorkspace } from '#lib/server/context.ts';
import { markJoined, rowByCode, seatsLeft } from '#lib/server/beta.ts';

export const GET = async ({ url, cookies, locals }) => {
	const mode = cookies.get('oauth_mode') === 'login' ? 'login' : 'data';
	const next = cookies.get('oauth_next') || (mode === 'login' ? '/app' : '/app/settings/advanced');
	const invite = cookies.get('oauth_invite');
	const beta = cookies.get('oauth_beta');
	for (const k of ['oauth_next', 'oauth_mode', 'oauth_invite', 'oauth_beta']) cookies.delete(k, { path: '/' });
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
		if (dbOn()) {
			// a) joining a team (invitation link)
			const iws = invite ? inviteWorkspace(invite) : null;
			if (invite && iws) {
				await loadWorkspace(iws);
				const m = await inWorkspace(iws, async () => {
					const m = acceptInviteWithGoogle(invite, id.email, id.name);
					if (m) startSession(cookies, m.email, secure);
					return m;
				});
				if (!m) redirect(303, `/invite/${invite}?error=email`);
				await addLogin(m.email, iws);
				redirect(303, m.role === 'client' && m.clientId ? `/app/clients/${m.clientId}` : '/app');
			}
			// b) existing account
			const ws = await lookupLogin(id.email);
			if (ws) {
				await loadWorkspace(ws);
				const u = await inWorkspace(ws, () => {
					const u = findUser(id.email);
					if (u) startSession(cookies, u.email, secure);
					return u;
				});
				if (!u) redirect(303, back('error=unknown'));
				redirect(303, u.role === 'client' && u.clientId ? `/app/clients/${u.clientId}` : next);
			}
			// c) new agency: open sign-up (a beta invitation only pre-fills the agency name)
			const r = beta ? await rowByCode(beta) : null;
			const row = r && r.status !== 'joined' ? r : null;
			if (!row && (await seatsLeft()) <= 0) redirect(303, '/beta?full=1');
			const nws = await createWorkspace(row?.agency || `${id.name}’s agency`);
			await addLogin(id.email, nws);
			await inWorkspace(nws, () => {
				saveAccount({ name: id.name, email: id.email, language: 'en', googleLogin: true });
				saveAgency({ ...getAgency(), name: row?.agency || `${id.name}’s agency` });
				writeData('clients.json', []);
				startSession(cookies, id.email, secure);
			});
			if (row) await markJoined(beta!, nws);
			redirect(303, '/onboarding');
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
