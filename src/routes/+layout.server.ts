import { demoMode, hasSearch } from '$lib/server/config';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => ({
	account: locals.account ? { id: locals.account.id, email: locals.account.email } : null,
	demoMode,
	hasSearch
});
