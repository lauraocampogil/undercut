import { listProducts, lockRows, productsWithIdeas } from '#lib/server/public.ts';
import { listAnalyses } from '#lib/server/reviewdb.ts';
import { fullAccess } from '#lib/server/access.ts';
import { dailyIdeas } from '#lib/server/opportunities.ts';
import type { Idea } from '#lib/review-types.ts';

const FREE_PRODUCTS = 3; // free accounts see the ideas of this many database products (plus their own)

export const load = async ({ locals }) => {
	void dailyIdeas(); // fills the database with new ideas once a day, in the background
	const full = fullAccess(locals);
	const all = await productsWithIdeas().catch(() => []);
	const free = new Set(lockRows(await listProducts().catch(() => []), false).filter((r) => !r.locked).map((r) => r.slug));

	// idea of the day: the same for everyone today, picked among the products that have ideas
	const day = Math.floor(Date.now() / 864e5);
	const pool = [...all].sort((a, b) => a.slug.localeCompare(b.slug));
	const pick = pool.length ? pool[day % pool.length] : null;
	const today = pick ? { slug: pick.slug, name: pick.name, icon: pick.icon, idea: [...pick.ideas].sort((a, b) => b.strength - a.strength)[0] } : null;

	const mine = listAnalyses()
		.filter((a) => a.ideas?.length)
		.map((a) => ({ id: a.id, name: a.main.app.name, icon: a.main.app.icon, ideas: a.ideas as Idea[] }));

	const sorted = all.sort((a, b) => b.ideasAt.localeCompare(a.ideasAt));
	const visible = full ? sorted : [...sorted.filter((p) => free.has(p.slug)), ...sorted.filter((p) => !free.has(p.slug))].slice(0, FREE_PRODUCTS);
	const genres = [...new Set(sorted.map((p) => p.genre).filter(Boolean))].sort();
	return {
		full,
		today,
		mine,
		browse: visible.map((p) => ({ slug: p.slug, name: p.name, icon: p.icon, genre: p.genre, ideas: p.ideas })),
		locked: full ? 0 : Math.max(0, sorted.length - visible.length),
		lockedIdeas: full ? 0 : sorted.filter((p) => !visible.includes(p)).reduce((s, p) => s + p.ideas.length, 0),
		genres,
		total: sorted.reduce((s, p) => s + p.ideas.length, 0)
	};
};
