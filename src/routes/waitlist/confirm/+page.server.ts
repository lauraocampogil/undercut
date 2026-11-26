import { redirect } from '@sveltejs/kit';
import * as env from '$app/env/private';
import { checkToken, confirm } from '#lib/server/beta-invite.ts';

// The link in the confirmation email: confirm, give the seat, and go straight to account creation.
export const load = async ({ url }) => {
	const email = (url.searchParams.get('e') ?? '').toLowerCase();
	if (!checkToken(email, url.searchParams.get('t') ?? '')) return { ok: false };
	const r = await confirm(email, env.PUBLIC_BASE_URL || url.origin).catch((e) => (console.error('[waitlist] confirm', e), null));
	if (!r) return { ok: false };
	redirect(303, `${(env.PUBLIC_BASE_URL || url.origin).replace(/\/$/, '')}/signup?code=${r.code}`);
};
