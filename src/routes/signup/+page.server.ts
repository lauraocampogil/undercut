import { sendEmail } from '#lib/server/email.ts';
import { welcomeEmail } from '#lib/server/mails.ts';
import * as env from '$app/env/private';
import { fail, redirect } from '@sveltejs/kit';
import { addLogin, createWorkspace, getAgency, getBilling, listClients, lookupLogin, saveAccount, saveAgency, saveBilling, getAccount, writeData } from '#lib/server/store.ts';
import { PLANS, type PlanId } from '#lib/plans.ts';
import { googleConfigured } from '#lib/server/google.ts';
import { authEnabled, hashPassword, passwordProblem, setOwnerPassword, startSession } from '#lib/server/auth.ts';
import { dbOn } from '#lib/server/db.ts';
import { inWorkspace } from '#lib/server/context.ts';
import { markJoined, rowByCode } from '#lib/server/beta.ts';
import { tierOfRow, langOfRow } from '#lib/server/beta-invite.ts';
import { welcomeSubject, unsubscribeLink } from '#lib/server/mails.ts';

export const load = async ({ url, locals }) => {
	if (locals.user && locals.ws) redirect(303, '/app');
	if (env.WAITLIST === 'on' && !url.searchParams.get('code')) redirect(303, '/waitlist');
	// Multi-agency mode: open sign-up. A beta invitation code only pre-fills the form.
	if (dbOn()) {
		const code = url.searchParams.get('code') ?? '';
		const row = code ? await rowByCode(code) : null;
		if (row?.status === 'joined') redirect(303, '/login');
		return { plan: 'free', google: googleConfigured(), code: row ? code : '', beta: false, prefill: row ? { name: row.name, email: row.email, agency: row.agency } : null, next: url.searchParams.get('next') ?? '' };
	}
	// Local mode: one workspace per install — once protected, new visitors log in instead.
	if (authEnabled()) redirect(303, locals.user ? '/app' : '/login');
	return { plan: 'free', google: googleConfigured(), code: '', beta: false, prefill: null, next: url.searchParams.get('next') ?? '' };
};

export const actions = {
	default: async ({ request, cookies, url }) => {
		const f = await request.formData();
		if (env.WAITLIST === 'on' && !f.get('code')) redirect(303, '/waitlist');
		const name = String(f.get('name') ?? '').trim().slice(0, 80);
		const email = String(f.get('email') ?? '').trim().toLowerCase();
		const agency = String(f.get('name') ?? '').trim().slice(0, 120); // workspace name = the person's name
		const next = String(f.get('next') ?? '');
		const goTo = next.startsWith('/app') ? next : '/app/analyses';
		const password = String(f.get('password') ?? '');
		if (!name || !agency || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(400, { name, email, agency, error: 'Fill in your name and a valid email.' });
		const problem = passwordProblem(password);
		if (problem) return fail(400, { name, email, agency, error: problem });
		const secure = url.protocol === 'https:';

		if (dbOn()) {
			const code = String(f.get('code') ?? '');
			const row = code ? await rowByCode(code) : null;
			const lang = langOfRow(row) ?? (['fr', 'es'].includes(cookies.get('lang') ?? '') ? (cookies.get('lang') as 'fr' | 'es') : 'en');
			const tier = row && row.status !== 'joined' ? tierOfRow(row) : null; // free beta (first 20) or founding price (next 30)
			if (await lookupLogin(email)) return fail(400, { name, email, agency, error: 'An account with this email already exists — log in instead.' });
			const ws = await createWorkspace(agency);
			await addLogin(email, ws);
			await inWorkspace(ws, () => {
				saveAccount({ name, email, language: lang, passwordHash: hashPassword(password), beta: tier === 'free' || undefined, founder: tier === 'founder' || undefined, freeUntil: tier === 'founder' ? new Date(Date.now() + 30 * 864e5).toISOString() : undefined });
				saveAgency({ ...getAgency(), name: agency });
				writeData('clients.json', []);
				startSession(cookies, email, secure);
			});
			if (row && row.status !== 'joined') await markJoined(code, ws);
			void sendEmail(email, welcomeSubject(lang), welcomeEmail(name, email, lang), unsubscribeLink(email));
			redirect(303, goTo);
		}

		if (authEnabled()) redirect(303, '/login');
		saveAccount({ ...getAccount(), name, email });
		setOwnerPassword(password);
		startSession(cookies, email, secure);
		saveAgency({ ...getAgency(), name: agency });
		const plan = String(f.get('plan') ?? '');
		if (plan in PLANS) saveBilling({ ...getBilling(), plan: 'trial' as PlanId });
		// start empty: no example data
		writeData('clients.json', listClients().filter((c) => !c.demo));
		redirect(303, goTo);
	}
};
