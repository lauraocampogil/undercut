import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/config';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const account = locals.account;
	if (!account) redirect(303, '/login');
	await db().updateAccount(account.id, { last_seen_at: new Date().toISOString() });
	const own = account.own_store_id ? await db().getStore(account.own_store_id) : null;
	return {
		email: account.email,
		own: own ? { id: own.id, domain: own.domain, name: own.name, currency: own.currency } : null
	};
};
