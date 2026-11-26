import { error, fail, redirect } from '@sveltejs/kit';
import { getAnalysis, saveAnalysis, removeAnalysis, refresh, fixVerified, fixScore, addCompetitor, type FixStatus } from '#lib/server/reviewdb.ts';
import { summary, wants } from '#lib/server/report.ts';
import { localize } from '#lib/server/translate.ts';
import { langOf } from '#lib/app-i18n.ts';
import { claimProduct, indexAnalysis, productSlug, saveIdeas, unclaimProduct } from '#lib/server/public.ts';
import { ideasError, makeIdeas } from '#lib/server/opportunities.ts';
import { baseline } from '#lib/server/watch.ts';
import { checkEmailCode, checkSite, emailCode, emailMatches, siteToken } from '#lib/server/claim-verify.ts';
import { sendEmail } from '#lib/server/email.ts';
import { failedAttempt, tooManyAttempts } from '#lib/server/auth.ts';

export const load = async ({ params, locals, cookies }) => {
	const a = getAnalysis(params.id);
	if (!a) error(404, 'Analysis not found');
	const verified = Object.fromEntries(a.themes.map((t) => [t.id, fixVerified(a.main, t.id)]));
	const slug = productSlug(a.main.app);
	return { a, w: await localize(wants(a), a, langOf(cookies), () => saveAnalysis(a)), report: summary(a), verified, score: fixScore(a), slug, claim: { domain: a.main.app.domain ?? null, token: siteToken(wsOf(locals) ?? 'local', slug) } };
};

const need = (id: string) => {
	const a = getAnalysis(id);
	if (!a) error(404, 'Analysis not found');
	return a;
};
const wsOf = (locals: App.Locals) => ((locals as any).ws as string | undefined) ?? null;

export const actions = {
	refresh: async ({ params, locals }) => {
		const before = need(params.id);
		if (!before.themes.some((t) => t.kind)) before.themeNote = 'old topics'; // made before the concrete asks: group them again
		const ids = before.themes.map((t) => t.id).join();
		const a = await refresh(before);
		if (a.themes.map((t) => t.id).join() !== ids) a.ideas = a.ideasAt = undefined; // topics changed: old ideas point to old topics
		if (!a.ideas?.length && !a.themeNote) {
			const ideas = await makeIdeas(a).catch(() => null);
			if (ideas?.length) {
				a.ideas = ideas;
				a.ideasAt = new Date().toISOString();
				await saveIdeas(productSlug(a.main.app), ideas).catch(() => null);
			}
		}
		saveAnalysis(a);
		await indexAnalysis(a).catch(() => null);
		if (a.claimed) await claimProduct(a, wsOf(locals)).catch(() => null);
	},
	// giving up a claim needs no proof; making one does (sendCode → verifyEmail, or verifySite)
	claim: async ({ params, locals }) => {
		const a = need(params.id);
		if (!a.claimed) return fail(400, { error: 'Verify that you work on this product first.' });
		await unclaimProduct(a, wsOf(locals)).catch(() => null);
		a.claimed = false;
		a.claimVerified = undefined;
		saveAnalysis(a);
	},
	// watch: every Monday, an email with the new complaints about these 4 products and new ideas
	watch: async ({ params }) => {
		const a = need(params.id);
		a.watch = a.watch ? undefined : { since: new Date().toISOString(), counts: baseline(a) };
		saveAnalysis(a);
	},
	// the user decides who the competitors are
	removeRival: async ({ params, request }) => {
		const a = need(params.id);
		const i = Number((await request.formData()).get('i'));
		if (!(i >= 0 && i < a.competitors.length) || a.competitors.length <= 1) return fail(400, { rivalError: 'Keep at least one competitor.' });
		a.competitors.splice(i, 1);
		a.watch = a.watch ? { ...a.watch, counts: baseline(a) } : undefined;
		saveAnalysis(a);
	},
	addRival: async ({ params, request }) => {
		const a = need(params.id);
		const input = String((await request.formData()).get('rival') ?? '').trim();
		if (!input) return fail(400, { rivalError: 'Paste a link or a name.' });
		try {
			await addCompetitor(a, input);
		} catch (e) {
			return fail(400, { rivalError: (e as Error).message, rival: input });
		}
		a.watch = a.watch ? { ...a.watch, counts: baseline(a) } : undefined;
		saveAnalysis(a);
	},
	sendCode: async ({ params, locals, request }) => {
		const a = need(params.id);
		const email = String((await request.formData()).get('email') ?? '').trim().toLowerCase();
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(400, { claimError: 'Enter a valid email.', email });
		if (!emailMatches(email, a.main.app.domain)) return fail(400, { claimError: `Use an email address on ${a.main.app.domain} (for example you@${a.main.app.domain}).`, email });
		const key = `claim|${wsOf(locals) ?? 'local'}`;
		if (tooManyAttempts(key)) return fail(429, { claimError: 'Too many codes asked. Wait 15 minutes.', email });
		failedAttempt(key);
		const code = emailCode(wsOf(locals) ?? 'local', productSlug(a.main.app), email);
		const ok = await sendEmail(email, `${code} is your Undercut code for ${a.main.app.name}`, `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#111;font-size:15px;line-height:1.6"><p style="font-weight:700;font-size:18px;margin:0 0 24px">undercut</p><p>Someone asked to claim <b>${a.main.app.name}</b> on Undercut with this email address. Your code:</p><p style="font-size:34px;font-weight:700;letter-spacing:6px;margin:16px 0">${code}</p><p style="color:#555">It works for about an hour. If it wasn’t you, ignore this email.</p></div>`);
		if (!ok) return fail(500, { claimError: 'We couldn’t send the email. Try the website method, or write to hello@getundercut.app.', email });
		return { codeSent: email };
	},
	verifyEmail: async ({ params, locals, request }) => {
		const a = need(params.id);
		const f = await request.formData();
		const email = String(f.get('email') ?? '').trim().toLowerCase();
		const code = String(f.get('code') ?? '');
		if (!emailMatches(email, a.main.app.domain) || !checkEmailCode(wsOf(locals) ?? 'local', productSlug(a.main.app), email, code)) return fail(400, { claimError: 'This code is wrong or expired.', codeSent: email });
		return doClaim(a, locals, { method: 'email', at: new Date().toISOString(), email });
	},
	verifySite: async ({ params, locals }) => {
		const a = need(params.id);
		if (!a.main.app.domain) return fail(400, { claimError: 'This product has no website on file.' });
		const how = await checkSite(a.main.app.domain, siteToken(wsOf(locals) ?? 'local', productSlug(a.main.app)));
		if (!how) return fail(400, { claimError: `We didn’t find the tag on ${a.main.app.domain} yet. Publish it, then try again (DNS can take a few minutes).`, site: true });
		return doClaim(a, locals, { method: how, at: new Date().toISOString() });
	},
	fix: async ({ params, request, locals }) => {
		const a = need(params.id);
		if (!a.claimed) return fail(400, { error: 'Claim the product first.' });
		const f = await request.formData();
		const theme = String(f.get('theme'));
		const status = String(f.get('status')) as FixStatus;
		if (!a.themes.some((t) => t.id === theme) || !['none', 'known', 'working', 'fixed'].includes(status)) return fail(400, { error: 'Unknown theme or status.' });
		a.main.fixes = { ...(a.main.fixes ?? {}), [theme]: { status, at: status === 'fixed' ? String(f.get('at') || new Date().toISOString().slice(0, 10)) : undefined, version: String(f.get('version') ?? '') || undefined } };
		saveAnalysis(a);
		await claimProduct(a, wsOf(locals)).catch(() => null);
	},
	ideas: async ({ params }) => {
		const a = need(params.id);
		if (a.themeNote) return fail(400, { error: 'Click “Update reviews” first, so the topics are grouped by AI.' });
		const ideas = await makeIdeas(a);
		if (!ideas?.length) return fail(400, { error: `We couldn’t find ideas right now (${ideasError() || 'no answer'}). Try again in a minute.` });
		a.ideas = ideas;
		a.ideasAt = new Date().toISOString();
		saveAnalysis(a);
		await saveIdeas(productSlug(a.main.app), ideas).catch(() => null);
		redirect(303, `/app/ideas?from=${encodeURIComponent(a.id)}`);
	},
	remove: async ({ params, locals }) => {
		const a = need(params.id);
		if (a.claimed) await unclaimProduct(a, wsOf(locals)).catch(() => null);
		removeAnalysis(a.id);
		redirect(303, '/app/analyses');
	}
};

async function doClaim(a: ReturnType<typeof need>, locals: App.Locals, proof: NonNullable<ReturnType<typeof need>['claimVerified']>) {
	try {
		await claimProduct(a, wsOf(locals));
	} catch (e) {
		return fail(400, { claimError: (e as Error).message });
	}
	a.claimed = true;
	a.claimVerified = proof;
	saveAnalysis(a);
	return { claimedNow: true };
}
