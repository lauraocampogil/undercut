export type ChangeKind =
	| 'price_down'
	| 'price_up'
	| 'new_product'
	| 'sale_start'
	| 'sale_end'
	| 'out_of_stock'
	| 'restock';

export interface Store {
	id: string;
	domain: string;
	name: string | null;
	currency: string | null;
	country: string | null;
	language: string | null;
	product_count: number;
	blocked: boolean;
	last_checked_at: string | null;
	created_at: string;
}

export interface Product {
	id: string; // `${store_id}:${shopify_id}`
	store_id: string;
	shopify_id: number;
	handle: string;
	title: string;
	product_type: string | null;
	vendor: string | null;
	tags: string[];
	image: string | null;
	price: number;
	compare_at: number | null;
	available: boolean;
	shop_created_at: string | null;
	first_seen_at: string;
	updated_at: string;
}

export interface Snapshot {
	product_id: string;
	day: string; // YYYY-MM-DD
	price: number;
	compare_at: number | null;
	available: boolean;
}

export interface Change {
	id: string;
	store_id: string;
	product_id: string | null;
	kind: ChangeKind;
	old_value: number | null;
	new_value: number | null;
	pct: number | null;
	detected_at: string;
}

export interface Candidate {
	store_id: string;
	score: number; // 0–1
	reasons: string[];
}

export interface Analysis {
	id: string;
	own_store_id: string;
	candidates: Candidate[];
	queries: string[];
	created_at: string;
}

export interface Account {
	id: string;
	email: string;
	own_store_id: string | null;
	reminder_day: number; // 0 = Sunday … 6 = Saturday
	last_seen_at: string | null;
	created_at: string;
}

export interface Tracked {
	account_id: string;
	store_id: string;
	score: number | null;
	reasons: string[];
	added_at: string;
}

/** A change ready to render in the dashboard feed. */
export interface FeedItem {
	id: string;
	kind: ChangeKind;
	pct: number | null;
	old_value: number | null;
	new_value: number | null;
	detected_at: string;
	store: { id: string; domain: string; name: string | null; currency: string | null };
	product: { id: string; title: string; image: string | null; url: string } | null;
}

/** Competitors per account in the MVP (Starter plan). */
export const MAX_COMPETITORS = 5;
