import { listProducts } from '#lib/server/public.ts';

// For AI assistants (llms.txt): what Undercut is, in plain words, and where the product pages are.
export const GET = async () => {
	const base = 'https://getundercut.app';
	const rows = (await listProducts().catch(() => [])).slice(0, 200);
	const body = `# Undercut

> Undercut tells founders what to improve in their product, ranked and with proof, from bad reviews. It reads App Store, Google Play, Hacker News and GitHub reviews of a product and of similar products, groups what users ask for, and shows the reviews behind every item.

## What it does
- Paste a product (name, website or store link): Undercut finds similar products and reads their 1 to 3 star reviews.
- It ranks what users want: features, pricing, experience, support, bugs, with the number of reviews behind each.
- For every item: what users mean, what to do, how a similar product with fewer complaints handles it, and the real reviews as proof.
- Follow a product to get a monthly report: new asks, what is rising and what is going down.

## Who it is for
Indie hackers, solo founders and small product teams who want to know what to build next and how they compare with similar products.

## Pricing
Free to try. Full database: 49 EUR per month.

## Links
- Home: ${base}/
- Waitlist and beta: ${base}/waitlist
- Privacy: ${base}/privacy

## Product pages
${rows.map((r) => `- [${r.app.name}: what users complain about](${base}/p/${r.slug})`).join('\n')}
`;
	return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'max-age=3600' } });
};
