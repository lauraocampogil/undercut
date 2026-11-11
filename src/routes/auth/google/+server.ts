import { redirect } from '@sveltejs/kit';
import { authUrl, googleConfigured } from '#lib/server/google.ts';

export const GET = ({ url, cookies }) => {
	if (!googleConfigured()) redirect(303, '/app/connections?error=not_configured');
	const state = crypto.randomUUID();
	cookies.set('oauth_state', state, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 600, secure: url.protocol === 'https:' });
	redirect(303, authUrl(url.origin, state), { external: ['https://accounts.google.com'] });
};
