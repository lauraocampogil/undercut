import * as Sentry from '@sentry/sveltekit';
import { error, json } from '@sveltejs/kit';
import { config as env, db, demoMode } from '$lib/server/config';
import { sendDueReminders, sendReminder, syncAll } from '$lib/server/jobs';
import type { RequestHandler } from './$types';

/**
 * Daily cron (Vercel calls it at 06:00 UTC, see vercel.json).
 * 1) checks every store  2) sends the weekly summary to whoever is due today.
 * ?reminders=force sends the summary to every account (for testing).
 * Sentry Crons alerts us if a run fails or never happens.
 */
/** Checking every store can take a while: allow up to 5 minutes (Vercel Fluid compute). */
export const config = { maxDuration: 300 };

export const GET: RequestHandler = async ({ request, url }) => {
	const authorized = demoMode || (env.cronSecret && request.headers.get('authorization') === `Bearer ${env.cronSecret}`);
	if (!authorized) error(401, 'unauthorized');

	return Sentry.withMonitor(
		'daily-sync',
		async () => {
			const started = Date.now();
			const synced = await syncAll();
			const reminders =
				url.searchParams.get('reminders') === 'force'
					? await Promise.all((await db().listAccounts()).map((a) => sendReminder(a)))
					: await sendDueReminders();
			return json({ ms: Date.now() - started, synced, reminders });
		},
		{ schedule: { type: 'crontab', value: '0 6 * * *' }, checkinMargin: 30, maxRuntime: 15 }
	);
};
