import { fail, redirect } from '@sveltejs/kit';
import { AnalysisError, analyze } from '$lib/server/engine/discover';
import type { Actions, PageServerLoad } from './$types';

/**
 * Safety net: if Supabase falls back to the Site URL, the login link lands on the
 * homepage with ?code= / ?token_hash= / ?error=. Forward it to the real callback.
 */
export const load: PageServerLoad = ({ url }) => {
	const p = url.searchParams;
	if (p.has('code') || p.has('token_hash') || p.has('error_code')) redirect(303, `/auth/callback${url.search}`);
};

export const actions: Actions = {
	analyze: async ({ request }) => {
		const data = await request.formData();
		const url = String(data.get('url') ?? '');
		const placement = String(data.get('placement') ?? 'hero');
		let id: string;
		try {
			id = (await analyze(url)).analysisId;
		} catch (e) {
			if (e instanceof AnalysisError) return fail(400, { url, placement, error: e.message });
			console.error(e);
			return fail(500, { url, placement, error: 'Something went wrong while analyzing the store. Please try again.' });
		}
		redirect(303, `/analyze/${id}`);
	}
};
