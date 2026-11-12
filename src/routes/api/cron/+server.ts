import { error, json } from '@sveltejs/kit';
import * as env from '$app/env/private';
import { runAlerts, weeklyDigest } from '#lib/server/alerts.ts';

// Called by Vercel Cron (see vercel.json): daily alerts, weekly digest on Mondays.
export const GET = async ({ request, url }) => {
	if (env.CRON_SECRET && request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) error(401);
	const task = url.searchParams.get('task') ?? 'alerts';
	if (task === 'digest') return json(await weeklyDigest(url.origin));
	const fresh = await runAlerts(url.origin);
	return json({ alerts: fresh.length });
};
