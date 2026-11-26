import { fail } from '@sveltejs/kit';
import * as env from '$app/env/private';
import { dbOn } from '#lib/server/db.ts';
import { inWorkspace } from '#lib/server/context.ts';
import { getAccount, loadWorkspace, lookupLogin } from '#lib/server/store.ts';
import { failedAttempt, findUser, tooManyAttempts } from '#lib/server/auth.ts';
import { resetToken } from '#lib/server/reset.ts';
import { emailReady, sendEmail } from '#lib/server/email.ts';
import { resetEmail, resetSubject } from '#lib/server/mails.ts';

export const load = () => ({ ready: emailReady() });

export const actions = {
	default: async ({ request, url, getClientAddress, cookies }) => {
		const email = String((await request.formData()).get('email') ?? '').trim().toLowerCase();
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(400, { email, error: 'Enter a valid email.' });
		const key = `reset|${getClientAddress()}`;
		if (tooManyAttempts(key)) return fail(429, { email, error: 'Too many tries. Wait 15 minutes and try again.' });
		failedAttempt(key); // counts every request, so the form cannot be used to spam an inbox
		const ws = dbOn() ? await lookupLogin(email) : null;
		if (dbOn() && !ws) return { sent: true, email };
		if (ws) await loadWorkspace(ws);
		const user = ws ? await inWorkspace(ws, () => findUser(email)) : findUser(email);
		const lang = (ws ? await inWorkspace(ws, () => getAccount().language) : getAccount().language) || cookies.get('lang');
		if (user) {
			const base = (env.PUBLIC_BASE_URL || url.origin).replace(/\/$/, '');
			const link = `${base}/reset?t=${resetToken(user.email, ws, user.passwordHash)}`;
			await sendEmail(user.email, resetSubject(lang), resetEmail(user.name, link, lang));
		}
		return { sent: true, email }; // same answer either way: never reveal who has an account
	}
};
