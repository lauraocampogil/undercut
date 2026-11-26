import { listProducts, lockRows } from '#lib/server/public.ts';
import { fullAccess } from '#lib/server/access.ts';
import { translateLabels } from '#lib/server/translate.ts';
import { langOf } from '#lib/app-i18n.ts';

// The whole database inside the app. Free accounts see 15 products; the others are listed blurred, without
// names, icons or complaints (that data never leaves the server).
export const load = async ({ locals, cookies }) => {
	const full = fullAccess(locals);
	const all = await listProducts();
	let rows = lockRows(all, full).map((r, i) => ({ ...r, rank: i + 1 }));
	const lang = langOf(cookies);
	if (lang !== 'en') {
		const tr = await translateLabels(rows.filter((r) => !r.locked && r.stats.topComplaint).map((r) => r.stats.topComplaint!.label), lang).catch(() => ({}) as Record<string, string>);
		rows = rows.map((r) => (r.stats.topComplaint && tr[r.stats.topComplaint.label] ? { ...r, stats: { ...r.stats, topComplaint: { ...r.stats.topComplaint, label: tr[r.stats.topComplaint.label] } } } : r));
	}

	// categories: how many products, and the average share of bad reviews (computed on all products, names never sent)
	const cats = new Map<string, { n: number; sum: number; rated: number }>();
	for (const r of all) {
		const g = r.app.genre || 'Other';
		const c = cats.get(g) ?? { n: 0, sum: 0, rated: 0 };
		c.n++;
		if (r.stats.complaintRate != null) (c.sum += r.stats.complaintRate), c.rated++;
		cats.set(g, c);
	}
	const categories = [...cats.entries()]
		.map(([name, c]) => ({ name, n: c.n, avg: c.rated ? Math.round(c.sum / c.rated) : null }))
		.sort((a, b) => b.n - a.n);

	return {
		full,
		rows,
		categories,
		stats: {
			products: all.length,
			reviews: all.reduce((s, r) => s + r.stats.reviews, 0),
			claimed: all.filter((r) => r.owner).length
		},
		locked: rows.filter((r) => r.locked).length
	};
};
