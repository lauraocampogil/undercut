import { error, fail } from '@sveltejs/kit';
import { getAnalysis, saveAnalysis, type FixStatus } from '#lib/server/reviewdb.ts';
import { makeHow, makeInsight, ideasError } from '#lib/server/opportunities.ts';
import { claimProduct } from '#lib/server/public.ts';
import { howKey, insightKey, itemView, reviewIds } from '#lib/server/item.ts';
import { translateReviews } from '#lib/server/translate.ts';
import { langOf } from '#lib/app-i18n.ts';

// One thing users want: the numbers, what it means, what to do, and the reviews that prove it.
export const load = async ({ params, cookies }) => {
	const a = getAnalysis(params.id);
	if (!a) error(404, 'Report not found');
	const v = await itemView(a, params.item, () => saveAnalysis(a), langOf(cookies));
	if (!v) error(404, 'Not found in this report');
	return { ...v, id: a.id, back: `/app/analyses/${a.id}` };
};

export const actions = {
	how: async ({ params, cookies, locals, request }) => {
		const a = getAnalysis(params.id);
		if (!a) error(404);
		const lang = langOf(cookies);
		const key = howKey(params.item, lang);
		if (a.how?.[key]) return { ok: true };
		const rival = String((await request.formData()).get('rival') ?? '');
		const h = await makeHow(a, params.item, rival, lang);
		if (!h) return fail(400, { howError: ideasError() || 'Could not analyse it right now.' });
		a.how = { ...(a.how ?? {}), [key]: h };
		await translateReviews(a, h.proof, lang, () => {});
		saveAnalysis(a);
		return { ok: true };
	},
	translate: async ({ params, cookies, locals }) => {
		const a = getAnalysis(params.id);
		if (!a) error(404);
		const ok = await translateReviews(a, reviewIds(a, params.item, langOf(cookies)), langOf(cookies), () => saveAnalysis(a));
		return ok ? { ok: true } : fail(400, { translateError: true });
	},
	insight: async ({ params, cookies }) => {
		const a = getAnalysis(params.id);
		if (!a) error(404);
		const lang = langOf(cookies);
		const key = insightKey(params.item, lang);
		if (a.insights?.[key]) return { ok: true };
		const ins = await makeInsight(a, params.item, lang);
		if (!ins) return fail(400, { insightError: ideasError() || 'Could not analyse it right now.' });
		a.insights = { ...(a.insights ?? {}), [key]: ins };
		saveAnalysis(a);
		return { ok: true };
	},
	fix: async ({ params, request, locals }) => {
		const a = getAnalysis(params.id);
		if (!a) error(404);
		if (!a.claimed) return fail(400, { fixError: 'Verify that you work on this product first.' });
		const f = await request.formData();
		const status = String(f.get('status')) as FixStatus;
		if (!['none', 'known', 'working', 'fixed'].includes(status)) return fail(400, { fixError: 'Unknown status.' });
		a.main.fixes = { ...(a.main.fixes ?? {}), [params.item]: { status, at: status === 'fixed' ? new Date().toISOString().slice(0, 10) : undefined } };
		saveAnalysis(a);
		await claimProduct(a, locals.ws ?? null).catch(() => null);
	}
};

