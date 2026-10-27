import type { Change, ChangeKind, Product, Store } from '$lib/types';
import { median, tokenize } from './text';

export interface CompetitorSummary {
	store: Store;
	productCount: number;
	medianPrice: number;
	onSale: number;
	avgDiscount: number; // %
	newLast30: number;
	outOfStock: number;
}

export interface CategoryPosition {
	name: string;
	ownMedian: number;
	marketMedian: number;
	diffPct: number; // + = you are more expensive
	ownCount: number;
	marketCount: number;
}

export interface InstantReport {
	ownMedian: number;
	marketMedian: number;
	diffPct: number;
	/** False when the numbers would mislead (other currency, or wildly different products/pack sizes). */
	comparable: boolean;
	note: string | null;
	competitors: CompetitorSummary[];
	categories: CategoryPosition[];
	topDeals: { product: Product; store: Store; discount: number }[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const discountOf = (p: Product) => (p.compare_at ? ((p.compare_at - p.price) / p.compare_at) * 100 : 0);

export function summarize(store: Store, products: Product[]): CompetitorSummary {
	const sale = products.filter((p) => p.compare_at);
	const cutoff = Date.now() - 30 * 864e5;
	return {
		store,
		productCount: products.length,
		medianPrice: round1(median(products.map((p) => p.price))),
		onSale: sale.length,
		avgDiscount: sale.length ? Math.round(sale.reduce((s, p) => s + discountOf(p), 0) / sale.length) : 0,
		newLast30: products.filter((p) => p.shop_created_at && Date.parse(p.shop_created_at) > cutoff).length,
		outOfStock: products.filter((p) => !p.available).length
	};
}

/** Own categories (by product_type) compared with competitor products sharing their keyword. */
function categories(own: Product[], market: Product[]): CategoryPosition[] {
	const groups = new Map<string, Product[]>();
	for (const p of own) {
		const key = p.product_type?.trim();
		if (!key) continue;
		groups.set(key, [...(groups.get(key) ?? []), p]);
	}
	const marketTokens = market.map((p) => new Set(tokenize(`${p.product_type ?? ''} ${p.title}`)));
	const out: CategoryPosition[] = [];
	for (const [name, items] of groups) {
		if (items.length < 2) continue;
		const keys = tokenize(name);
		if (!keys.length) continue;
		const matches = market.filter((_, i) => keys.some((k) => marketTokens[i].has(k)));
		if (matches.length < 3) continue;
		const ownMedian = median(items.map((p) => p.price));
		const marketMedian = median(matches.map((p) => p.price));
		out.push({
			name,
			ownMedian: round1(ownMedian),
			marketMedian: round1(marketMedian),
			diffPct: round1(((ownMedian - marketMedian) / marketMedian) * 100),
			ownCount: items.length,
			marketCount: matches.length
		});
	}
	return out.sort((a, b) => b.ownCount - a.ownCount).slice(0, 6);
}

export function instantReport(
	ownProducts: Product[],
	competitors: { store: Store; products: Product[] }[],
	ownCurrency: string | null = null
): InstantReport {
	// Never compare euros with dollars: only same-currency competitors count for prices.
	const sameCurrency = competitors.filter((c) => !ownCurrency || !c.store.currency || c.store.currency === ownCurrency);
	const market = sameCurrency.flatMap((c) => c.products);
	const ownMedian = median(ownProducts.map((p) => p.price));
	const marketMedian = median(market.map((p) => p.price));
	const diff = marketMedian ? ((ownMedian - marketMedian) / marketMedian) * 100 : 0;
	let note: string | null = null;
	if (!competitors.length) note = null;
	else if (!sameCurrency.length) note = 'Your competitors sell in another currency, so we don’t compare prices directly.';
	else if (Math.abs(diff) > 150) note = 'Your prices and theirs are too different to compare (pack sizes or product types may differ). See each category below.';
	const deals = competitors
		.flatMap((c) => c.products.filter((p) => p.compare_at).map((p) => ({ product: p, store: c.store, discount: Math.round(discountOf(p)) })))
		.sort((a, b) => b.discount - a.discount)
		.slice(0, 6);
	return {
		ownMedian: round1(ownMedian),
		marketMedian: round1(marketMedian),
		diffPct: round1(diff),
		comparable: Boolean(sameCurrency.length) && note === null,
		note,
		competitors: competitors.map((c) => summarize(c.store, c.products)),
		categories: categories(ownProducts, market),
		topDeals: deals
	};
}

/** Headline sentences for the dashboard and the weekly summary. */
export function headlines(changes: Change[], stores: Map<string, Store>, max = 3): string[] {
	const byStore = new Map<string, Change[]>();
	for (const c of changes) byStore.set(c.store_id, [...(byStore.get(c.store_id) ?? []), c]);
	const lines: { weight: number; text: string }[] = [];
	for (const [storeId, list] of byStore) {
		const name = stores.get(storeId)?.name ?? stores.get(storeId)?.domain ?? 'A competitor';
		const count = (k: ChangeKind) => list.filter((c) => c.kind === k).length;
		const sale = count('sale_start');
		const down = count('price_down');
		const up = count('price_up');
		const fresh = count('new_product');
		const oos = count('out_of_stock');
		if (sale >= 3) lines.push({ weight: sale * 3, text: `${name} put ${sale} products on sale: likely a campaign.` });
		else if (sale) lines.push({ weight: sale * 2, text: `${name} discounted ${sale} product${sale > 1 ? 's' : ''}.` });
		if (down) lines.push({ weight: down * 2, text: `${name} cut prices on ${down} product${down > 1 ? 's' : ''}.` });
		if (up) lines.push({ weight: up, text: `${name} raised prices on ${up} product${up > 1 ? 's' : ''}.` });
		if (fresh) lines.push({ weight: fresh * 1.5, text: `${name} launched ${fresh} new product${fresh > 1 ? 's' : ''}.` });
		if (oos >= 3) lines.push({ weight: oos, text: `${name} has ${oos} products sold out.` });
	}
	return lines.sort((a, b) => b.weight - a.weight).slice(0, max).map((l) => l.text);
}
