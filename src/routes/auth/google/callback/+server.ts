import { redirect } from '@sveltejs/kit';
import { exchangeCode } from '#lib/server/google.ts';

export const GET = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	if (url.searchParams.get('error')) redirect(303, `/app/settings?error=${url.searchParams.get('error')}`);
	if (!code || !state || state !== cookies.get('oauth_state')) redirect(303, '/app/settings?error=state');
	cookies.delete('oauth_state', { path: '/' });
	try {
		await exchangeCode(code, url.origin);
	} catch (e) {
		console.error(e);
		redirect(303, '/app/settings?error=token');
	}
	redirect(303, '/app/settings?ok=1');
};
