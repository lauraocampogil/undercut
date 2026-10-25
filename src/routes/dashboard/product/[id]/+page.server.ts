import { error } from '@sveltejs/kit';
import { db } from '$lib/server/config';
import { productUrl } from '$lib/server/engine/shopify';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const repo = db();
	const product = await repo.getProduct(params.id);
	if (!product) error(404, 'Product not found');
	const tracked = await repo.getTracked(locals.account!.id);
	const allowed = tracked.some((t) => t.store_id === product.store_id) || locals.account!.own_store_id === product.store_id;
	if (!allowed) error(404, 'Product not found');
	const store = (await repo.getStore(product.store_id))!;
	return {
		product: { ...product, url: productUrl(store.domain, product.handle) },
		store: { domain: store.domain, name: store.name, currency: store.currency },
		snapshots: await repo.getSnapshots(product.id),
		changes: await repo.listProductChanges(product.id)
	};
};
