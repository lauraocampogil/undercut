import { error, fail } from '@sveltejs/kit';
import * as env from '$app/env/private';
import { PRICE } from '#lib/pricing.ts';
import { sendEmail } from '#lib/server/email.ts';
import { readData, writeData } from '#lib/server/store.ts';
import { isOwnerAdmin } from '#lib/server/access.ts';
import { early, placeOf } from '#lib/server/waitlist.ts';
import { WAIT } from '#lib/waitlist-i18n.ts';

// What the waitlist says: how many joined, who they are, what they need, and whether they would pay.
export const load = async ({ locals }) => {
	if (!isOwnerAdmin(locals)) error(403, 'Only the Undercut team can open this page.');
	const rows = (await early()).sort((a, b) => b.row.created_at.localeCompare(a.row.created_at));
	const t = WAIT.en;
	const tally = (field: 'role' | 'stage' | 'type' | 'pay' | 'today' | 'jobs' | 'sources', opts: [string, string][]) => {
		const counts = new Map(opts.map(([k]) => [k, 0]));
		for (const { a } of rows) {
			const v = a[field];
			for (const x of Array.isArray(v) ? v : v ? [v] : []) counts.set(x, (counts.get(x) ?? 0) + 1);
		}
		return opts.map(([k, l]) => ({ key: k, label: l, n: counts.get(k) ?? 0 })).sort((x, y) => y.n - x.n);
	};
	const charts = [
		{ title: 'Who they are', items: tally('role', t.roles) },
		{ title: 'Stage', items: tally('stage', t.stages) },
		{ title: 'Product type', items: tally('type', t.types) },
		{ title: 'How they do it today', items: tally('today', t.todays) },
		{ title: 'What they would use it for', items: tally('jobs', t.jobList) },
		{ title: 'Sources they want', items: tally('sources', t.sourceList) },
		{ title: 'Would pay €49/month', items: tally('pay', t.pays) }
	];
	const label = (opts: [string, string][], k?: string) => opts.find(([x]) => x === k)?.[1] ?? k ?? '';
	const people = await Promise.all(
		rows.map(async ({ row, a }) => ({
			email: row.email,
			name: row.name,
			at: row.created_at.slice(0, 10),
			place: (await placeOf(row.email))?.place ?? null,
			role: label(t.roles, a.role),
			stage: label(t.stages, a.stage),
			building: a.building ?? '',
			pay: label(t.pays, a.pay),
			price: a.price ?? '',
			paid: a.paid ?? '',
			pain: a.pain ?? '',
			feature: a.feature ?? '',
			other: [a.todayOther, a.other].filter(Boolean).join(' · '),
			lang: a.lang ?? '',
			invitedBy: a.ref ? (rows.find((x) => x.a.refCode === a.ref)?.row.email ?? '') : ''
		}))
	);
	const yes = rows.filter(({ a }) => a.pay === 'yes' || a.pay === 'team').length;
	return { seatsFree: PRICE.freeSeats, freeTaken: rows.filter((x) => x.a.tier === 'free').length, founderTaken: rows.filter((x) => x.a.tier === 'founder').length, unconfirmed: rows.filter((x) => !x.a.tier).length, total: rows.length, yes, charts, people, openAt: PRICE.openAt, seats: PRICE.founderSeats, waitlistOn: env.WAITLIST === 'on', founderPrice: Boolean(env.STRIPE_PRICE_FOUNDER), sent: readData<string | null>('opening-sent.json', null) };
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export const actions = {
	// people who joined before the confirmation email existed: send it to them (confirming gives their seat)
	remind: async ({ locals, url }) => {
		if (!isOwnerAdmin(locals)) error(403);
		const { remindUnconfirmed } = await import('#lib/server/beta-invite.ts');
		const r = await remindUnconfirmed(env.PUBLIC_BASE_URL || url.origin);
		return { reminded: r.sent };
	},
	remove: async ({ locals, request }) => {
		if (!isOwnerAdmin(locals)) error(403);
		const email = String((await request.formData()).get('email') ?? '').toLowerCase();
		const { removeFromWaitlist } = await import('#lib/server/waitlist.ts');
		await removeFromWaitlist(email);
		return { removed: email };
	},
	// Opening day: one email per person on the waitlist, with their price (founding price for the first places).
	open: async ({ locals, url }) => {
		if (!isOwnerAdmin(locals)) error(403);
		if (env.WAITLIST === 'on') return fail(400, { error: 'Turn off WAITLIST on the server first, otherwise people can’t create their account.' });
		if (!env.STRIPE_PRICE_FOUNDER) return fail(400, { error: 'Add STRIPE_PRICE_FOUNDER (the €29 price) first.' });
		if (readData<string | null>('opening-sent.json', null)) return fail(400, { error: 'The opening email was already sent.' });
		const app = (env.PUBLIC_BASE_URL || url.origin).replace(/\/$/, '');
		let sent = 0;
		for (const { row } of await early()) {
			const p = await placeOf(row.email);
			if (!p) continue;
			const founder = p.place <= PRICE.founderSeats;
			const first = esc(row.name.split(' ')[0] || 'there');
			const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#111;font-size:15px;line-height:1.6"><p style="font-weight:700;font-size:18px;margin:0 0 24px">undercut</p><p>Hi ${first},</p><p>Undercut is open. Thank you for your answers on the waitlist: they shaped what we built.</p>${founder ? `<p>You were <b>#${p.place}</b> on the list, so you get the founding price: <b>${PRICE.founder.replace('/mo', '')}/month instead of ${PRICE.full.replace('/mo', '')}</b>. Sign up with this email address (${esc(row.email)}) to get it.</p>` : `<p>Create your account and try it for free. The full database is ${PRICE.full.replace('/mo', '')}/month.</p>`}<p style="margin:28px 0"><a href="${app}/signup?next=/app/settings/billing" style="background:#111;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;display:inline-block">Open Undercut</a></p><p>Reply to this email with anything, I read everything.</p><p>Laura</p></div>`;
			if (await sendEmail(row.email, founder ? `Undercut is open: your founding price (${PRICE.founder.replace('/mo', '')}/month)` : 'Undercut is open', html)) sent++;
			await new Promise((r) => setTimeout(r, 600)); // stay under the email provider's rate limit
		}
		writeData('opening-sent.json', new Date().toISOString());
		return { sent };
	}
};
