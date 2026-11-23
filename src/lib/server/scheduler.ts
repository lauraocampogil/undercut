// Built-in scheduler for self-hosting (Docker / Coolify): daily alerts at ~06:15, weekly digest on Monday ~06:35
// (server time zone, set TZ=Europe/Brussels). On Vercel, vercel.json crons call /api/cron instead.
// Multi-agency mode: runs once per agency workspace.
import * as env from '$app/env/private';
import { allWorkspaces, loadWorkspace, readData, writeData } from './store.ts';
import { runAlerts, weeklyDigest } from './alerts.ts';
import { snapshotAllApps } from './appstore.ts';
import { inWorkspace } from './context.ts';
import { dbOn } from './db.ts';
import { sendMorningBrief } from './brief.ts';
import { syncReplies } from './mailbox.ts';

let started = false;

async function runFor(base: string) {
	const now = new Date();
	const today = now.toLocaleDateString('sv-SE'); // YYYY-MM-DD in server time zone
	// replies in the agency's mailbox: every tick (10 min)
	await syncReplies(true).catch((e) => console.error('[scheduler] replies', e));
	const state = readData<{ alerts?: string; digest?: string; store?: string; brief?: string }>('scheduler.json', {});
	if (state.store !== today) {
		// App Store positions, ratings and competitors: one snapshot per day
		state.store = today;
		writeData('scheduler.json', state);
		await snapshotAllApps().catch((e) => console.error('[scheduler] store', e));
	}
	if (now.getHours() >= 6 && state.alerts !== today) {
		state.alerts = today;
		writeData('scheduler.json', state);
		await runAlerts(base);
	}
	if (now.getHours() >= 7 && state.brief !== today) {
		state.brief = today;
		writeData('scheduler.json', state);
		await sendMorningBrief(base).catch((e) => console.error('[scheduler] brief', e));
	}
	if (now.getDay() === 1 && now.getHours() >= 6 && state.digest !== today) {
		state.digest = today;
		writeData('scheduler.json', state);
		await weeklyDigest(base);
	}
}

/** Run the daily jobs now (scheduler tick and /api/cron). */
export async function runScheduled(base: string) {
	if (!dbOn()) return runFor(base);
	for (const ws of await allWorkspaces()) {
		try {
			await loadWorkspace(ws, true);
			await inWorkspace(ws, () => runFor(base));
		} catch (e) {
			console.error('[scheduler]', ws, e);
		}
	}
}

export function startScheduler(origin: string) {
	if (started || env.SCHEDULER === 'off' || process.env.VERCEL) return;
	started = true;
	const base = env.PUBLIC_BASE_URL || origin;
	const tick = () => runScheduled(base).catch((e) => console.error('[scheduler]', e));
	setTimeout(tick, 30_000);
	setInterval(tick, 10 * 60_000).unref?.();
}
