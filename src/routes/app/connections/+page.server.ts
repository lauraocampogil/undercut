import { redirect } from '@sveltejs/kit';
import { saveTokens } from '#lib/server/store.ts';
import { SCOPES } from '#lib/server/google.ts';

export const load = ({ url }) => ({
	scopes: SCOPES,
	redirectUri: `${url.origin}/auth/google/callback`
});

export const actions = {
	disconnect: () => {
		saveTokens(null);
		redirect(303, '/app/connections');
	}
};
