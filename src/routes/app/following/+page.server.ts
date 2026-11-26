import { listAnalyses, saveAnalysis } from '#lib/server/reviewdb.ts';
import { wants } from '#lib/server/report.ts';
import { localize } from '#lib/server/translate.ts';
import { langOf } from '#lib/app-i18n.ts';

// The products you follow (monthly report) and every product you looked at.
export const load = async ({ cookies }) => {
	const lang = langOf(cookies);
	const reports = await Promise.all(listAnalyses().map(async (a) => ({ a, w: await localize(wants(a), a, lang, () => saveAnalysis(a)) })));
	const top = (w: ReturnType<typeof wants>) => w.list.find((i) => i.kind !== 'reliability')?.label ?? w.list[0]?.label ?? null;
	return {
		followed: reports
			.filter((x) => x.a.watch)
			.map(({ a, w }) => ({ id: a.id, name: a.main.app.name, icon: a.main.app.icon, newN: w.newCount, up: w.rising, down: w.falling, top: top(w) })),
		analyses: reports.map(({ a, w }) => ({ id: a.id, name: a.main.app.name, icon: a.main.app.icon, watching: Boolean(a.watch), topWant: top(w) }))
	};
};
