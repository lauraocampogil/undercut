import { error, json } from '@sveltejs/kit';
import * as env from '$app/env/private';
import { runScheduled } from '#lib/server/scheduler.ts';

// Called by a cron (Vercel, Coolify…) with "Authorization: Bearer CRON_SECRET": refreshes the claimed products.
export const GET = async ({ request, url }) => {
	if (!env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) error(401);
	await runScheduled(env.PUBLIC_BASE_URL || url.origin);
	return json({ ok: true });
};
