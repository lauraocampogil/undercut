// "Watch": every Monday, one email per account with what changed on the products it watches:
// new complaints since the last email (by topic) and the opportunities found in them.
import type { Analysis } from '#lib/review-types.ts';
import { count, listAnalyses, refresh, saveAnalysis } from './reviewdb.ts';
import { labelsFor } from './translate.ts';
import { MONTHLY, appUrl as app, layout, mailLang, unsubscribeLink } from './mails.ts';
import { getAccount } from './store.ts';
import { sendEmail } from './email.ts';

/** Complaint counts per product and topic, to compare with next week. */
export function baseline(a: Analysis): Record<string, number> {
	const out: Record<string, number> = {};
	[a.main, ...a.competitors].forEach((p, i) => {
		for (const t of a.themes.filter((x) => x.type === 'complaint')) out[`${i}|${t.id}`] = count(p, t.id);
	});
	return out;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Run inside a workspace. Sends at most one email a week. */
export async function weeklyWatch(appUrl: string, dry = false): Promise<string | void> {
	const watched = listAnalyses().filter((a) => a.watch);
	if (!watched.length) return;
	const due = dry ? watched : watched.filter((a) => !a.watch!.lastDigest || Date.now() - Date.parse(a.watch!.lastDigest) > 27 * 864e5);
	if (!due.length) return;
	const lang = mailLang(getAccount().language);
	const m = MONTHLY[lang];
	const sections: string[] = [];
	for (const old of due) {
		const before = old.watch!.counts;
		const ids = old.themes.map((t) => t.id).join();
		const a = await refresh(old).catch(() => old);
		const changes: { product: string; topic: string; n: number }[] = [];
		[a.main, ...a.competitors].forEach((p, i) => {
			for (const t of a.themes.filter((x) => x.type === 'complaint')) {
				const n = count(p, t.id) - (before[`${i}|${t.id}`] ?? count(p, t.id));
				if (n > 0) changes.push({ product: p.app.name, topic: t.id, n });
			}
		});
		changes.sort((x, y) => y.n - x.n);
		const labels = lang === 'en' ? {} : await labelsFor(a, lang, () => {}).catch(() => ({}) as Record<string, string>);
		if (!dry) {
			a.watch = { since: old.watch!.since, counts: baseline(a), lastDigest: new Date().toISOString() };
			saveAnalysis(a);
		}
		const total = changes.reduce((s, c) => s + c.n, 0);
		const label = (id: string) => labels[id] ?? a.themes.find((t) => t.id === id)?.label ?? id;
		const rows = changes.slice(0, 6).map((c) => `<li>${m.about(c.n, esc(label(c.topic)), esc(c.product))}</li>`).join('');
		sections.push(
			`<h3 style="margin:28px 0 6px;font-size:17px">${esc(a.main.app.name)} vs ${a.competitors.map((c) => esc(c.app.name)).join(', ')}</h3>` +
				(total ? `<p style="margin:0 0 6px">${m.newN(total)}</p><ul style="margin:0;padding-left:18px">${rows}</ul>` : `<p style="margin:0;color:#555">${m.nothing}</p>`) +
				`<p style="margin:10px 0 0"><a href="${app()}/app/analyses/${a.id}" style="color:#111">${m.see}</a></p>`
		);
	}
	const to = getAccount().email;
	const html = layout(`<p style="margin:0;color:#555">${m.intro}</p>${sections.join('')}<p style="color:#888;font-size:12px;margin:28px 0 0">${m.foot}</p>`, { lang, to });
	if (dry) return html;
	if (to && sections.length && !getAccount().noEmails) await sendEmail(to, m.subject, html, unsubscribeLink(to));
}
