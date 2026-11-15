import { error, fail } from '@sveltejs/kit';
import * as env from '$app/env/private';
import { invite, isAdmin, listWaitlist, seats } from '#lib/server/beta.ts';
import { sendEmail } from '#lib/server/email.ts';
import { dbOn } from '#lib/server/db.ts';

const allowed = (u: App.Locals['user']) => Boolean(u) && (dbOn() ? isAdmin(u!.email) : u!.role === 'owner');
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export const load = async ({ locals, url }) => {
	if (!allowed(locals.user)) error(403, 'Only the Undercut team can open this page.');
	const rows = await listWaitlist();
	const base = env.PUBLIC_BASE_URL || url.origin;
	return { rows: rows.map((r) => ({ ...r, link: r.code ? `${base}/signup?code=${r.code}` : null })), seats: seats(), joined: rows.filter((r) => r.status === 'joined').length };
};

export const actions = {
	invite: async ({ request, locals, url }) => {
		if (!allowed(locals.user)) error(403);
		const id = String((await request.formData()).get('id'));
		const row = await invite(id);
		if (!row?.code) return fail(404, { error: 'Not found' });
		const link = `${env.PUBLIC_BASE_URL || url.origin}/signup?code=${row.code}`;
		const sent = await sendEmail(
			row.email,
			'Your Undercut beta invitation',
			`<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5"><p>Hi ${esc(row.name.split(' ')[0])},</p><p>You’re in: <b>${esc(row.agency)}</b> is one of the first agencies on Undercut. Everything is free during the beta.</p><p><a href="${link}" style="display:inline-block;background:#C6F432;color:#172000;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">Create my workspace</a></p><p>Reply to this email anytime — I read everything.</p><p style="color:#85878d;font-size:13px">${link}</p></div>`
		);
		return { invited: row.email, link, sent };
	}
};
