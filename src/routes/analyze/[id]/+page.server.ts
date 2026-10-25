import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/config';
import { AnalysisError, addCompetitorByUrl } from '$lib/server/engine/discover';
import { instantReport } from '$lib/server/engine/report';
import { productUrl } from '$lib/server/engine/shopify';
import { MAX_COMPETITORS } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';



export const load: PageServerLoad = async ({ params }) => {
	const repo = db();
	const analysis = await repo.getAnalysis(params.id);
	if (!analysis) error(404, 'Analysis not found');
	const own = await repo.getStore(analysis.own_store_id);
	if (!own) error(404, 'Store not found');

	const ownProducts = await repo.getProducts(own.id);
	const stores = await repo.getStores(analysis.candidates.map((c) => c.store_id));
	const comps = await Promise.all(stores.map(async (store) => ({ store, products: await repo.getProducts(store.id) })));
	const report = instantReport(ownProducts, comps);

	const candidates = analysis.candidates
		.map((c) => {
			const summary = report.competitors.find((s) => s.store.id === c.store_id);
			if (!summary) return null;
			const { store, ...rest } = summary;
			return {
				...c,
				store: { id: store.id, domain: store.domain, name: store.name, currency: store.currency, country: store.country },
				...rest
			};
		})
		.filter((c) => c !== null)
		.sort((a, b) => b.score - a.score);

	return {
		analysisId: analysis.id,
		own: { domain: own.domain, name: own.name, currency: own.currency, country: own.country, productCount: ownProducts.length },
		candidates,
		max: MAX_COMPETITORS,
		position: { ownMedian: report.ownMedian, marketMedian: report.marketMedian, diffPct: report.diffPct },
		categories: report.categories,
		deals: report.topDeals.map((d) => ({
			title: d.product.title,
			image: d.product.image,
			price: d.product.price,
			compare_at: d.product.compare_at,
			discount: d.discount,
			url: productUrl(d.store.domain, d.product.handle),
			store: d.store.name ?? d.store.domain,
			currency: d.store.currency
		}))
	};
};

export const actions: Actions = {
	remove: async ({ params, request }) => {
		const repo = db();
		const storeId = String((await request.formData()).get('store_id'));
		const a = await repo.getAnalysis(params.id);
		if (!a) error(404);
		await repo.updateAnalysisCandidates(a.id, a.candidates.filter((c) => c.store_id !== storeId));
	},
	add: async ({ params, request }) => {
		const repo = db();
		const url = String((await request.formData()).get('url') ?? '');
		const a = await repo.getAnalysis(params.id);
		if (!a) error(404);
		if (a.candidates.length >= MAX_COMPETITORS)
			return fail(400, { addError: `Up to ${MAX_COMPETITORS} competitors. Remove one first.`, url });
		try {
			const { candidate } = await addCompetitorByUrl(a.own_store_id, url);
			if (a.candidates.some((c) => c.store_id === candidate.store_id))
				return fail(400, { addError: 'That store is already on the list.', url });
			await repo.updateAnalysisCandidates(a.id, [...a.candidates, candidate]);
		} catch (e) {
			if (e instanceof AnalysisError) return fail(400, { addError: e.message, url });
			throw e;
		}
	}
};
