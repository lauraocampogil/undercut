import { redirect } from '@sveltejs/kit';
import { authUrl, googleConfigured } from '#lib/server/google.ts';

// ?next=/onboarding?... brings the user back where they started (only same-site paths).
export const GET = ({ url, cookies }) => {
	const next = url.searchParams.get('next');
	const back = next && next.startsWith('/') && !next.startsWith('//') ? next : '/app/settings';
	if (!googleConfigured()) redirect(303, `${back}${back.includes('?') ? '&' : '?'}error=not_configured`);
	const state = crypto.randomUUID();
	const opts = { path: '/', httpOnly: true, sameSite: 'lax' as const, maxAge: 600, secure: url.protocol === 'https:' };
	cookies.set('oauth_state', state, opts);
	cookies.set('oauth_next', back, opts);
	redirect(303, authUrl(url.origin, state), { external: ['https://accounts.google.com'] });
};
