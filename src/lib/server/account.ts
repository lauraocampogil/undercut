// Delete an account and everything in it (GDPR). Claimed products go back to unclaimed: the public database keeps them,
// since they hold no data about the person.
import { db, dbOn } from './db.ts';
import { listAnalyses } from './reviewdb.ts';
import { unclaimProduct } from './public.ts';
import { cancelNow } from './billing.ts';
import { writeData } from './store.ts';

export async function deleteAccount(ws: string | null) {
	await cancelNow();
	for (const a of listAnalyses().filter((x) => x.claimed)) await unclaimProduct(a, ws).catch(() => null);
	if (dbOn() && ws) {
		// logins and kv go with it (on delete cascade); public products were unclaimed above
		await db.update('public_products', { workspace_id: `eq.${ws}` }, { workspace_id: null, score: null }).catch(() => null);
		await db.remove('workspaces', { id: `eq.${ws}` });
		return;
	}
	// local mode: empty the workspace files
	writeData('analyses.json', []);
	writeData('account.json', { name: '', email: '', language: 'en' });
	writeData('billing.json', { plan: 'trial', trialEnds: '' });
}
