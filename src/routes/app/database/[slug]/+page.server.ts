import { error } from '@sveltejs/kit';
import { getProduct, isSecondHand, openProduct, saveDbProduct } from '#lib/server/public.ts';
import { localize } from '#lib/server/translate.ts';
import { langOf } from '#lib/app-i18n.ts';
import { wants } from '#lib/server/report.ts';
import { count } from '#lib/server/reviewdb.ts';
import { fullAccess } from '#lib/server/access.ts';

// A database product inside the app: what its users ask for, side by side with similar products, and the reviews.
export const load = async ({ params, locals, cookies }) => {
	const p = await openProduct(params.slug, fullAccess(locals));
	if (!p) {
		const exists = await getProduct(params.slug).catch(() => null);
		if (!exists) error(404, 'Product not found');
		return { locked: true as const, rebuilding: isSecondHand(exists.analysis.id), slug: params.slug };
	}
	const a = p.analysis;
	const w = await localize(wants(a), a, langOf(cookies), () => saveDbProduct(p));
	const products = [a.main, ...a.competitors];
	const bad = (x: typeof a.main) => {
		if (x.badShare != null) return x.badShare;
		const rated = x.reviews.filter((r) => r.stars);
		return rated.length ? Math.round((rated.filter((r) => r.stars <= 3).length / rated.length) * 100) : null;
	};
	const rows = w.list
		.filter((i) => i.kind !== 'reliability')
		.slice(0, 10)
		.map((i) => ({ id: i.id, label: i.label, kind: i.kind, counts: products.map((x) => count(x, i.id)) }));
	return {
		locked: false as const,
		rebuilding: false,
		slug: p.slug,
		updatedAt: p.updatedAt,
		app: { name: a.main.app.name, icon: a.main.app.icon, genre: a.main.app.genre, url: a.main.app.url },
		w,
		compare: {
			products: products.map((x, i) => ({ name: x.app.name, icon: x.app.icon, bad: bad(x), reviews: x.reviews.length })),
			rows
		}
	};
};
