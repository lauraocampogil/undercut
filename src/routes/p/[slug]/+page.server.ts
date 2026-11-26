import { error } from '@sveltejs/kit';
import { getProduct, listProducts, lockRows, productSlug } from '#lib/server/public.ts';
import { count, fixVerified, listAnalyses } from '#lib/server/reviewdb.ts';
import { fullAccess } from '#lib/server/access.ts';
import { summary } from '#lib/server/report.ts';

/** Who sees every review and topic: paying users, the product's owner, the 15 free products, and anyone who analysed it. */
async function canSee(slug: string, owner: string | null, locals: App.Locals) {
	if (fullAccess(locals)) return true;
	if (owner && owner === locals.ws) return true;
	const free = lockRows(await listProducts(), false).filter((r) => !r.locked).map((r) => r.slug);
	if (free.includes(slug)) return true;
	if (!locals.user) return false;
	try {
		return listAnalyses().some((a) => productSlug(a.main.app) === slug);
	} catch {
		return false;
	}
}

export const load = async ({ params, locals }) => {
	const p = await getProduct(params.slug);
	if (!p) error(404, 'This product is not on Undercut yet.');
	const a = p.analysis;
	const head = { slug: p.slug, owner: Boolean(p.owner), score: p.score, stats: p.stats, updatedAt: p.updatedAt };
	if (await canSee(p.slug, p.owner, locals)) return { open: true as const, p: head, a, report: summary(a), ideas: p.ideas ?? [], verified: Object.fromEntries(a.themes.map((t) => [t.id, fixVerified(a.main, t.id)])) };
	// locked: only the headline numbers, never the reviews
	const top = a.themes
		.filter((t) => t.type === 'complaint')
		.map((t) => ({ label: t.label, n: count(a.main, t.id) }))
		.sort((x, y) => y.n - x.n)
		.slice(0, 5);
	return {
		open: false as const,
		signedIn: Boolean(locals.user),
		p: head,
		app: a.main.app,
		competitors: a.competitors.map((c) => ({ name: c.app.name, icon: c.app.icon, slug: productSlug(c.app) })),
		total: a.main.reviews.length,
		ideaCount: p.ideas?.length ?? 0,
		top
	};
};
