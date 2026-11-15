import { redirect } from '@sveltejs/kit';
import { authUrl, googleConfigured } from '#lib/server/google.ts';

// /auth/google              → connect Google data (Analytics, Search Console, Maps, Tag Manager) — signed-in users only
// /auth/google?mode=login   → sign in / sign up with Google (also ?invite=TOKEN to accept an invitation)
// ?next=/path brings the user back where they started (same-site paths only).
export const GET = ({ url, cookies, locals }) => {
	const mode = url.searchParams.get('mode') === 'login' ? 'login' : 'data';
	const next = url.searchParams.get('next');
	const back = next && next.startsWith('/') && !next.startsWith('//') ? next : mode === 'login' ? '/app' : '/app/settings';
	if (!googleConfigured()) redirect(303, `${mode === 'login' ? '/login' : back}${back.includes('?') && mode !== 'login' ? '&' : '?'}error=not_configured`);
	if (mode === 'data' && !locals.user) redirect(303, `/login?next=${encodeURIComponent(back)}`);
	const state = crypto.randomUUID();
	const opts = { path: '/', httpOnly: true, sameSite: 'lax' as const, maxAge: 600, secure: url.protocol === 'https:' };
	cookies.set('oauth_state', state, opts);
	cookies.set('oauth_next', back, opts);
	cookies.set('oauth_mode', mode, opts);
	const invite = url.searchParams.get('invite');
	if (invite) cookies.set('oauth_invite', invite, opts);
	else cookies.delete('oauth_invite', { path: '/' });
	redirect(303, authUrl(url.origin, state, mode), { external: ['https://accounts.google.com'] });
};
