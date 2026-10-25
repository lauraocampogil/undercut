import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/config';
import type { RequestHandler } from './$types';

/** Turns an anonymous analysis into the account's setup and goes to the dashboard. */
const attach: RequestHandler = async ({ params, locals }) => {
	if (!locals.account) redirect(303, `/login?analysis=${params.id}`);
	const repo = db();
	const a = await repo.getAnalysis(params.id);
	if (!a) error(404, 'Analysis not found');
	await repo.updateAccount(locals.account.id, { own_store_id: a.own_store_id });
	for (const c of a.candidates) await repo.addTracked(locals.account.id, c.store_id, c.score, c.reasons);
	redirect(303, '/dashboard?welcome=1');
};

export const GET = attach;
export const POST = attach;
