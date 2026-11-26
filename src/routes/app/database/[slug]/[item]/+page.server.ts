import { error, fail } from '@sveltejs/kit';
import { makeHow, makeInsight, ideasError } from '#lib/server/opportunities.ts';
import { openProduct, saveDbProduct } from '#lib/server/public.ts';
import { howKey, insightKey, itemView, reviewIds } from '#lib/server/item.ts';
import { translateReviews } from '#lib/server/translate.ts';
import { langOf } from '#lib/app-i18n.ts';
import { fullAccess } from '#lib/server/access.ts';

// One ask of a database product, inside the app: numbers, analysis, comparison, reviews. No ideas.
export const load = async ({ params, cookies, locals }) => {
	const p = await openProduct(params.slug, fullAccess(locals));
	if (!p) error(404, 'Product not found');
	const v = await itemView(p.analysis, params.item, () => saveDbProduct(p), langOf(cookies));
	if (!v) error(404, 'Not found for this product');
	return { ...v, slug: p.slug, claimed: false, fix: null };
};

export const actions = {
	how: async ({ params, cookies, locals, request }) => {
		const p = await openProduct(params.slug, fullAccess(locals));
		if (!p) error(404);
		const a = p.analysis;
		const lang = langOf(cookies);
		const key = howKey(params.item, lang);
		if (a.how?.[key]) return { ok: true };
		const rival = String((await request.formData()).get('rival') ?? '');
		const h = await makeHow(a, params.item, rival, lang);
		if (!h) return fail(400, { howError: ideasError() || 'Could not analyse it right now.' });
		a.how = { ...(a.how ?? {}), [key]: h };
		await translateReviews(a, h.proof, lang, () => {});
		saveDbProduct(p);
		return { ok: true };
	},
	translate: async ({ params, cookies, locals }) => {
		const p = await openProduct(params.slug, fullAccess(locals));
		if (!p) error(404);
		const a = p.analysis;
		const ok = await translateReviews(a, reviewIds(a, params.item, langOf(cookies)), langOf(cookies), () => saveDbProduct(p));
		return ok ? { ok: true } : fail(400, { translateError: true });
	},
	insight: async ({ params, cookies, locals }) => {
		const p = await openProduct(params.slug, fullAccess(locals));
		if (!p) error(404);
		const lang = langOf(cookies);
		const key = insightKey(params.item, lang);
		if (p.analysis.insights?.[key]) return { ok: true };
		const ins = await makeInsight(p.analysis, params.item, lang);
		if (!ins) return fail(400, { insightError: ideasError() || 'Could not analyse it right now.' });
		p.analysis.insights = { ...(p.analysis.insights ?? {}), [key]: ins };
		await saveDbProduct(p);
		return { ok: true };
	}
};
