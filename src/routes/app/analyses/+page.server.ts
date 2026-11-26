import { MIN_PROOF } from '#lib/signal.ts';
import { wants } from '#lib/server/report.ts';
import { readData, writeData } from '#lib/server/store.ts';
import { fail, isRedirect, redirect } from '@sveltejs/kit';
import { weeklyComplaints, analyze, listAnalyses, saveAnalysis, count, resolveProduct, slugify, getAnalysis, removeAnalysis, type Analysis } from '#lib/server/reviewdb.ts';
import { getProduct, indexAnalysis, productSlug, saveIdeas, unclaimProduct } from '#lib/server/public.ts';
import { makeIdeas } from '#lib/server/opportunities.ts';
import { fullAccess } from '#lib/server/access.ts';
import { PRICE } from '#lib/pricing.ts';
import { baseline } from '#lib/server/watch.ts';
import { appT, langOf } from '#lib/app-i18n.ts';
import { localize } from '#lib/server/translate.ts';

const WEEK = 30 * 864e5; // a database copy up to a month old is reused: no AI cost
const today = () => new Date().toISOString().slice(0, 10);
// Free plan: every analysis of the day counts (copies from the database too). Full plan: only new ones (they cost AI).
// Counted from a log, so deleting an analysis does not give the credit back.
type Use = { at: string; cached: boolean };
const usesToday = () => readData<Use[]>('analysis-log.json', []).filter((u) => u.at.slice(0, 10) === today());
const usedToday = (all: Analysis[], full: boolean) => {
	const log = usesToday();
	const fromLog = log.filter((u) => !full || !u.cached).length;
	const fromList = all.filter((a) => a.createdAt.slice(0, 10) === today() && (!full || !a.cached)).length; // analyses made before the log existed
	return Math.max(fromLog, fromList);
};
const logUse = (cached: boolean) => writeData('analysis-log.json', [...usesToday(), { at: new Date().toISOString(), cached: Boolean(cached) }]);

export const load = async ({ url, locals, cookies }) => {
	const all = listAnalyses();
	const limit = fullAccess(locals) ? PRICE.paidAnalyses : PRICE.freeAnalyses;
	// "for you": the strongest ideas across this account's reports
	const forYou = all
		.flatMap((a) => (a.ideas ?? []).map((idea) => ({ id: a.id, product: a.main.app.name, icon: a.main.app.icon, genre: a.main.app.genre, title: idea.title, why: idea.problem, n: idea.count, strength: idea.strength })))
		.sort((x, y) => Number(y.n >= MIN_PROOF) - Number(x.n >= MIN_PROOF) || y.n - x.n || y.strength - x.strength)
		.slice(0, 3);
	// "this week on your watchlist": what moved in the last 7 days, from the review dates
	const WEEK = 7 * 864e5;
	const pulse = all
		.filter((a) => a.watch)
		.map((a) => {
			const recent = a.main.reviews.filter((r) => r.theme && Date.now() - Date.parse(r.date) < WEEK);
			const complaintIds = new Set(a.themes.filter((t) => t.type === 'complaint').map((t) => t.id));
			const byTopic = new Map<string, number>();
			for (const r of recent) if (complaintIds.has(r.theme!)) byTopic.set(r.theme!, (byTopic.get(r.theme!) ?? 0) + 1);
			const [topId, topN] = [...byTopic.entries()].sort((x, y) => y[1] - x[1])[0] ?? [null, 0];
			const weeks = weeklyComplaints(a.main, a.themes);
			const max = Math.max(1, ...weeks);
			return {
				id: a.id,
				name: a.main.app.name,
				icon: a.main.app.icon,
				thisWeek: weeks[weeks.length - 1],
				topic: topId ? a.themes.find((t) => t.id === topId)?.label : null,
				topicN: topN,
				// a trend only when there are reviews over several weeks (store feeds often hold just the latest days)
				bars: weeks.filter((n) => n > 0).length >= 3 ? weeks.map((n) => Math.max(8, Math.round((n / max) * 100))) : null,
				idea: a.ideas?.[0]?.title ?? null
			};
		})
		.sort((x, y) => y.thisWeek - x.thisWeek)
		.slice(0, 3);
	// v2: the products you follow, and the biggest asks across them (or across all your reports)
	const lang = langOf(cookies);
	const reports = await Promise.all(all.map(async (a) => ({ a, w: await localize(wants(a), a, lang, () => saveAnalysis(a)) })));
	const followed = reports
		.filter((x) => x.a.watch)
		.map(({ a, w }) => ({ id: a.id, name: a.main.app.name, icon: a.main.app.icon, newN: w.newCount, up: w.rising, down: w.falling, top: w.list.find((i) => i.kind !== 'reliability')?.label ?? w.list[0]?.label ?? null }));
	const pool = reports;
	const asks = pool
		.flatMap(({ a, w }) => w.list.filter((i) => i.kind !== 'reliability').map((i) => ({ ...i, report: a.id, product: a.main.app.name, icon: a.main.app.icon })))
		.sort((x, y) => y.n - x.n)
		.slice(0, 8);
	const overview = {
		products: all.length,
		following: followed.length,
		reviews: reports.reduce((s, x) => s + x.w.read, 0),
		asks: reports.reduce((s, x) => s + x.w.list.filter((i) => i.kind !== 'reliability').length, 0)
	};
	return {
		overview,
		followed,
		asks,
		forYou,
		pulse,
		hello: { name: (locals.user?.name ?? '').split(' ')[0], date: new Date().toLocaleDateString(appT(langOf(cookies)).locale, { weekday: 'long', day: 'numeric', month: 'long' }) },
		prefill: url.searchParams.get('url') ?? '',
		left: Math.max(0, limit - usedToday(all, fullAccess(locals))),
		full: fullAccess(locals),
		limit,
		analyses: all.map((a) => ({
			id: a.id,
			name: a.main.app.name,
			icon: a.main.app.icon,
			genre: a.main.app.genre,
			createdAt: a.createdAt,
			claimed: Boolean(a.claimed),
			ideas: a.ideas?.length ?? 0,
			topIdea: a.ideas?.[0] ? { title: a.ideas[0].title, share: a.ideas[0].share } : null,
			watching: Boolean(a.watch),
			competitors: a.competitors.map((c) => ({ name: c.app.name, icon: c.app.icon })),
			topN: a.themes.filter((t) => t.type === 'complaint').map((t) => count(a.main, t.id)).sort((x, y) => y - x)[0] ?? 0,
			topWant: wants(a).list.find((i) => i.kind !== 'reliability')?.label ?? null,
			topComplaint: a.themes.filter((t) => t.type === 'complaint').map((t) => ({ label: t.label, n: count(a.main, t.id) })).sort((x, y) => y.n - x.n)[0] ?? null
		}))
	};
};

export const actions = {
	remove: async ({ request, locals }) => {
		const id = String((await request.formData()).get('id') ?? '');
		const a = getAnalysis(id);
		if (!a) return fail(404, { error: 'Analysis not found.', input: '' });
		if (a.claimed) await unclaimProduct(a, locals.ws ?? null).catch(() => null);
		removeAnalysis(id);
		return { removed: true };
	},
	analyze: async ({ request, locals }) => {
		const fd = await request.formData();
		const input = String(fd.get('url') ?? '').trim();
		const follow = fd.get('follow') === '1'; // from a database product: add it and follow it every month
		if (!input) return fail(400, { error: 'Paste a URL first.', input });
		let id: string;
		try {
			const app = await resolveProduct(input);
			if (!app) return fail(400, { error: 'We could not find this product. Try its website, its App Store link or its Google Play link.', input });
			const full = fullAccess(locals);
			const mine = listAnalyses();
			// already analysed by this account: open it instead of spending a new one
			const same = mine.find((x) => productSlug(x.main.app) === productSlug(app));
			if (same) {
				if (follow && !same.watch) {
					same.watch = { since: new Date().toISOString(), counts: baseline(same) };
					saveAnalysis(same);
				}
				redirect(303, `/app/analyses/${same.id}`);
			}
			const limit = full ? PRICE.paidAnalyses : PRICE.freeAnalyses;
			if (usedToday(mine, full) >= limit)
				return fail(429, { error: full ? `You used your ${limit} analyses for today. They come back tomorrow.` : `You used your ${limit} free analyses for today. Unlock the database for ${PRICE.full} to open every product and run ${PRICE.paidAnalyses} analyses a day.`, input, limited: !full });
			// already in the database and less than a week old: copy it (instant, no AI cost)
			const known = await getProduct(productSlug(app)).catch(() => null);
			let a: Analysis;
			if (known && !known.analysis.themeNote && known.analysis.themes.some((t) => t.kind) && known.analysis.main.reviews.length >= 400 && Date.now() - Date.parse(known.updatedAt) < WEEK) {
				const now = new Date().toISOString();
				a = { ...structuredClone(known.analysis), id: `${slugify(app.name)}-${Date.now().toString(36)}`, input, createdAt: now, claimed: undefined, published: undefined, cached: true };
				a.main.fixes = undefined;
				a.ideas = known.ideas;
				a.ideasAt = known.ideasAt;
			} else {
				a = await analyze(input, app); // competitors are chosen again (the old ones in the database could be wrong)
				await indexAnalysis(a).catch((e) => console.warn('[undercut] database', e));
			}
			// ideas come later (hidden for now): no AI call for them here
			if (follow) a.watch = { since: new Date().toISOString(), counts: baseline(a) };
			saveAnalysis(a);
			logUse(Boolean(a.cached));
			id = a.id;
		} catch (e) {
			if (isRedirect(e)) throw e;
			return fail(400, { error: (e as Error).message, input });
		}
		redirect(303, `/app/analyses/${id}`);
	}
};

