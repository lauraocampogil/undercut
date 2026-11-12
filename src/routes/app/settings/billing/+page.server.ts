import { redirect } from '@sveltejs/kit';
import * as env from '$app/env/private';
import { getBilling, listClients, saveBilling } from '#lib/server/store.ts';
import { usageThisMonth } from '#lib/server/usage.ts';
import { PLANS, type PlanId } from '#lib/plans.ts';

const PRICE: Record<string, string | undefined> = { freelance: env.STRIPE_PRICE_FREELANCE, agency: env.STRIPE_PRICE_AGENCY, studio: env.STRIPE_PRICE_STUDIO };

async function stripe(path: string, params: Record<string, string>) {
	const res = await fetch(`https://api.stripe.com/v1/${path}`, {
		method: 'POST',
		headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams(params)
	});
	const j = await res.json();
	if (!res.ok) throw new Error(j.error?.message ?? 'Stripe error');
	return j;
}

export const load = ({ url }) => {
	const done = url.searchParams.get('plan');
	if (url.searchParams.get('status') === 'success' && done && done in PLANS) saveBilling({ ...getBilling(), plan: done as PlanId });
	return {
	billing: getBilling(),
	clientsUsed: listClients().length,
	usage: usageThisMonth(),
	stripe: Boolean(env.STRIPE_SECRET_KEY),
	status: url.searchParams.get('status')
	};
};

export const actions = {
	choose: async ({ request, url }) => {
		const plan = String((await request.formData()).get('plan')) as PlanId;
		if (!(plan in PLANS) || plan === 'trial') return { error: 'Unknown plan' };
		if (env.STRIPE_SECRET_KEY && PRICE[plan]) {
			const s = await stripe('checkout/sessions', {
				mode: 'subscription',
				'line_items[0][price]': PRICE[plan]!,
				'line_items[0][quantity]': '1',
				success_url: `${url.origin}/app/settings/billing?status=success&plan=${plan}`,
				cancel_url: `${url.origin}/app/settings/billing?status=cancelled`,
				allow_promotion_codes: 'true'
			});
			redirect(303, s.url);
		}
		// No Stripe configured: switch locally so the flow can be tried end-to-end.
		saveBilling({ ...getBilling(), plan });
		return { switched: plan };
	},
	portal: async ({ url }) => {
		const b = getBilling();
		if (!env.STRIPE_SECRET_KEY || !b.customerId) return { error: 'Billing portal opens once a Stripe subscription exists.' };
		const s = await stripe('billing_portal/sessions', { customer: b.customerId, return_url: `${url.origin}/app/settings/billing` });
		redirect(303, s.url);
	}
};
