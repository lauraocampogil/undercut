import { fail, redirect } from '@sveltejs/kit';
import { addLogin, createWorkspace, getAgency, getBilling, listClients, lookupLogin, saveAccount, saveAgency, saveBilling, getAccount, writeData } from '#lib/server/store.ts';
import { PLANS, type PlanId } from '#lib/plans.ts';
import { googleConfigured } from '#lib/server/google.ts';
import { authEnabled, hashPassword, passwordProblem, setOwnerPassword, startSession } from '#lib/server/auth.ts';
import { dbOn } from '#lib/server/db.ts';
import { inWorkspace } from '#lib/server/context.ts';
import { markJoined, rowByCode } from '#lib/server/beta.ts';

export const load = async ({ url, locals }) => {
	if (locals.user && locals.ws) redirect(303, '/app');
	// Multi-agency beta: a personal invitation code is needed
	if (dbOn()) {
		const code = url.searchParams.get('code') ?? '';
		const row = await rowByCode(code);
		if (!row || row.status === 'joined') redirect(303, row?.status === 'joined' ? '/login' : '/beta');
		return { plan: 'beta', google: googleConfigured(), code, beta: true, prefill: { name: row.name, email: row.email, agency: row.agency } };
	}
	// Local mode: one workspace per install — once protected, new visitors log in instead.
	if (authEnabled()) redirect(303, locals.user ? '/app' : '/login');
	return { plan: url.searchParams.get('plan') ?? 'agency', google: googleConfigured(), code: '', beta: false, prefill: null };
};

export const actions = {
	default: async ({ request, cookies, url }) => {
		const f = await request.formData();
		const name = String(f.get('name') ?? '').trim().slice(0, 80);
		const email = String(f.get('email') ?? '').trim().toLowerCase();
		const agency = String(f.get('agency') ?? '').trim().slice(0, 120);
		const password = String(f.get('password') ?? '');
		if (!name || !agency || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(400, { name, email, agency, error: 'Fill in your name, a valid email and your agency name.' });
		const problem = passwordProblem(password);
		if (problem) return fail(400, { name, email, agency, error: problem });
		const secure = url.protocol === 'https:';

		if (dbOn()) {
			const code = String(f.get('code') ?? '');
			const row = await rowByCode(code);
			if (!row || row.status === 'joined') return fail(400, { name, email, agency, error: 'This invitation is not valid anymore. Ask for a new one.' });
			if (await lookupLogin(email)) return fail(400, { name, email, agency, error: 'An account with this email already exists — log in instead.' });
			const ws = await createWorkspace(agency);
			await addLogin(email, ws);
			await inWorkspace(ws, () => {
				saveAccount({ name, email, language: 'en', passwordHash: hashPassword(password) });
				saveAgency({ ...getAgency(), name: agency });
				writeData('clients.json', []);
				startSession(cookies, email, secure);
			});
			await markJoined(code, ws);
			redirect(303, '/onboarding');
		}

		if (authEnabled()) redirect(303, '/login');
		saveAccount({ ...getAccount(), name, email });
		setOwnerPassword(password);
		startSession(cookies, email, secure);
		saveAgency({ ...getAgency(), name: agency });
		const plan = String(f.get('plan') ?? '');
		if (plan in PLANS) saveBilling({ ...getBilling(), plan: 'trial' as PlanId });
		// Start with an empty workspace unless they want to explore the example clients
		if (f.get('examples') !== 'on') writeData('clients.json', listClients().filter((c) => !c.demo));
		redirect(303, '/onboarding');
	}
};
