import { fail } from '@sveltejs/kit';
import * as env from '$app/env/private';
import { pickLang } from '#lib/site-i18n.ts';
import { WAIT } from '#lib/waitlist-i18n.ts';
import { byRefCode, early, join, placeOf, MOVE_UP } from '#lib/server/waitlist.ts';
import { failedAttempt, tooManyAttempts } from '#lib/server/auth.ts';
import { sendEmail } from '#lib/server/email.ts';
import { sendConfirm } from '#lib/server/beta-invite.ts';

const COOKIE = 'uc_wait';
const siteBase = (origin: string) => (env.SITE_URL || origin).replace(/\/$/, '');
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export const load = async ({ url, cookies, request }) => {
	const lang = pickLang(url, cookies.get('lang'), request.headers.get('accept-language'));
	if (url.searchParams.get('lang')) cookies.set('lang', lang, { path: '/', maxAge: 365 * 864e2, httpOnly: false, sameSite: 'lax' });
	const ref = url.searchParams.get('ref') ?? '';
	const inviter = ref ? await byRefCode(ref).catch(() => null) : null;
	const mine = cookies.get(COOKIE);
	const me = mine ? await placeOf(mine).catch(() => null) : null;
	const total = (await early().catch(() => [])).length;
	return { email: (url.searchParams.get('email') ?? '').slice(0, 160), lang, ref: inviter ? ref : '', inviter: inviter?.row.name.split(' ')[0] ?? '', me, total, base: siteBase(url.origin), moveUp: MOVE_UP };
};

const pick = (f: FormData, k: string, allowed: string[]) => {
	const v = String(f.get(k) ?? '');
	return allowed.includes(v) ? v : '';
};
const many = (f: FormData, k: string, allowed: string[], max = 10) => f.getAll(k).map(String).filter((v) => allowed.includes(v)).slice(0, max);
const text = (f: FormData, k: string, n = 600) => String(f.get(k) ?? '').trim().slice(0, n);
const keys = (o: [string, string][]) => o.map(([k]) => k);

export const actions = {
	default: async ({ request, cookies, url, getClientAddress }) => {
		const f = await request.formData();
		const lang = pickLang(url, cookies.get('lang'), request.headers.get('accept-language'));
		const t = WAIT[lang];
		const email = text(f, 'email', 160).toLowerCase();
		const name = text(f, 'name', 80);
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(400, { error: t.email + ': ' + t.required.toLowerCase() });
		const key = `wait|${getClientAddress()}`;
		if (tooManyAttempts(key)) return fail(429, { error: 'Too many tries. Wait 15 minutes.' });
		failedAttempt(key);
		const answers = {
			role: pick(f, 'role', keys(t.roles)),
			building: text(f, 'building', 300),
			stage: pick(f, 'stage', keys(t.stages)),
			type: pick(f, 'type', keys(t.types)),
			today: many(f, 'today', keys(t.todays)),
			todayOther: text(f, 'todayOther'),
			paid: text(f, 'paid'),
			pain: text(f, 'pain'),
			jobs: many(f, 'jobs', keys(t.jobList), 3),
			sources: many(f, 'sources', keys(t.sourceList)),
			feature: text(f, 'feature'),
			pay: pick(f, 'pay', keys(t.pays)),
			price: text(f, 'price', 60),
			other: text(f, 'other'),
			lang,
			ref: text(f, 'ref', 20)
		};
		let me;
		try {
			me = await join(email, name, answers);
		} catch (e) {
			console.error('[waitlist]', e);
			return fail(500, { error: 'Something went wrong. Try again in a minute.' });
		}
		cookies.set(COOKIE, email, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 365 * 864e2, secure: url.protocol === 'https:' });
		// one email: confirm it → access (free for the first 20, €29 for the next 30, then €49)
		const confirmSent = await sendConfirm(email, name, lang, env.PUBLIC_BASE_URL || url.origin).catch((e) => (console.error('[waitlist] confirm', e), false));
		return { done: true, me, confirmSent };
	}
};
