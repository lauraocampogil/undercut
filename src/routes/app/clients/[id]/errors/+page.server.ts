import { fail } from '@sveltejs/kit';
import * as env from '$app/env/private';
import { getClient, hasApp, hasWeb } from '#lib/server/store.ts';
import { getErrors, setIssueStatus } from '#lib/server/app-events.ts';

export const load = async ({ parent, url }) => {
	const { client } = await parent();
	const days = [7, 28, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 28;
	const base = env.PUBLIC_BASE_URL || url.origin;
	return { r: getErrors(client, days), days, api: base, isApp: hasApp(client), isWeb: hasWeb(client), snippet: `<script defer src="${base}/u.js" data-site="${client.id}"></script>` };
};

export const actions = {
	status: async ({ params, request }) => {
		const client = getClient(params.id);
		if (!client) return fail(404);
		const f = await request.formData();
		const s = String(f.get('status'));
		if (!['resolved', 'ignored', 'open'].includes(s)) return fail(400);
		setIssueStatus(client, String(f.get('id')), s as 'resolved' | 'ignored' | 'open');
		return { ok: true };
	}
};
