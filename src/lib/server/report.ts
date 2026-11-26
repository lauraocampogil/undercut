// What a report shows, counted once on the server: the answer, the topics side by side, the proof.
import type { Analysis } from '#lib/review-types.ts';
import { count } from './reviewdb.ts';
import { MIN_PROOF } from '#lib/signal.ts';

const COLORS = ['#111111', '#2f6fed', '#f08a24', '#18a058', '#8b5cf6', '#e5484d'];
const WEEK = 7 * 864e5;

export function summary(a: Analysis) {
	const products = [a.main, ...a.competitors];
	const complaints = a.themes.filter((t) => t.type === 'complaint');
	const share = (n: number, i: number) => (products[i].reviews.length ? n / products[i].reviews.length : 0);
	const topics = complaints
		.map((t) => ({ id: t.id, label: t.label, counts: products.map((p) => count(p, t.id)) }))
		.filter((t) => t.counts[0] > 0)
		.sort((x, y) => y.counts[0] - x.counts[0]);
	const top = topics[0];
	let answer = null;
	if (top) {
		const rivals = top.counts.slice(1).map((c, k) => ({ name: a.competitors[k].app.name, n: c, share: share(c, k + 1) }));
		const avg = rivals.length ? rivals.reduce((s, x) => s + x.share, 0) / rivals.length : 0;
		const mine = share(top.counts[0], 0);
		const best = [...rivals].sort((x, y) => x.share - y.share)[0];
		const thisWeek = a.main.reviews.filter((r) => r.theme === top.id && Date.now() - Date.parse(r.date) < WEEK).length;
		answer = { topic: top.label, n: top.counts[0], times: avg > 0 ? Math.round((mine / avg) * 10) / 10 : null, thisWeek, best: best && best.share < mine ? best : null };
	}
	const quotes = top
		? a.main.reviews
				.filter((r) => r.theme === top.id && r.text.length > 40 && (!r.stars || r.stars <= 3))
				.sort((x, y) => y.date.localeCompare(x.date))
				.slice(0, 4)
				.map((r) => ({ text: r.text.slice(0, 260), stars: r.stars, source: r.source ?? 'appstore', date: r.date.slice(0, 10), url: r.url ?? '' }))
		: [];
	const ideas = [...(a.ideas ?? [])].sort((x, y) => Number(y.count >= MIN_PROOF) - Number(x.count >= MIN_PROOF) || y.count - x.count);
	return {
		colors: products.map((_, i) => COLORS[i % COLORS.length]),
		names: products.map((p) => p.app.name),
		answer,
		topics: topics.slice(0, 6).map((t) => ({ ...t, max: Math.max(1, ...t.counts) })),
		praise: a.themes
			.filter((t) => t.type === 'praise')
			.map((t) => ({ label: t.label, counts: products.map((p) => count(p, t.id)) }))
			.filter((t) => t.counts.some((c) => c > 0))
			.sort((x, y) => y.counts.reduce((s, c) => s + c, 0) - x.counts.reduce((s, c) => s + c, 0))
			.slice(0, 4),
		quotes,
		ideas: ideas.slice(0, 3)
	};
}


// ---------- v2: what users want, one product ----------
import type { ThemeKind } from '#lib/review-types.ts';
/** The ranked list of things users want from the main product, with counts, share, this month vs last month. */
export function wants(a: Analysis) {
	const products = [a.main, ...a.competitors];
	const complaints = a.themes.filter((t) => t.type === 'complaint');
	const total = complaints.reduce((s, t) => s + count(a.main, t.id), 0);
	const list = complaints
		.map((t) => {
			const rs = a.main.reviews.filter((r) => r.theme === t.id);
			// change since the last monthly report (only for followed products: store feeds only hold recent reviews, so dates can't give a trend)
			const base = a.watch ? a.watch.counts[`0|${t.id}`] : undefined;
			const q = rs.find((r) => r.text.length > 30 && (!r.stars || r.stars <= 3));
			return {
				id: t.id,
				label: t.label,
				kind: (t.kind ?? 'other') as ThemeKind,
				n: rs.length,
				share: total ? Math.round((rs.length / total) * 100) : 0,
				delta: a.watch && base != null ? rs.length - base : null,
				isNew: Boolean(a.watch) && base == null,
				quote: q ? q.text.slice(0, 140) : '',
				quoteId: q?.id ?? '',
				others: products.slice(1).map((p) => count(p, t.id))
			};
		})
		.filter((x) => x.n > 0)
		.sort((x, y) => y.n - x.n);
	const dates = a.main.reviews.map((r) => r.date).filter(Boolean).sort();
	return {
		total,
		read: a.main.reviews.length,
		from: dates[0] ?? '',
		to: dates[dates.length - 1] ?? '',
		list,
		newCount: list.filter((x) => x.isNew).length,
		rising: list.filter((x) => (x.delta ?? 0) > 0).length,
		falling: list.filter((x) => (x.delta ?? 0) < 0).length,
		followed: Boolean(a.watch),
		hasKinds: a.themes.some((t) => t.kind)
	};
}
