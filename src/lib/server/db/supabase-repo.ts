import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Account, Analysis, Change, Product, Snapshot, Store, Tracked } from '$lib/types';
import type { Repo } from './repo';

function must<T>(res: { data: T; error: { message: string } | null }): T {
	if (res.error) throw new Error(`Supabase: ${res.error.message}`);
	return res.data;
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

const toProduct = (r: Record<string, unknown>): Product =>
	({ ...r, price: Number(r.price), compare_at: num(r.compare_at), shopify_id: Number(r.shopify_id) }) as Product;

/** Production implementation. Uses the service role key: server-side only. */
export function createSupabaseRepo(url: string, serviceKey: string): Repo {
	const db: SupabaseClient = createClient(url, serviceKey, { auth: { persistSession: false } });

	return {
		async getStore(id) {
			return must(await db.from('stores').select('*').eq('id', id).maybeSingle()) as Store | null;
		},
		async getStoreByDomain(domain) {
			return must(await db.from('stores').select('*').eq('domain', domain).maybeSingle()) as Store | null;
		},
		async getStores(ids) {
			if (!ids.length) return [];
			return must(await db.from('stores').select('*').in('id', ids)) as Store[];
		},
		async upsertStore(store) {
			return must(
				await db.from('stores').upsert(store, { onConflict: 'domain' }).select('*').single()
			) as Store;
		},

		async getProducts(storeId) {
			const rows: Record<string, unknown>[] = [];
			for (let from = 0; ; from += 1000) {
				const page = must(
					await db.from('products').select('*').eq('store_id', storeId).range(from, from + 999)
				) as Record<string, unknown>[];
				rows.push(...page);
				if (page.length < 1000) break;
			}
			return rows.map(toProduct);
		},
		async getProduct(id) {
			const r = must(await db.from('products').select('*').eq('id', id).maybeSingle());
			return r ? toProduct(r as Record<string, unknown>) : null;
		},
		async getProductsByIds(ids) {
			const out: Product[] = [];
			for (let i = 0; i < ids.length; i += 200) {
				const rows = must(await db.from('products').select('*').in('id', ids.slice(i, i + 200))) as Record<string, unknown>[];
				out.push(...rows.map(toProduct));
			}
			return out;
		},
		async upsertProducts(products) {
			for (let i = 0; i < products.length; i += 500) {
				must(await db.from('products').upsert(products.slice(i, i + 500)));
			}
		},

		async upsertSnapshots(snapshots: Snapshot[]) {
			for (let i = 0; i < snapshots.length; i += 500) {
				must(await db.from('snapshots').upsert(snapshots.slice(i, i + 500)));
			}
		},
		async getSnapshots(productId) {
			const rows = must(
				await db.from('snapshots').select('*').eq('product_id', productId).order('day')
			) as Record<string, unknown>[];
			return rows.map((r) => ({ ...r, price: Number(r.price), compare_at: num(r.compare_at) }) as Snapshot);
		},

		async insertChanges(changes) {
			if (changes.length) must(await db.from('changes').insert(changes));
		},
		async listChanges(storeIds, sinceIso, limit = 500) {
			if (!storeIds.length) return [];
			const rows = must(
				await db
					.from('changes')
					.select('*')
					.in('store_id', storeIds)
					.gte('detected_at', sinceIso)
					.order('detected_at', { ascending: false })
					.limit(limit)
			) as Record<string, unknown>[];
			return rows.map(
				(r) => ({ ...r, old_value: num(r.old_value), new_value: num(r.new_value), pct: num(r.pct) }) as Change
			);
		},
		async listProductChanges(productId) {
			const rows = must(
				await db
					.from('changes')
					.select('*')
					.eq('product_id', productId)
					.order('detected_at', { ascending: false })
			) as Record<string, unknown>[];
			return rows.map(
				(r) => ({ ...r, old_value: num(r.old_value), new_value: num(r.new_value), pct: num(r.pct) }) as Change
			);
		},

		async createAnalysis(ownStoreId, candidates, queries) {
			return must(
				await db
					.from('analyses')
					.insert({ own_store_id: ownStoreId, candidates, queries })
					.select('*')
					.single()
			) as Analysis;
		},
		async getAnalysis(id) {
			return must(await db.from('analyses').select('*').eq('id', id).maybeSingle()) as Analysis | null;
		},
		async updateAnalysisCandidates(id, candidates) {
			must(await db.from('analyses').update({ candidates }).eq('id', id));
		},

		async getAccountByEmail(email) {
			return must(await db.from('accounts').select('*').eq('email', email).maybeSingle()) as Account | null;
		},
		async getAccount(id) {
			return must(await db.from('accounts').select('*').eq('id', id).maybeSingle()) as Account | null;
		},
		async upsertAccount(email, patch = {}) {
			return must(
				await db
					.from('accounts')
					.upsert({ ...patch, email }, { onConflict: 'email' })
					.select('*')
					.single()
			) as Account;
		},
		async updateAccount(id, patch) {
			must(await db.from('accounts').update(patch).eq('id', id));
		},
		async listAccounts() {
			return must(await db.from('accounts').select('*')) as Account[];
		},

		async getTracked(accountId) {
			return must(await db.from('tracked').select('*').eq('account_id', accountId)) as Tracked[];
		},
		async addTracked(accountId, storeId, score = null, reasons = []) {
			must(
				await db
					.from('tracked')
					.upsert({ account_id: accountId, store_id: storeId, score, reasons }, { ignoreDuplicates: true })
			);
		},
		async removeTracked(accountId, storeId) {
			must(await db.from('tracked').delete().eq('account_id', accountId).eq('store_id', storeId));
		},
		async allTrackedStoreIds() {
			const rows = must(await db.from('tracked').select('store_id')) as { store_id: string }[];
			return [...new Set(rows.map((r) => r.store_id))];
		}
	};
}
