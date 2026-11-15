import { error, json } from '@sveltejs/kit';
import * as env from '$app/env/private';
import { runAlerts, weeklyDigest } from '#lib/server/alerts.ts';
import { allWorkspaces, loadWorkspace } from '#lib/server/store.ts';
import { inWorkspace } from '#lib/server/context.ts';
import { dbOn } from '#lib/server/db.ts';

// Called by Vercel Cron (see vercel.json): daily alerts, weekly digest on Mondays.
export const GET = async ({ request, url }) => {
	if (env.CRON_SECRET && request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) error(401);
	const task = url.searchParams.get('task') ?? 'alerts';
	if (dbOn()) {
		// every agency workspace
		const out: Record<string, number | string> = {};
		for (const ws of await allWorkspaces()) {
			await loadWorkspace(ws, true);
			out[ws] = await inWorkspace(ws, async () => (task === 'digest' ? ((await weeklyDigest(url.origin)).sent ? 'sent' : 'skipped') : (await runAlerts(url.origin)).length));
		}
		return json(out);
	}
	if (task === 'digest') return json(await weeklyDigest(url.origin));
	const fresh = await runAlerts(url.origin);
	return json({ alerts: fresh.length });
};
