// Who sees the full database: the admin, and signed-in users on a paid plan.
import { getAccount, getBilling } from './store.ts';
import { isAdmin } from './beta.ts';
import { dbOn } from './db.ts';
import * as env from '$app/env/private';

export function isOwnerAdmin(locals: App.Locals) {
	return dbOn() ? isAdmin(locals.user?.email) : locals.user?.role === 'owner';
}
export function fullAccess(locals: App.Locals) {
	if (!locals.user) return false;
	if (isOwnerAdmin(locals)) return true;
	if (env.BETA_OPEN === 'on') return true; // everyone, for a test period
	try {
		const acc = getAccount();
		// the first 20 of the waitlist: free for life · the next 30: the first month free, then €29/month
		return getBilling().plan !== 'trial' || Boolean(acc.beta) || Boolean(acc.freeUntil && Date.now() < Date.parse(acc.freeUntil));
	} catch {
		return false;
	}
}
