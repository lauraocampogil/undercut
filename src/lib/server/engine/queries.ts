import { config } from '../config';
import type { RawProduct } from './shopify';
import { topTerms, type Vec } from './text';

const BUY: Record<string, string> = { en: 'buy', es: 'comprar', fr: 'acheter', nl: 'kopen', de: 'kaufen', it: 'comprare', pt: 'comprar' };
const SHOP: Record<string, string> = { en: 'online shop', es: 'tienda online', fr: 'boutique en ligne', nl: 'webshop', de: 'onlineshop', it: 'negozio online', pt: 'loja online' };

function counts<T>(items: T[]): [T, number][] {
	const m = new Map<T, number>();
	for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
	return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export interface QueryInput {
	storeName: string | null;
	domain: string;
	products: RawProduct[];
	vector: Vec;
	language: string | null;
	country: string | null;
}

/** Queries without an LLM: product types + most distinctive terms + resold brands. */
export function heuristicQueries(q: QueryInput): string[] {
	const lang = q.language && BUY[q.language] ? q.language : 'en';
	const types = counts(q.products.map((p) => p.product_type?.trim().toLowerCase()).filter(Boolean) as string[])
		.slice(0, 3)
		.map(([t]) => t);
	const terms = topTerms(q.vector, 6);
	const own = (q.storeName ?? '').toLowerCase();
	const vendors = counts(q.products.map((p) => p.vendor?.trim()).filter(Boolean) as string[])
		.map(([v]) => v)
		.filter((v) => !own.includes(v.toLowerCase()) && !q.domain.includes(v.toLowerCase().replace(/\s+/g, '')))
		.slice(0, 2);

	const out = new Set<string>();
	for (const t of types) out.add(`${t} ${SHOP[lang]}`);
	if (terms.length >= 2) out.add(`${terms[0]} ${terms[1]} ${BUY[lang]}`);
	if (terms.length >= 4) out.add(`${terms[2]} ${terms[3]} ${SHOP[lang]}`);
	if (terms.length >= 1) out.add(`${terms[0]} ${SHOP[lang]}`);
	for (const v of vendors) out.add(`${v} ${BUY[lang]}`);
	// Shopify stores all use /collections/ URLs: this biases results toward them.
	const list = [...out].slice(0, 4);
	if (types[0]) list.push(`${types[0]} inurl:collections`);
	if (terms.length >= 2) list.push(`${terms[0]} ${terms[1]} inurl:collections`);
	return [...new Set(list)].slice(0, 6);
}

/** With ANTHROPIC_API_KEY, an LLM writes more natural queries. On failure we fall back to heuristics. */
export async function buildQueries(q: QueryInput): Promise<string[]> {
	const fallback = heuristicQueries(q);
	if (!config.anthropicKey) return fallback;

	const sample = q.products.slice(0, 40).map((p) => `- ${p.title}${p.product_type ? ` (${p.product_type})` : ''}`);
	const prompt = `You help find direct competitors of an online store.
Store: ${q.storeName ?? q.domain} (${q.domain}). Country: ${q.country ?? 'unknown'}. Language: ${q.language ?? 'unknown'}.
Most characteristic words: ${topTerms(q.vector, 15).join(', ')}.
Sample products:
${sample.join('\n')}

Write 6 Google search queries, in the store's language, that a shopper would type to find OTHER independent online shops selling the same kind of products to the same audience. Avoid the store's own name and avoid marketplaces. Answer ONLY with a JSON array of strings.`;

	try {
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-api-key': config.anthropicKey,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model: config.anthropicModel,
				max_tokens: 400,
				messages: [{ role: 'user', content: prompt }]
			}),
			signal: AbortSignal.timeout(20_000)
		});
		if (!res.ok) return fallback;
		const json = (await res.json()) as { content?: { type: string; text?: string }[] };
		const text = json.content?.find((c) => c.type === 'text')?.text ?? '';
		const arr = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
		const list = (Array.isArray(arr) ? arr : []).filter((s): s is string => typeof s === 'string' && s.length > 3);
		return list.length ? list.slice(0, 6) : fallback;
	} catch {
		return fallback;
	}
}
