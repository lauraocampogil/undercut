import type { Product, Store } from '$lib/types';
import { db } from '../config';
import type { NewChange } from '../db/repo';
import { fetchCatalog, fetchMeta, toProduct, type RawProduct } from './shopify';

export const today = () => new Date().toISOString().slice(0, 10);

const pct = (from: number, to: number) => Math.round(((to - from) / from) * 1000) / 10;

/** Compares a product's previous and new state and returns the events. */
export function diffProduct(prev: Product | undefined, next: Product, isBaseline: boolean): NewChange[] {
	const base = { store_id: next.store_id, product_id: next.id };
	if (!prev) {
		// Only "new" if Shopify says it was created recently (avoids false positives
		// when the first catalog read was partial).
		const created = next.shop_created_at ? Date.parse(next.shop_created_at) : NaN;
		const recent = Number.isNaN(created) || Date.now() - created < 14 * 864e5;
		return isBaseline || !recent
			? []
			: [{ ...base, kind: 'new_product', old_value: null, new_value: next.price, pct: null }];
	}
	const out: NewChange[] = [];
	const saleStarted = !prev.compare_at && !!next.compare_at;
	const saleEnded = !!prev.compare_at && !next.compare_at;

	if (saleStarted) {
		out.push({ ...base, kind: 'sale_start', old_value: next.compare_at, new_value: next.price, pct: pct(next.compare_at!, next.price) });
	} else if (saleEnded) {
		out.push({ ...base, kind: 'sale_end', old_value: prev.price, new_value: next.price, pct: pct(prev.price, next.price) });
	} else if (Math.abs(prev.price - next.price) >= 0.01) {
		out.push({
			...base,
			kind: next.price < prev.price ? 'price_down' : 'price_up',
			old_value: prev.price,
			new_value: next.price,
			pct: pct(prev.price, next.price)
		});
	}
	if (prev.available && !next.available) out.push({ ...base, kind: 'out_of_stock', old_value: null, new_value: null, pct: null });
	if (!prev.available && next.available) out.push({ ...base, kind: 'restock', old_value: null, new_value: null, pct: null });
	return out;
}

export interface SyncResult {
	store: Store;
	products: Product[];
	changes: NewChange[];
	ok: boolean;
}

/**
 * Reads a store's catalog, saves its state, today's snapshot and the changes.
 * The first time it only saves the "baseline" (no changes).
 */
export async function syncStore(domain: string, prefetched?: RawProduct[] | null): Promise<SyncResult> {
	const repo = db();
	const existing = await repo.getStoreByDomain(domain);
	const catalog = prefetched ?? (await fetchCatalog(domain));
	const nowIso = new Date().toISOString();

	if (!catalog) {
		const store = await repo.upsertStore({
			domain,
			name: existing?.name ?? null,
			currency: existing?.currency ?? null,
			country: existing?.country ?? null,
			language: existing?.language ?? null,
			product_count: existing?.product_count ?? 0,
			blocked: true,
			last_checked_at: nowIso
		});
		return { store, products: [], changes: [], ok: false };
	}

	const meta = existing?.name ? existing : await fetchMeta(domain);
	const store = await repo.upsertStore({
		domain,
		name: meta.name ?? domain,
		currency: meta.currency,
		country: meta.country,
		language: meta.language,
		product_count: catalog.length,
		blocked: false,
		last_checked_at: nowIso
	});

	const prevList = await repo.getProducts(store.id);
	const prev = new Map(prevList.map((p) => [p.id, p]));
	const isBaseline = prevList.length === 0;

	const products: Product[] = [];
	const changes: NewChange[] = [];
	for (const raw of catalog) {
		const p = toProduct(raw, store.id, nowIso);
		if (!p) continue;
		const before = prev.get(p.id);
		if (before) p.first_seen_at = before.first_seen_at;
		changes.push(...diffProduct(before, p, isBaseline));
		products.push(p);
	}

	await repo.upsertProducts(products);
	await repo.upsertSnapshots(
		products.map((p) => ({ product_id: p.id, day: today(), price: p.price, compare_at: p.compare_at, available: p.available }))
	);
	await repo.insertChanges(changes);
	return { store, products, changes, ok: true };
}

/** Runs tasks with a concurrency limit. */
export async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
	const out: R[] = new Array(items.length);
	let i = 0;
	await Promise.all(
		Array.from({ length: Math.min(limit, items.length) }, async () => {
			while (i < items.length) {
				const idx = i++;
				out[idx] = await fn(items[idx]);
			}
		})
	);
	return out;
}
