import { sendEmail } from '#lib/server/email.ts';
import { welcomeEmail } from '#lib/server/mails.ts';
import { tierOfRow, langOfRow } from '#lib/server/beta-invite.ts';
import { welcomeSubject, unsubscribeLink } from '#lib/server/mails.ts';
import * as env from '$app/env/private';
import { redirect } from '@sveltejs/kit';
import { exchangeCode, googleIdentity } from '#lib/server/google.ts';
import { acceptInviteWithGoogle, findUser, inviteWorkspace, startSession } from '#lib/server/auth.ts';
import { addLogin, createWorkspace, getAccount, getAgency, listClients, loadWorkspace, lookupLogin, saveAccount, saveAgency, writeData } from '#lib/server/store.ts';
import { dbOn } from '#lib/server/db.ts';
import { inWorkspace } from '#lib/server/context.ts';
import { markJoined, rowByCode } from '#lib/server/beta.ts';

export const GET = async ({ url, cookies, locals }) => {
	const mode = cookies.get('oauth_mode') === 'login' ? 'login' : 'data';
	const next = cookies.get('oauth_next') || (mode === 'login' ? '/app/analyses' : '/app/settings/advanced');
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
			if (env.WAITLIST === 'on' && !beta) redirect(303, '/waitlist');
			const r = beta ? await rowByCode(beta) : null;
			const row = r && r.status !== 'joined' ? r : null;
			const gLang = langOfRow(row) ?? (['fr', 'es'].includes(cookies.get('lang') ?? '') ? (cookies.get('lang') as 'fr' | 'es') : 'en');
			const nws = await createWorkspace(id.name || id.email);
			await addLogin(id.email, nws);
			await inWorkspace(nws, () => {
				saveAccount({ name: id.name, email: id.email, language: gLang, googleLogin: true, beta: tierOfRow(row) === 'free' || undefined, founder: tierOfRow(row) === 'founder' || undefined, freeUntil: tierOfRow(row) === 'founder' ? new Date(Date.now() + 30 * 864e5).toISOString() : undefined });
				saveAgency({ ...getAgency(), name: id.name || id.email });
				writeData('clients.json', []);
				startSession(cookies, id.email, secure);
			});
			if (row) await markJoined(beta!, nws);
			void sendEmail(id.email, welcomeSubject(gLang), welcomeEmail(id.name, id.email, gLang), unsubscribeLink(id.email));
			redirect(303, next.startsWith('/app') ? next : '/app/analyses');
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
			redirect(303, next.startsWith('/app') ? next : '/app/analyses');
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
