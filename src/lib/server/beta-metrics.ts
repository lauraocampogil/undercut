// Beta metrics for the founder (/admin): are agencies actually using the sales loop?
// The launch gates: 50% contact 3+ prospects, fewer than 1 in 5 leads skipped as bad, 3 agencies with a real meeting.
import { allWorkspaces, getAgency, loadWorkspace } from './store.ts';
import { inWorkspace } from './context.ts';
import { dbOn } from './db.ts';
import { getOS } from './agency-os.ts';
import { getBiz } from './business.ts';

export type AgencyMetrics = { ws: string; name: string; city: string; found: number; contacted: number; skipped: number; talking: number; won: number; payments: number; lastActive: string | null };

function measure(ws: string): AgencyMetrics {
	const os = getOS();
	const p = os.pipeline;
	const contacted = p.filter((x) => x.stage !== 'new' && !(x.stage === 'lost' && (x.note ?? '').includes('Skipped from the inbox'))).length;
	const skipped = p.filter((x) => x.stage === 'lost' && (x.note ?? '').includes('Skipped from the inbox')).length;
	const last = p.map((x) => x.updatedAt).sort().at(-1) ?? null;
	return { ws, name: os.profile?.name || getAgency().name || '—', city: os.profile?.city ?? '', found: p.length, contacted, skipped, talking: p.filter((x) => x.stage === 'talking').length, won: p.filter((x) => x.stage === 'won').length, payments: getBiz().payments.length, lastActive: last };
}

export async function betaMetrics() {
	const rows: AgencyMetrics[] = [];
	if (!dbOn()) rows.push(measure('local'));
	else
		for (const ws of await allWorkspaces()) {
			try {
				await loadWorkspace(ws, true);
				rows.push(await inWorkspace(ws, () => measure(ws)));
			} catch {
				/* skip a broken workspace */
			}
		}
	const n = rows.length || 1;
	const contacted = rows.reduce((t, r) => t + r.contacted, 0);
	const skipped = rows.reduce((t, r) => t + r.skipped, 0);
	return {
		rows: rows.sort((a, z) => (z.lastActive ?? '').localeCompare(a.lastActive ?? '')),
		gates: {
			activated: Math.round((rows.filter((r) => r.contacted >= 3).length / n) * 100),
			badLeads: contacted + skipped ? Math.round((skipped / (contacted + skipped)) * 100) : null,
			withMeeting: rows.filter((r) => r.talking + r.won > 0).length
		}
	};
}
