import { redirect } from '@sveltejs/kit';
import type { EmailOtpType } from '@supabase/supabase-js';
import type { RequestHandler } from './$types';

/**
 * Supabase sends people here from the login email.
 * - token_hash + type: the recommended server-side flow (works even if the email
 *   is opened in another browser or on a phone).
 * - code: PKCE flow, kept as a fallback for the default email templates.
 * - error: expired or already-used link → back to /login with a friendly message.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const raw = url.searchParams.get('next') ?? '/dashboard';
	const next = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';
	const failed = (reason: string) => redirect(303, `/login?error=${reason}`);

	if (url.searchParams.get('error')) {
		failed(url.searchParams.get('error_code') === 'otp_expired' ? 'expired' : 'invalid');
	}
	if (!locals.supabase) redirect(303, next);

	const tokenHash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type') as EmailOtpType | null;
	const code = url.searchParams.get('code');

	if (tokenHash && type) {
		const { error } = await locals.supabase.auth.verifyOtp({ token_hash: tokenHash, type });
		if (error) failed(error.code === 'otp_expired' ? 'expired' : 'invalid');
	} else if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (error) failed('invalid');
	} else {
		failed('invalid');
	}
	redirect(303, next);
};
