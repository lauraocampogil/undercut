import { redirect } from '@sveltejs/kit';
import { getSeoAudit } from '#lib/server/seo-audit.ts';
import { getClient, hasWeb } from '#lib/server/store.ts';
import { codeFor, fixedIssues, generateFixes, listFixes, setAll, updateFix } from '#lib/server/fixes.ts';
import { getHeatmap } from '#lib/server/tracking.ts';

export const load = async ({ parent }) => {
	const { client } = await parent();
	if (!hasWeb(client)) redirect(307, `/app/clients/${client.id}`);
	const audit = await getSeoAudit(client);
	let fixes = listFixes(client.id);
	if (!fixes.length) fixes = await generateFixes(client, audit);
	return {
		audit,
		fixes: fixes.filter((f) => f.status !== 'dismissed').map((f) => ({ ...f, code: codeFor(f) })),
		dismissed: fixes.filter((f) => f.status === 'dismissed').length,
		fixed: [...fixedIssues(client.id)],
		snippetInstalled: client.demo || getHeatmap(client).installed
	};
};

const form = async (request: Request) => Object.fromEntries(await request.formData()) as Record<string, string>;

export const actions = {
	rerun: async ({ params }) => {
		const client = getClient(params.id);
		if (client) await generateFixes(client, await getSeoAudit(client, true));
		return { ok: true };
	},
	publish: async ({ params, request }) => {
		const f = await form(request);
		updateFix(params.id, f.id, { value: f.value, status: 'live' });
		return { published: f.id };
	},
	save: async ({ params, request }) => {
		const f = await form(request);
		updateFix(params.id, f.id, { value: f.value });
		return { saved: f.id };
	},
	undo: async ({ params, request }) => {
		updateFix(params.id, (await form(request)).id, { status: 'suggested' });
		return { ok: true };
	},
	dismiss: async ({ params, request }) => {
		updateFix(params.id, (await form(request)).id, { status: 'dismissed' });
		return { ok: true };
	},
	publishAll: async ({ params }) => {
		setAll(params.id, 'suggested', 'live');
		return { ok: true };
	},
	restore: async ({ params }) => {
		setAll(params.id, 'dismissed', 'suggested');
		return { ok: true };
	}
};
