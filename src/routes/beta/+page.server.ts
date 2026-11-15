import { fail, redirect } from '@sveltejs/kit';
import { invite, isAdmin, joinWaitlist, listWaitlist, seats } from '#lib/server/beta.ts';

export const load = () => ({ seats: seats() });

export const actions = {
	default: async ({ request }) => {
		const f = await request.formData();
		const v = (k: string, n = 200) => String(f.get(k) ?? '').trim().slice(0, n);
		const row = { email: v('email', 160), name: v('name', 80), agency: v('agency', 120), kind: v('kind', 20) || 'web', website: v('website', 200), note: v('note', 1000) };
		if (!row.name || !row.agency || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.email)) return fail(400, { ...row, error: 'Name, a valid email and your agency name, please.' });
		try {
			await joinWaitlist(row);
		} catch (e) {
			console.error(e);
			return fail(500, { ...row, error: 'Something went wrong — try again in a minute.' });
		}
		// the founder (ADMIN_EMAILS) lets herself in directly — that is how the first workspace is created
		if (isAdmin(row.email)) {
			const me = (await listWaitlist()).find((r) => r.email === row.email.toLowerCase());
			const inv = me && (me.code ? me : await invite(me.id));
			if (inv?.code && inv.status !== 'joined') redirect(303, `/signup?code=${inv.code}`);
		}
		return { joined: row.name.split(' ')[0] };
	}
};
