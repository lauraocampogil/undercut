import { dev } from '$app/environment';
import { fail, redirect } from '@sveltejs/kit';
import { config, db, demoMode } from '$lib/server/config';
import { setDemoSession } from '$lib/server/session';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const analysis = url.searchParams.get('analysis');
	if (locals.account) redirect(303, analysis ? `/onboard/${analysis}` : '/dashboard');
	return { analysis, linkError: url.searchParams.get('error') };
};

export const actions: Actions = {
	default: async ({ request, cookies, locals, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim().toLowerCase();
		const analysis = String(form.get('analysis') ?? '');
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(400, { email, error: 'Please enter a valid email.' });
		const next = analysis ? `/onboard/${analysis}` : '/dashboard';

		if (demoMode) {
			const account = await db().upsertAccount(email);
			setDemoSession(cookies, account.id);
			redirect(303, next);
		}

		const { error } = await locals.supabase!.auth.signInWithOtp({
			email,
			// The email template appends &token_hash=…&type=email to this URL (see README → Supabase).
			options: { emailRedirectTo: `${dev ? url.origin : config.appUrl}/auth/callback?next=${encodeURIComponent(next)}` }
		});
		if (error) return fail(400, { email, error: error.message });
		return { sent: true, email };
	}
};
