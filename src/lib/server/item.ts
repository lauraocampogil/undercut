// One thing users want, shown the same way for a private report and for a database product.
import type { Analysis } from '#lib/review-types.ts';
import { count, storeScreens } from './reviewdb.ts';
import { listProducts, productSlug } from './public.ts';
import { cachedTexts, labelsFor } from './translate.ts';
import { signalOf } from '#lib/signal.ts';

const COLORS = ['#111111', '#2f6fed', '#f08a24', '#18a058', '#8b5cf6', '#e5484d'];
export const MAX_TRANSLATE = 60; // reviews translated per topic

/** Returns null when the topic isn't in this report. `save` is called when something new was kept (screenshots, translations). */
export async function itemView(a: Analysis, themeId: string, save: () => void | Promise<void>, lang = 'en') {
	const t = a.themes.find((x) => x.id === themeId && x.type === 'complaint');
	if (!t) return null;
	const complaints = a.themes.filter((x) => x.type === 'complaint');
	const total = complaints.reduce((s, x) => s + count(a.main, x.id), 0);
	const rank = complaints.map((x) => ({ id: x.id, n: count(a.main, x.id) })).sort((p, q) => q.n - p.n).findIndex((x) => x.id === t.id) + 1;
	const n = count(a.main, t.id);
	const base = a.watch ? a.watch.counts[`0|${t.id}`] : undefined;
	const products = [a.main, ...a.competitors];
	const others = products.map((p, i) => ({ name: p.app.name, icon: p.app.icon, slug: productSlug(p.app), n: count(p, t.id), color: COLORS[i % COLORS.length], main: i === 0 }));
	// the similar product with the fewest complaints about it: show how it looks, so the founder can see how it does it
	const bestI = others.map((o, i) => ({ ...o, i })).filter((o) => !o.main).sort((x, y) => x.n - y.n)[0]?.i;
	const best = bestI != null && others[bestI].n < n ? products[bestI] : null;
	let changed = false;
	for (const p of [a.main, ...(best ? [best] : [])]) {
		if (!p.app.screenshots) {
			p.app.screenshots = await storeScreens(p.app).catch(() => []);
			changed = true;
		}
	}
	if (changed) await save();
	const labels = lang === 'en' ? {} : await labelsFor(a, lang, save);
	const texts = cachedTexts(a, lang);
	const how = best ? (a.how?.[howKey(t.id, lang)] ?? null) : null;
	const reviews = a.main.reviews
		.filter((r) => r.theme === t.id)
		.sort((x, y) => y.date.localeCompare(x.date))
		.map((r) => {
			const tr = texts[r.id];
			const source = r.source ?? 'appstore';
			// the App Store has no public link to one review: we only link where the link opens the review itself
			const url = source === 'appstore' ? '' : (r.url ?? '');
			return { id: r.id, stars: r.stars, title: tr?.title ?? r.title, text: tr?.text ?? r.text, origTitle: r.title, origText: r.text, translated: Boolean(tr), date: r.date.slice(0, 10), version: r.version ?? '', source, url };
		});
	return {
		app: { name: a.main.app.name, icon: a.main.app.icon, screenshots: a.main.app.screenshots ?? [], store: a.main.app.url },
		best: best
			? {
					name: best.app.name,
					icon: best.app.icon,
					slug: productSlug(best.app),
					inDb: (await listProducts()).some((r) => r.slug === productSlug(best.app)),
					screenshots: best.app.screenshots ?? [],
					store: /^https?:\/\//.test(best.app.url) ? best.app.url : '',
					n: count(best, t.id),
					how: how ? { points: how.points, thin: how.thin, proof: how.proof.map((id) => best.reviews.find((r) => r.id === id)).filter((r) => r != null).map((r) => ({ id: r.id, stars: r.stars, text: texts[r.id]?.text ?? r.text, date: r.date.slice(0, 10) })) } : null
				}
			: null,
		item: { id: t.id, label: labels[t.id] ?? t.label, kind: t.kind ?? 'other' },
		rank,
		n,
		share: total ? Math.round((n / total) * 100) : 0,
		delta: a.watch && base != null ? n - base : null,
		signal: signalOf(n),
		reviews,
		untranslated: lang === 'en' ? 0 : reviews.slice(0, MAX_TRANSLATE).filter((r) => !r.translated).length + (how ? how.proof.filter((id) => !texts[id]).length : 0),
		others,
		insight: a.insights?.[insightKey(t.id, lang)] ?? null,
		claimed: Boolean(a.claimed),
		fix: a.main.fixes?.[t.id] ?? null
	};
}
export const howKey = (themeId: string, lang: string) => `${themeId}|${lang}`;
export const insightKey = (themeId: string, lang: string) => (lang === 'en' ? themeId : `${themeId}|${lang}`);

/** The reviews of a topic to translate (most recent first). */
export const reviewIds = (a: Analysis, themeId: string, lang = 'en') => [
	...(a.how?.[howKey(themeId, lang)]?.proof ?? []),
	...a.main.reviews
		.filter((r) => r.theme === themeId)
		.sort((x, y) => y.date.localeCompare(x.date))
		.slice(0, MAX_TRANSLATE)
		.map((r) => r.id)
];
