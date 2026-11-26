// Database pages made from someone else's analysis are rebuilt one by one: the product is analysed on its own,
// so its competitors are chosen for it (Wix → Webflow, Squarespace…, not the products of another report).
import { analyze } from './reviewdb.ts';
import { indexAnalysis, secondHandSlugs } from './public.ts';

let running = false;
export async function rebuildSecondHand(n = 3, visibleFirst = false) {
	if (running) return { done: 0, left: -1 };
	running = true;
	let done = 0;
	try {
		// best-known products first (most store ratings)
		const todo = (await secondHandSlugs()).sort((x, y) => (visibleFirst ? Number(x.hidden) - Number(y.hidden) : Number(y.hidden) - Number(x.hidden)) || (y.app.count ?? 0) - (x.app.count ?? 0));
		const batch = todo.slice(0, n);
		// 3 at a time: about 40 s each
		for (let i = 0; i < batch.length; i += 3) {
			await Promise.all(
				batch.slice(i, i + 3).map(async (p) => {
					try {
						const a = await analyze(p.url || p.name, { ...p.app, screenshots: undefined }); // same product, same page
						await indexAnalysis(a);
						done++;
					} catch (e) {
						console.error('[rebuild]', p.slug, (e as Error).message);
					}
				})
			);
		}
		return { done, left: Math.max(0, todo.length - done) };
	} finally {
		running = false;
	}
}

/** Analyse one database page again, now (its competitors are chosen for it). */
export async function rebuildSlug(slug: string) {
	const p = (await secondHandSlugs()).find((x) => x.slug === slug);
	if (!p) return { ok: false, reason: 'not in the list to rebuild' };
	const a = await analyze(p.url || p.name, { ...p.app, screenshots: undefined });
	await indexAnalysis(a);
	return { ok: true, competitors: a.competitors.map((c) => c.app.name) };
}
