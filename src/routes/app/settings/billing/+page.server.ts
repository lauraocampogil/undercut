import { fail, redirect } from '@sveltejs/kit';
import { getAccount, getBilling } from '#lib/server/store.ts';
import { checkoutUrl, confirmCheckout, isFounder, portalUrl, stripeReady, syncSubscription } from '#lib/server/billing.ts';
import { PRICE } from '#lib/pricing.ts';
import { db, dbOn } from '#lib/server/db.ts';
import { readData, writeData } from '#lib/server/store.ts';

export const load = async ({ url, locals }) => {
	const sid = url.searchParams.get('session_id');
	let status = url.searchParams.get('status');
	if (sid) status = (await confirmCheckout(sid, locals.ws ?? undefined).catch(() => false)) ? 'success' : 'failed';
	else await syncSubscription();
	const b = getBilling();
	const acc = getAccount();
	return { lifetime: Boolean(acc.beta), freeUntil: acc.freeUntil && Date.now() < Date.parse(acc.freeUntil) ? acc.freeUntil : null, founder: await isFounder(locals.user?.email), notified: readData<boolean>('notify-paid.json', false), full: b.plan !== 'trial', hasCustomer: Boolean(b.customerId), stripe: stripeReady(), status, price: PRICE };
};

export const actions = {
	subscribe: async ({ url, locals }) => {
		if (!stripeReady()) return fail(400, { error: 'Payments are not set up yet (STRIPE_SECRET_KEY and STRIPE_PRICE_DATABASE).' });
		if (getBilling().plan === 'full') return fail(400, { error: 'You already have the full database.' });
		let to: string;
		try {
			const free = getAccount().freeUntil;
			to = await checkoutUrl(url.origin, locals.user?.email || undefined, locals.ws ?? undefined, await isFounder(locals.user?.email), free && Date.parse(free) > Date.now() + 864e5 ? free : undefined);
		} catch (e) {
			return fail(400, { error: (e as Error).message });
		}
		redirect(303, to);
	},
	portal: async ({ url }) => {
		let to: string;
		try {
			to = await portalUrl(url.origin);
		} catch (e) {
			return fail(400, { error: (e as Error).message });
		}
		redirect(303, to);
	},
	// before payments are open: people who want the full database leave their email (Supabase table waitlist, kind = 'database')
	notify: async ({ locals, request }) => {
		const email = locals.user?.email;
		if (!email) return fail(401, { error: 'Log in first.' });
		const f = await request.formData();
		const val = (k: string) => String(f.get(k) ?? '').trim().slice(0, 600);
		const answers = { building: val('building'), use: val('use'), missing: val('missing'), pay: val('pay') };
		const note = JSON.stringify(answers);
		if (dbOn()) await db.upsert('waitlist', { email, name: locals.user?.name ?? '', kind: 'database', website: answers.building.slice(0, 200), note }, 'email').catch((e) => console.warn('[waitlist]', e));
		writeData('notify-paid.json', true);
		const acc = getAccount();
	return { lifetime: Boolean(acc.beta), freeUntil: acc.freeUntil && Date.now() < Date.parse(acc.freeUntil) ? acc.freeUntil : null, founder: await isFounder(locals.user?.email), notified: true };
	}
};
