import { count, fixScore, fixVerified, listAnalyses } from '#lib/server/reviewdb.ts';
import { productSlug } from '#lib/server/public.ts';

// The products this account claimed: their fix score, what is left to fix, and the badge.
export const load = () => {
	const claimed = listAnalyses()
		.filter((a) => a.claimed)
		.map((a) => {
			const complaints = a.themes.filter((t) => t.type === 'complaint').map((t) => ({ label: t.label, n: count(a.main, t.id), status: a.main.fixes?.[t.id]?.status ?? 'none', verified: fixVerified(a.main, t.id) }));
			return {
				id: a.id,
				slug: productSlug(a.main.app),
				name: a.main.app.name,
				icon: a.main.app.icon,
				genre: a.main.app.genre,
				score: fixScore(a),
				open: complaints.filter((c) => c.status === 'none').sort((x, y) => y.n - x.n).slice(0, 3),
				working: complaints.filter((c) => c.status === 'known' || c.status === 'working').length,
				fixed: complaints.filter((c) => c.status === 'fixed').length,
				verified: complaints.filter((c) => c.verified).length,
				total: complaints.length
			};
		});
	return { claimed };
};
