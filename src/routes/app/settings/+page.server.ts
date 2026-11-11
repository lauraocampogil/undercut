import { redirect } from '@sveltejs/kit';
import * as env from '$app/env/private';
import { getAgency, listClients, saveAgency, saveTokens } from '#lib/server/store.ts';
import { SCOPES } from '#lib/server/google.ts';

export const load = ({ url }) => ({
	scopes: SCOPES,
	redirectUri: `${url.origin}/auth/google/callback`,
	exampleClient: listClients()[0]?.id ?? null,
	keys: {
		serpapi: Boolean(env.SERPAPI_KEY),
		pagespeed: Boolean(env.PAGESPEED_API_KEY),
		anthropic: Boolean(env.ANTHROPIC_API_KEY)
	}
});

export const actions = {
	save: async ({ request }) => {
		const f = await request.formData();
		const a = getAgency();
		saveAgency({
			name: String(f.get('name') || a.name),
			color: String(f.get('color') || a.color),
			reportFooter: String(f.get('reportFooter') ?? a.reportFooter)
		});
		return { saved: true };
	},
	disconnect: () => {
		saveTokens(null);
		redirect(303, '/app/settings#connections');
	}
};
