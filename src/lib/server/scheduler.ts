// Built-in scheduler for self-hosting (Docker / Coolify). On Vercel, vercel.json crons call /api/cron instead.
// Once a day, per account: fetch the new reviews of the products it claimed, so fixes get verified on their own.
import * as env from '$app/env/private';
import { allWorkspaces, loadWorkspace, readData, writeData } from './store.ts';
import { inWorkspace, currentWs } from './context.ts';
import { dbOn } from './db.ts';
import { listAnalyses, refresh, saveAnalysis } from './reviewdb.ts';
import { claimProduct, indexAnalysis } from './public.ts';

let started = false;

async function runFor(_base: string) {
	// the 1st of each month: the monthly report for followed products
	if (new Date().getDate() === 1 && new Date().getHours() >= 7) {
		const { weeklyWatch } = await import('./watch.ts');
		await weeklyWatch(env.PUBLIC_BASE_URL || _base).catch((e) => console.error('[scheduler] watch', e));
	}
	const today = new Date().toLocaleDateString('sv-SE');
	const state = readData<{ claimed?: string }>('scheduler.json', {});
	if (state.claimed === today) return;
	state.claimed = today;
	writeData('scheduler.json', state);
	for (const a of listAnalyses().filter((x) => x.claimed)) {
		try {
			const b = await refresh(a);
			saveAnalysis(b);
			await indexAnalysis(b).catch(() => null);
			await claimProduct(b, currentWs() ?? null).catch(() => null);
		} catch (e) {
			console.error('[scheduler] refresh', a.id, (e as Error).message);
		}
	}
}

/** Run the daily jobs now (scheduler tick and /api/cron). */
export async function runScheduled(base: string) {
	// AI jobs cost money: off unless turned on (IDEAS_DAILY=on, REBUILD_PER_RUN=<n>)
	if (env.IDEAS_DAILY === 'on') {
		const { dailyIdeas } = await import('./opportunities.ts');
		await dailyIdeas().catch((e) => console.error('[scheduler] ideas', e));
	}
	const perRun = Number(env.REBUILD_PER_RUN) || 0;
	if (perRun > 0) {
		const { rebuildSecondHand } = await import('./rebuild.ts');
		await rebuildSecondHand(perRun).catch((e) => console.error('[scheduler] rebuild', e));
	}
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
	setInterval(tick, 60 * 60_000).unref?.();
}
