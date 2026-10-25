import { describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: {} }));
vi.mock('$env/dynamic/public', () => ({ env: {} }));

import type { Product } from '$lib/types';
import { scoreCandidates } from './discover';
import { heuristicQueries } from './queries';
import { headlines } from './report';
import { normalizeDomain, toProduct, type RawProduct } from './shopify';
import { catalogVector } from './text';
import { diffProduct } from './track';

const raw = (id: number, title: string, type: string, price: number, compare: number | null = null): RawProduct => ({
	id,
	title,
	handle: `p-${id}`,
	product_type: type,
	vendor: 'Brand',
	tags: [],
	created_at: '2024-01-01T00:00:00Z',
	variants: [{ price: String(price), compare_at_price: compare ? String(compare) : null, available: true }]
});

const prod = (over: Partial<Product> = {}): Product => ({
	...toProduct(raw(1, 'Retro shirt', 'Shirt', 50), 's1', '2026-01-01T00:00:00Z')!,
	...over
});

describe('normalizeDomain', () => {
	it('strips protocol, www and path', () => {
		expect(normalizeDomain('https://www.Store.com/collections/all')).toBe('store.com');
		expect(normalizeDomain('store.be')).toBe('store.be');
		expect(normalizeDomain('nope')).toBeNull();
	});
});

describe('toProduct', () => {
	it('uses the cheapest variant and detects sales', () => {
		const p = toProduct(
			{ ...raw(9, 'X', 'T', 0), variants: [{ price: '30', compare_at_price: '40' }, { price: '25', compare_at_price: null }] },
			's',
			'now'
		)!;
		expect(p.price).toBe(25);
		expect(p.compare_at).toBe(40);
	});
});

describe('diffProduct', () => {
	it('creates no changes on the baseline', () => {
		expect(diffProduct(undefined, prod(), true)).toEqual([]);
	});
	it('detects drops, sales and stock', () => {
		expect(diffProduct(prod(), prod({ price: 40 }), false)[0]).toMatchObject({ kind: 'price_down', pct: -20 });
		expect(diffProduct(prod(), prod({ price: 40, compare_at: 50 }), false)[0]).toMatchObject({ kind: 'sale_start', pct: -20 });
		expect(diffProduct(prod(), prod({ available: false }), false)[0]).toMatchObject({ kind: 'out_of_stock' });
	});
	it('only marks recently created products as new', () => {
		const fresh = prod({ shop_created_at: new Date().toISOString() });
		expect(diffProduct(undefined, fresh, false)[0]?.kind).toBe('new_product');
		expect(diffProduct(undefined, prod(), false)).toEqual([]);
	});
});

describe('scoreCandidates', () => {
	const football = [raw(1, 'Retro football shirt Belgium 1986', 'Football shirt', 70), raw(2, 'Vintage football shirt Ajax', 'Football shirt', 80), raw(3, 'Football scarf retro', 'Scarf', 25)];
	const similar = [raw(4, 'Classic football shirt Brazil 1970', 'Football shirt', 75), raw(5, 'Retro football jersey Italy', 'Football shirt', 65), raw(6, 'Football scarf vintage', 'Scarf', 20)];
	const unrelated = [raw(7, 'Organic face cream', 'Skincare', 30), raw(8, 'Lavender soap bar', 'Soap', 8), raw(9, 'Rose serum', 'Skincare', 40)];
	const prof = (domain: string, products: RawProduct[]) => ({
		domain,
		products,
		prices: products.map((p) => Number(p.variants![0].price)),
		currency: 'EUR',
		country: 'BE',
		language: 'en'
	});
	it('scores the similar store higher', () => {
		const [a, b] = scoreCandidates(prof('own.be', football), [prof('similar.be', similar), prof('beauty.be', unrelated)]);
		expect(a.score).toBeGreaterThan(b.score);
		expect(a.reasons.join(' ')).toContain('football');
	});
	it('builds heuristic queries', () => {
		const qs = heuristicQueries({ storeName: 'Own', domain: 'own.be', products: football, vector: catalogVector(football), language: 'nl', country: 'BE' });
		expect(qs.length).toBeGreaterThan(1);
		expect(qs.some((q) => q.includes('webshop'))).toBe(true);
	});
});

describe('headlines', () => {
	it('summarizes a sale campaign', () => {
		const stores = new Map([['s1', { id: 's1', name: 'Rival', domain: 'rival.be' } as never]]);
		const changes = Array.from({ length: 4 }, (_, i) => ({ id: String(i), store_id: 's1', product_id: 'p', kind: 'sale_start' as const, old_value: 50, new_value: 40, pct: -20, detected_at: '' }));
		expect(headlines(changes, stores)[0]).toContain('put 4 products on sale');
	});
});
