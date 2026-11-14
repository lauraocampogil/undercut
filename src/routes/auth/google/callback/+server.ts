import { redirect } from '@sveltejs/kit';
import { exchangeCode } from '#lib/server/google.ts';

export const GET = async ({ url, cookies }) => {
	const next = cookies.get('oauth_next') || '/app/settings';
	const back = (q: string) => `${next}${next.includes('?') ? '&' : '?'}${q}`;
	cookies.delete('oauth_next', { path: '/' });
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	if (url.searchParams.get('error')) redirect(303, back(`error=${encodeURIComponent(url.searchParams.get('error')!)}`));
	if (!code || !state || state !== cookies.get('oauth_state')) redirect(303, back('error=state'));
	cookies.delete('oauth_state', { path: '/' });
	try {
		await exchangeCode(code, url.origin);
	} catch (e) {
		console.error(e);
		redirect(303, back('error=token'));
	}
	redirect(303, back('ok=1'));
};
