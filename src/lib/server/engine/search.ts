import { config } from '../config';

/** Domains that are never "competitors": marketplaces, social networks, media, search engines. */
const BLOCKLIST = [
	'amazon.', 'ebay.', 'etsy.', 'aliexpress.', 'alibaba.', 'temu.', 'shein.', 'wish.', 'walmart.',
	'zalando.', 'bol.com', 'cdiscount.', 'fnac.', 'otto.de', 'allegro.', 'vinted.', 'depop.', 'asos.',
	'google.', 'youtube.', 'facebook.', 'instagram.', 'pinterest.', 'tiktok.', 'twitter.', 'x.com',
	'reddit.', 'linkedin.', 'wikipedia.', 'quora.', 'medium.', 'trustpilot.', 'tripadvisor.',
	'shopify.com', 'myshopify.com', 'wordpress.', 'wix.', 'squarespace.', 'idealo.', 'kieskeurig.',
	'beslist.', 'pricerunner.', 'kelkoo.', 'nytimes.', 'theguardian.', 'vogue.', 'gq.'
];

export const isBlocked = (domain: string) => BLOCKLIST.some((b) => domain.includes(b));

export interface SearchContext {
	country: string | null; // "BE"
	language: string | null; // "fr"
}

/** Returns the hostnames found for a query, in order of appearance. */
export async function searchDomains(query: string, ctx: SearchContext): Promise<string[]> {
	if (config.serpApiKey) return serpApi(query, ctx);
	if (config.braveKey) return brave(query, ctx);
	if (config.fakeShopifyUrl) {
		const res = await fetch(`${config.fakeShopifyUrl}/__search?q=${encodeURIComponent(query)}`);
		return res.ok ? ((await res.json()) as string[]) : [];
	}
	return [];
}

const hostOf = (u: string | undefined) => {
	if (!u) return null;
	try {
		return new URL(u).hostname.replace(/^www\./, '').toLowerCase();
	} catch {
		return null;
	}
};

async function serpApi(query: string, ctx: SearchContext): Promise<string[]> {
	const params = new URLSearchParams({ engine: 'google', q: query, num: '20', api_key: config.serpApiKey });
	if (ctx.country) params.set('gl', ctx.country.toLowerCase());
	if (ctx.language) params.set('hl', ctx.language);
	const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(20_000) });
	if (!res.ok) return [];
	const json = (await res.json()) as {
		organic_results?: { link?: string }[];
		shopping_results?: { link?: string; product_link?: string }[];
		inline_shopping_results?: { link?: string }[];
	};
	const links = [
		...(json.shopping_results ?? []).map((r) => r.link),
		...(json.inline_shopping_results ?? []).map((r) => r.link),
		...(json.organic_results ?? []).map((r) => r.link)
	];
	return links.map(hostOf).filter((h): h is string => Boolean(h));
}

async function brave(query: string, ctx: SearchContext): Promise<string[]> {
	const params = new URLSearchParams({ q: query, count: '20' });
	if (ctx.country) params.set('country', ctx.country.toLowerCase());
	if (ctx.language) params.set('search_lang', ctx.language);
	const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
		headers: { accept: 'application/json', 'x-subscription-token': config.braveKey },
		signal: AbortSignal.timeout(20_000)
	});
	if (!res.ok) return [];
	const json = (await res.json()) as { web?: { results?: { url?: string }[] } };
	return (json.web?.results ?? []).map((r) => hostOf(r.url)).filter((h): h is string => Boolean(h));
}
