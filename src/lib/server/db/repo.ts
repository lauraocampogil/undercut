import type {
	Account,
	Analysis,
	Candidate,
	Change,
	Product,
	Snapshot,
	Store,
	Tracked
} from '$lib/types';

export type NewStore = Omit<Store, 'id' | 'created_at'>;
export type NewChange = Omit<Change, 'id' | 'detected_at'> & { detected_at?: string };

/**
 * All data access goes through here.
 * Two implementations: Supabase (production) and a JSON file (demo mode).
 */
export interface Repo {
	// stores
	getStore(id: string): Promise<Store | null>;
	getStoreByDomain(domain: string): Promise<Store | null>;
	getStores(ids: string[]): Promise<Store[]>;
	upsertStore(store: NewStore): Promise<Store>;

	// products
	getProducts(storeId: string): Promise<Product[]>;
	getProduct(id: string): Promise<Product | null>;
	getProductsByIds(ids: string[]): Promise<Product[]>;
	upsertProducts(products: Product[]): Promise<void>;

	// price history
	upsertSnapshots(snapshots: Snapshot[]): Promise<void>;
	getSnapshots(productId: string): Promise<Snapshot[]>;

	// changes
	insertChanges(changes: NewChange[]): Promise<void>;
	listChanges(storeIds: string[], sinceIso: string, limit?: number): Promise<Change[]>;
	listProductChanges(productId: string): Promise<Change[]>;

	// anonymous analyses (before sign-up)
	createAnalysis(ownStoreId: string, candidates: Candidate[], queries: string[]): Promise<Analysis>;
	getAnalysis(id: string): Promise<Analysis | null>;
	updateAnalysisCandidates(id: string, candidates: Candidate[]): Promise<void>;

	// accounts
	getAccountByEmail(email: string): Promise<Account | null>;
	getAccount(id: string): Promise<Account | null>;
	upsertAccount(email: string, patch?: Partial<Account>): Promise<Account>;
	updateAccount(id: string, patch: Partial<Account>): Promise<void>;
	listAccounts(): Promise<Account[]>;

	// tracked competitors
	getTracked(accountId: string): Promise<Tracked[]>;
	addTracked(accountId: string, storeId: string, score?: number | null, reasons?: string[]): Promise<void>;
	removeTracked(accountId: string, storeId: string): Promise<void>;
	allTrackedStoreIds(): Promise<string[]>;
}
