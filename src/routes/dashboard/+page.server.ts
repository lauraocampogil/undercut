import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/config';
import { AnalysisError, addCompetitorByUrl } from '$lib/server/engine/discover';
import { headlines, summarize } from '$lib/server/engine/report';
import { productUrl } from '$lib/server/engine/shopify';
import { syncAccount } from '$lib/server/jobs';
import { MAX_COMPETITORS, type ChangeKind, type FeedItem, type Store } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

const KINDS: ChangeKind[] = ['price_down', 'price_up', 'sale_start', 'sale_end', 'new_product', 'out_of_stock', 'restock'];

export const load: PageServerLoad = async ({ locals, url }) => {
	const repo = db();
	const account = locals.account!;
	const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days')) || 7));
	const storeFilter = url.searchParams.get('store');
	const kindFilter = url.searchParams.get('kind') as ChangeKind | null;

	const tracked = await repo.getTracked(account.id);
	const stores = await repo.getStores(tracked.map((t) => t.store_id));
	const storeMap = new Map<string, Store>(stores.map((s) => [s.id, s]));

	const since = new Date(Date.now() - days * 864e5).toISOString();
	const all = await repo.listChanges(stores.map((s) => s.id), since, 1000);
	const filtered = all.filter(
		(c) => (!storeFilter || c.store_id === storeFilter) && (!kindFilter || c.kind === kindFilter)
	);
	const products = new Map(
		(await repo.getProductsByIds([...new Set(filtered.map((c) => c.product_id).filter(Boolean) as string[])])).map((p) => [p.id, p])
	);

	const feed: FeedItem[] = filtered.slice(0, 300).map((c) => {
		const s = storeMap.get(c.store_id)!;
		const p = c.product_id ? products.get(c.product_id) : undefined;
		return {
			id: c.id,
			kind: c.kind,
			pct: c.pct,
			old_value: c.old_value,
			new_value: c.new_value,
			detected_at: c.detected_at,
			store: { id: s.id, domain: s.domain, name: s.name, currency: s.currency },
			product: p ? { id: p.id, title: p.title, image: p.image, url: productUrl(s.domain, p.handle) } : null
		};
	});

	const competitors = await Promise.all(
		stores.map(async (s) => {
			const sum = summarize(s, await repo.getProducts(s.id));
			const t = tracked.find((x) => x.store_id === s.id);
			return {
				id: s.id,
				domain: s.domain,
				name: s.name,
				currency: s.currency,
				blocked: s.blocked,
				last_checked_at: s.last_checked_at,
				productCount: sum.productCount,
				medianPrice: sum.medianPrice,
				onSale: sum.onSale,
				avgDiscount: sum.avgDiscount,
				changes: all.filter((c) => c.store_id === s.id).length,
				score: t?.score ?? null
			};
		})
	);

	const counts = Object.fromEntries(KINDS.map((k) => [k, all.filter((c) => c.kind === k).length])) as Record<ChangeKind, number>;
	const lastChecked = stores.map((s) => s.last_checked_at).filter(Boolean).sort().at(-1) ?? null;

	return {
		days,
		storeFilter,
		kindFilter,
		feed,
		total: all.length,
		counts,
		headlines: headlines(all, storeMap, 3),
		competitors: competitors.sort((a, b) => b.changes - a.changes),
		lastChecked,
		max: MAX_COMPETITORS,
		welcome: url.searchParams.has('welcome')
	};
};

export const actions: Actions = {
	refresh: async ({ locals }) => {
		const counts = await syncAccount(locals.account!);
		return { refreshed: counts.reduce((a, b) => a + b, 0) };
	},
	remove: async ({ locals, request }) => {
		await db().removeTracked(locals.account!.id, String((await request.formData()).get('store_id')));
	},
	add: async ({ locals, request }) => {
		const account = locals.account!;
		const url = String((await request.formData()).get('url') ?? '');
		if (!account.own_store_id) return fail(400, { addError: 'Analyze your store from the homepage first.', url });
		const tracked = await db().getTracked(account.id);
		if (tracked.length >= MAX_COMPETITORS) return fail(400, { addError: `Up to ${MAX_COMPETITORS} competitors.`, url });
		try {
			const { candidate } = await addCompetitorByUrl(account.own_store_id, url);
			await db().addTracked(account.id, candidate.store_id, candidate.score, candidate.reasons);
		} catch (e) {
			if (e instanceof AnalysisError) return fail(400, { addError: e.message, url });
			throw e;
		}
	}
};
