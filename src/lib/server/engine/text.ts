import type { RawProduct } from './shopify';
import { tagsOf } from './shopify';

// Words that say nothing about the niche (EN/ES/FR/NL/DE + shop jargon).
const STOP = new Set(
	`a an and the of for with in on to by from at or new sale size color colour black white
	 de la el los las y en con para por del un una al lo su sus
	 le les des du et au aux pour avec sur un une
	 het een en van voor met op in de te
	 der die das und mit für von im
	 xs s m l xl xxl xxxl pack set kit pcs pc piece pieces cm mm ml g kg oz inch
	 men women woman man unisex kids homme femme hombre mujer niño niña dames heren
	 default title gift card giftcard cadeau tarjeta regalo shipping protection
	 sale outlet bestseller best seller limited edition collection collectie`
		.split(/\s+/)
		.filter(Boolean)
);

export function tokenize(s: string): string[] {
	return s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9\s-]/g, ' ')
		.split(/[\s-]+/)
		.filter((t) => t.length > 2 && !STOP.has(t) && !/^\d+$/.test(t));
}

export type Vec = Map<string, number>;

/** Catalog text profile: product type weighs more than title, and title more than tags. */
export function catalogVector(products: RawProduct[]): Vec {
	const v: Vec = new Map();
	const add = (t: string, w: number) => v.set(t, (v.get(t) ?? 0) + w);
	for (const p of products) {
		for (const t of tokenize(p.title)) add(t, 1);
		for (const t of tokenize(p.product_type ?? '')) add(t, 2);
		for (const tag of tagsOf(p).slice(0, 10)) for (const t of tokenize(tag)) add(t, 0.5);
	}
	// log-TF: a term repeated 500 times must not crush the rest
	for (const [k, n] of v) v.set(k, 1 + Math.log(n));
	return v;
}

/** Weights each vector by IDF computed over the set of compared stores. */
export function applyIdf(vectors: Vec[]): Vec[] {
	const df = new Map<string, number>();
	for (const v of vectors) for (const k of v.keys()) df.set(k, (df.get(k) ?? 0) + 1);
	const n = vectors.length;
	return vectors.map((v) => {
		const out: Vec = new Map();
		for (const [k, w] of v) out.set(k, w * Math.log(1 + n / (df.get(k) ?? 1)));
		return out;
	});
}

export function cosine(a: Vec, b: Vec): number {
	let dot = 0,
		na = 0,
		nb = 0;
	for (const [k, w] of a) {
		na += w * w;
		const x = b.get(k);
		if (x) dot += w * x;
	}
	for (const w of b.values()) nb += w * w;
	return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export function topTerms(v: Vec, n: number): string[] {
	return [...v.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, n)
		.map(([k]) => k);
}

export function sharedTerms(a: Vec, b: Vec, n: number): string[] {
	return [...a.entries()]
		.filter(([k]) => b.has(k))
		.map(([k, w]) => [k, w * (b.get(k) ?? 0)] as const)
		.sort((x, y) => y[1] - x[1])
		.slice(0, n)
		.map(([k]) => k);
}

export function quantile(values: number[], q: number): number {
	if (!values.length) return 0;
	const s = [...values].sort((a, b) => a - b);
	const pos = (s.length - 1) * q;
	const lo = Math.floor(pos),
		hi = Math.ceil(pos);
	return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

export const median = (values: number[]) => quantile(values, 0.5);
