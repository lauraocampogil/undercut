import { listProducts, lockRows, dbProblem } from '#lib/server/public.ts';
import { seedState } from '#lib/server/seed.ts';
import { getAccount } from '#lib/server/store.ts';
import { fullAccess, isOwnerAdmin } from '#lib/server/access.ts';
import * as env from '$app/env/private';
import { pickLang } from '#lib/site-i18n.ts';

// Public home: what Undercut is + the top 100 (first 10 open, the rest blurred unless paid).
export const load = async ({ locals, url, cookies, request }) => {
	const lang = pickLang(url, cookies.get('lang'), request.headers.get('accept-language'));
	if (url.searchParams.get('lang')) cookies.set('lang', lang, { path: '/', maxAge: 365 * 864e2, httpOnly: false, sameSite: 'lax' });
	const all = await listProducts().catch(() => []);
	const full = fullAccess(locals);
	return {
		lang,
		waitlist: env.WAITLIST === 'on',
		hasWorkspace: Boolean(getAccount().email),
		signedIn: Boolean(locals.user),
		full,
		rows: lockRows(all, full).slice(0, full ? 100 : 20),
		count: all.length,
		reviews: all.reduce((s, r) => s + r.stats.reviews, 0),
		admin: isOwnerAdmin(locals) ? { seed: seedState(), dbProblem, key: Boolean(env.ANTHROPIC_API_KEY), seedOff: env.SEED === 'off' } : null
	};
};
