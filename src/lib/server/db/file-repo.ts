import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Account, Analysis, Change, Product, Snapshot, Store, Tracked } from '$lib/types';
import type { NewChange, NewStore, Repo } from './repo';

interface Data {
	stores: Store[];
	products: Record<string, Product>;
	snapshots: Snapshot[];
	changes: Change[];
	analyses: Analysis[];
	accounts: Account[];
	tracked: Tracked[];
}

const empty = (): Data => ({
	stores: [],
	products: {},
	snapshots: [],
	changes: [],
	analyses: [],
	accounts: [],
	tracked: []
});

/** Demo-mode database: a local JSON file. Do not use in production. */
export function createFileRepo(path = 'data/db.json'): Repo {
	let data: Data = existsSync(path) ? { ...empty(), ...JSON.parse(readFileSync(path, 'utf8')) } : empty();
	let timer: ReturnType<typeof setTimeout> | null = null;

	const save = () => {
		if (timer) return;
		timer = setTimeout(() => {
			timer = null;
			mkdirSync(dirname(path), { recursive: true });
			writeFileSync(path, JSON.stringify(data));
		}, 50);
	};
	const now = () => new Date().toISOString();
	const uid = () => crypto.randomUUID();

	return {
		async getStore(id) {
			return data.stores.find((s) => s.id === id) ?? null;
		},
		async getStoreByDomain(domain) {
			return data.stores.find((s) => s.domain === domain) ?? null;
		},
		async getStores(ids) {
			return data.stores.filter((s) => ids.includes(s.id));
		},
		async upsertStore(store: NewStore) {
			const existing = data.stores.find((s) => s.domain === store.domain);
			if (existing) {
				Object.assign(existing, store);
				save();
				return existing;
			}
			const created: Store = { ...store, id: uid(), created_at: now() };
			data.stores.push(created);
			save();
			return created;
		},

		async getProducts(storeId) {
			return Object.values(data.products).filter((p) => p.store_id === storeId);
		},
		async getProduct(id) {
			return data.products[id] ?? null;
		},
		async getProductsByIds(ids) {
			return ids.map((id) => data.products[id]).filter(Boolean);
		},
		async upsertProducts(products) {
			for (const p of products) data.products[p.id] = p;
			save();
		},

		async upsertSnapshots(snapshots) {
			for (const s of snapshots) {
				const i = data.snapshots.findIndex((x) => x.product_id === s.product_id && x.day === s.day);
				if (i >= 0) data.snapshots[i] = s;
				else data.snapshots.push(s);
			}
			save();
		},
		async getSnapshots(productId) {
			return data.snapshots
				.filter((s) => s.product_id === productId)
				.sort((a, b) => a.day.localeCompare(b.day));
		},

		async insertChanges(changes: NewChange[]) {
			for (const c of changes) data.changes.push({ ...c, id: uid(), detected_at: c.detected_at ?? now() });
			save();
		},
		async listChanges(storeIds, sinceIso, limit = 500) {
			return data.changes
				.filter((c) => storeIds.includes(c.store_id) && c.detected_at >= sinceIso)
				.sort((a, b) => b.detected_at.localeCompare(a.detected_at))
				.slice(0, limit);
		},
		async listProductChanges(productId) {
			return data.changes
				.filter((c) => c.product_id === productId)
				.sort((a, b) => b.detected_at.localeCompare(a.detected_at));
		},

		async createAnalysis(ownStoreId, candidates, queries) {
			const a: Analysis = { id: uid(), own_store_id: ownStoreId, candidates, queries, created_at: now() };
			data.analyses.push(a);
			save();
			return a;
		},
		async getAnalysis(id) {
			return data.analyses.find((a) => a.id === id) ?? null;
		},
		async updateAnalysisCandidates(id, candidates) {
			const a = data.analyses.find((x) => x.id === id);
			if (a) a.candidates = candidates;
			save();
		},

		async getAccountByEmail(email) {
			return data.accounts.find((a) => a.email === email) ?? null;
		},
		async getAccount(id) {
			return data.accounts.find((a) => a.id === id) ?? null;
		},
		async upsertAccount(email, patch = {}) {
			let a = data.accounts.find((x) => x.email === email);
			if (!a) {
				a = { id: uid(), email, own_store_id: null, reminder_day: 1, last_seen_at: null, created_at: now() };
				data.accounts.push(a);
			}
			Object.assign(a, patch, { email });
			save();
			return a;
		},
		async updateAccount(id, patch) {
			const a = data.accounts.find((x) => x.id === id);
			if (a) Object.assign(a, patch);
			save();
		},
		async listAccounts() {
			return data.accounts;
		},

		async getTracked(accountId) {
			return data.tracked.filter((t) => t.account_id === accountId);
		},
		async addTracked(accountId, storeId, score = null, reasons = []) {
			if (data.tracked.some((t) => t.account_id === accountId && t.store_id === storeId)) return;
			data.tracked.push({ account_id: accountId, store_id: storeId, score, reasons, added_at: now() });
			save();
		},
		async removeTracked(accountId, storeId) {
			data.tracked = data.tracked.filter((t) => !(t.account_id === accountId && t.store_id === storeId));
			save();
		},
		async allTrackedStoreIds() {
			return [...new Set(data.tracked.map((t) => t.store_id))];
		}
	};
}
