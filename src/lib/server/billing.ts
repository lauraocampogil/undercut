// Full database subscription (Stripe Checkout, €49/month). The plan is only switched on after Stripe
// confirms the payment, and checked again once a day so a cancelled subscription goes back to free.
import * as env from '$app/env/private';
import { getAccount, getBilling, saveBilling } from './store.ts';

export const stripeReady = () => Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_DATABASE);

async function stripe(method: 'GET' | 'POST', path: string, params: Record<string, string> = {}) {
	const qs = new URLSearchParams(params);
	const res = await fetch(`https://api.stripe.com/v1/${path}${method === 'GET' && params && Object.keys(params).length ? `?${qs}` : ''}`, {
		method,
		headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, ...(method === 'POST' ? { 'content-type': 'application/x-www-form-urlencoded' } : {}) },
		body: method === 'POST' ? qs : undefined,
		signal: AbortSignal.timeout(10000)
	});
	const j = await res.json();
	if (!res.ok) throw new Error(j.error?.message ?? 'Stripe error');
	return j;
}

/** Stripe Checkout page for the Full database plan. */
export async function checkoutUrl(origin: string, email?: string, ref?: string, founder = false, freeUntil?: string) {
	const s = await stripe('POST', 'checkout/sessions', {
		mode: 'subscription',
		'line_items[0][price]': founder && env.STRIPE_PRICE_FOUNDER ? env.STRIPE_PRICE_FOUNDER : env.STRIPE_PRICE_DATABASE!,
		'line_items[0][quantity]': '1',
		success_url: `${origin}/app/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${origin}/app/settings/billing?status=cancelled`,
		allow_promotion_codes: 'true',
		// still in the free first month: the first payment is taken when it ends
		...(freeUntil ? { 'subscription_data[trial_end]': String(Math.floor(Date.parse(freeUntil) / 1000)) } : {}),
		...(ref ? { client_reference_id: ref } : {}),
		...(email ? { customer_email: email } : {})
	});
	return s.url as string;
}

/** Back from Stripe: switch the plan on only if the session is really paid. */
export async function confirmCheckout(sessionId: string, ref?: string) {
	const s = await stripe('GET', `checkout/sessions/${encodeURIComponent(sessionId)}`);
	if (ref && s.client_reference_id && s.client_reference_id !== ref) return false; // a session paid by another account
	if (s.status !== 'complete' || !['paid', 'no_payment_required'].includes(s.payment_status)) return false;
	saveBilling({ ...getBilling(), plan: 'full', customerId: s.customer, subscriptionId: s.subscription, checkedAt: new Date().toISOString() });
	return true;
}

/** Once a day: still subscribed? If not, back to free. */
export async function syncSubscription() {
	const b = getBilling();
	if (!b.subscriptionId || !env.STRIPE_SECRET_KEY) return;
	if (b.checkedAt && Date.now() - Date.parse(b.checkedAt) < 864e5) return;
	try {
		const sub = await stripe('GET', `subscriptions/${encodeURIComponent(b.subscriptionId)}`);
		const active = ['active', 'trialing', 'past_due'].includes(sub.status);
		saveBilling({ ...b, plan: active ? 'full' : 'trial', checkedAt: new Date().toISOString() });
	} catch (e) {
		console.warn('[billing]', (e as Error).message);
	}
}

export async function portalUrl(origin: string) {
	const b = getBilling();
	if (!b.customerId) throw new Error('No subscription yet.');
	const s = await stripe('POST', 'billing_portal/sessions', { customer: b.customerId, return_url: `${origin}/app/settings/billing` });
	return s.url as string;
}

/** Account deleted: stop the subscription right away so nobody is charged for an account that no longer exists. */
export async function cancelNow() {
	const b = getBilling();
	if (!b.subscriptionId || !env.STRIPE_SECRET_KEY) return;
	const res = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(b.subscriptionId)}`, { method: 'DELETE', headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }, signal: AbortSignal.timeout(10000) });
	if (!res.ok && res.status !== 404) throw new Error('Could not cancel the subscription. Cancel it in Billing first, then try again.');
}

/** Founding price (€29): people 21 to 50 who confirmed their email on the waitlist. */
export async function isFounder(email?: string | null) {
	if (!email || !env.STRIPE_PRICE_FOUNDER) return false;
	try {
		if (getAccount().founder) return true;
	} catch {
		/* outside an account */
	}
	const { tierOf } = await import('./beta-invite.ts');
	return (await tierOf(email).catch(() => null)) === 'founder';
}
