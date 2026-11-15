// Built-in scheduler for self-hosting (Docker / Coolify): daily alerts at ~06:15, weekly digest on Monday ~06:35
// (server time zone, set TZ=Europe/Brussels). On Vercel, vercel.json crons call /api/cron instead.
import * as env from '$app/env/private';
import { readData, writeData } from './store.ts';
import { runAlerts, weeklyDigest } from './alerts.ts';

let started = false;

export function startScheduler(origin: string) {
	if (started || env.SCHEDULER === 'off' || process.env.VERCEL) return;
	started = true;
	const base = env.PUBLIC_BASE_URL || origin;
	const tick = async () => {
		const now = new Date();
		const today = now.toLocaleDateString('sv-SE'); // YYYY-MM-DD in server time zone
		const state = readData<{ alerts?: string; digest?: string }>('scheduler.json', {});
		try {
			if (now.getHours() >= 6 && state.alerts !== today) {
				state.alerts = today;
				writeData('scheduler.json', state);
				await runAlerts(base);
			}
			if (now.getDay() === 1 && now.getHours() >= 6 && state.digest !== today) {
				state.digest = today;
				writeData('scheduler.json', state);
				await weeklyDigest(base);
			}
		} catch (e) {
			console.error('[scheduler]', e);
		}
	};
	setTimeout(tick, 30_000);
	setInterval(tick, 10 * 60_000).unref?.();
}
