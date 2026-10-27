import type { Product } from '$lib/types';
import { config } from '../config';

const UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';

export interface RawVariant {
	price: string | number;
	compare_at_price: string | number | null;
	available?: boolean;
}
export interface RawProduct {
	id: number;
	title: string;
	handle: string;
	product_type?: string;
	vendor?: string;
	tags?: string[] | string;
	created_at?: string;
	published_at?: string;
	images?: { src: string }[];
	variants?: RawVariant[];
}

export interface StoreMeta {
	name: string | null;
	currency: string | null;
	country: string | null;
	language: string | null;
	/** Homepage title + meta description: says what the brand sells even with few products. */
	about?: string | null;
}

/** "https://www.Store.com/collections/x" → "store.com" */
export function normalizeDomain(input: string): string | null {
	let s = input.trim().toLowerCase();
	if (!s) return null;
	if (!/^https?:\/\//.test(s)) s = 'https://' + s;
	try {
		const host = new URL(s).hostname.replace(/^www\./, '');
		return host.includes('.') ? host : null;
	} catch {
		return null;
	}
}

/** In development, FAKE_SHOPIFY_URL routes every store to a local test server. */
const viaFake = (url: string) => {
	if (!config.fakeShopifyUrl) return url;
	const u = new URL(url);
	return `${config.fakeShopifyUrl}/${u.hostname.replace(/^www\./, '')}${u.pathname}${u.search}`;
};

async function get(url: string, timeoutMs: number, accept = 'application/json'): Promise<Response | null> {
	url = viaFake(url);
	try {
		const res = await fetch(url, {
			headers: { 'user-agent': UA, accept },
			redirect: 'follow',
			signal: AbortSignal.timeout(timeoutMs)
		});
		return res.ok ? res : null;
	} catch {
		return null;
	}
}

/** Tries with and without "www." and returns the first page of products (or null if not Shopify / blocked). */
async function firstPage(domain: string, timeoutMs: number): Promise<{ base: string; products: RawProduct[] } | null> {
	for (const base of [`https://${domain}`, `https://www.${domain}`]) {
		const res = await get(`${base}/products.json?limit=250&page=1`, timeoutMs);
		if (!res) continue;
		try {
			const json = (await res.json()) as { products?: RawProduct[] };
			if (Array.isArray(json.products)) return { base, products: json.products };
		} catch {
			/* not JSON → not Shopify */
		}
	}
	return null;
}

/** Reads the public catalog. At most maxPages × 250 products. */
export async function fetchCatalog(
	domain: string,
	{ maxPages = 8, timeoutMs = 10_000 } = {}
): Promise<RawProduct[] | null> {
	const first = await firstPage(domain, timeoutMs);
	if (!first) return null;
	const all = [...first.products];
	let page = 2;
	let last = first.products;
	while (last.length === 250 && page <= maxPages) {
		const res = await get(`${first.base}/products.json?limit=250&page=${page}`, timeoutMs);
		if (!res) break;
		try {
			last = ((await res.json()) as { products?: RawProduct[] }).products ?? [];
		} catch {
			break;
		}
		all.push(...last);
		page++;
	}
	return all;
}

/** Name, currency, country and language from the homepage HTML. */
export async function fetchMeta(domain: string): Promise<StoreMeta> {
	const meta: StoreMeta = { name: null, currency: null, country: null, language: null };
	const res = await get(`https://${domain}`, 8_000, 'text/html');
	if (!res) return meta;
	const html = (await res.text()).slice(0, 400_000);
	const pick = (re: RegExp) => html.match(re)?.[1]?.trim() ?? null;
	meta.name =
		pick(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)/i) ??
		pick(/<title[^>]*>([^<|–—-]+)/i);
	meta.currency = pick(/Shopify\.currency\s*=\s*\{[^}]*"active"\s*:\s*"([A-Z]{3})"/) ?? pick(/"currency"\s*:\s*"([A-Z]{3})"/);
	meta.country = pick(/Shopify\.country\s*=\s*"([A-Z]{2})"/);
	meta.language = pick(/<html[^>]+lang=["']([a-zA-Z-]+)/i)?.slice(0, 2).toLowerCase() ?? null;
	if (meta.name) meta.name = decodeEntities(meta.name);
	const about = [
		pick(/<title[^>]*>([^<]+)/i),
		pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i),
		pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i)
	].filter(Boolean);
	meta.about = about.length ? decodeEntities(about.join(' ')) : null;
	return meta;
}

function decodeEntities(s: string) {
	return s
		.replace(/&amp;/g, '&')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export function tagsOf(p: RawProduct): string[] {
	if (Array.isArray(p.tags)) return p.tags;
	return (p.tags ?? '')
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean);
}

/** Converts a Shopify product to our model (price = cheapest variant). */
export function toProduct(raw: RawProduct, storeId: string, nowIso: string): Product | null {
	const variants = raw.variants ?? [];
	if (!variants.length) return null;
	const prices = variants.map((v) => Number(v.price)).filter((n) => Number.isFinite(n) && n > 0);
	if (!prices.length) return null;
	const price = Math.min(...prices);
	const compares = variants
		.map((v) => Number(v.compare_at_price))
		.filter((n) => Number.isFinite(n) && n > price);
	return {
		id: `${storeId}:${raw.id}`,
		store_id: storeId,
		shopify_id: raw.id,
		handle: raw.handle,
		title: raw.title,
		product_type: raw.product_type?.trim() || null,
		vendor: raw.vendor?.trim() || null,
		tags: tagsOf(raw).slice(0, 30),
		image: raw.images?.[0]?.src ?? null,
		price,
		compare_at: compares.length ? Math.max(...compares) : null,
		available: variants.some((v) => v.available !== false),
		shop_created_at: raw.created_at ?? raw.published_at ?? null,
		first_seen_at: nowIso,
		updated_at: nowIso
	};
}

export const productUrl = (domain: string, handle: string) => `https://${domain}/products/${handle}`;
