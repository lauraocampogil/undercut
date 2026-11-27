import { fail, redirect } from '@sveltejs/kit';
import { finishVerify, readPending, sendCode } from '#lib/server/login-code.ts';
import { failedAttempt, tooManyAttempts } from '#lib/server/auth.ts';

const mask = (e: string) => e.replace(/^(.{2}).*(@.*)$/, '$1•••$2');

export const load = ({ cookies }) => {
	const p = readPending(cookies);
	if (!p) redirect(303, '/login');
	return { email: mask(p.e) };
};

export const actions = {
	verify: async ({ request, cookies, url, getClientAddress }) => {
		const p = readPending(cookies);
		if (!p) redirect(303, '/login');
		const key = `verify|${getClientAddress()}|${p.e}`;
		if (tooManyAttempts(key)) return fail(429, { error: 'Too many tries. Wait 15 minutes and sign in again.' });
		const code = String((await request.formData()).get('code') ?? '');
		const next = await finishVerify(cookies, code, url.protocol === 'https:');
		if (!next) {
			failedAttempt(key);
			return fail(400, { error: 'This code is not right or has expired.' });
		}
		redirect(303, next);
	},
	resend: async ({ cookies, getClientAddress }) => {
		const p = readPending(cookies);
		if (!p) redirect(303, '/login');
		const key = `resend|${getClientAddress()}|${p.e}`;
		if (tooManyAttempts(key)) return fail(429, { error: 'Too many codes sent. Wait 15 minutes.' });
		failedAttempt(key);
		await sendCode(p);
		return { resent: true };
	}
};
