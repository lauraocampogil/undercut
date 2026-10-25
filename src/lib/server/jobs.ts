import type { Account, Store } from '$lib/types';
import { config, db } from './config';
import { reminderEmail, sendEmail } from './email';
import { headlines } from './engine/report';
import { pool, syncStore } from './engine/track';

/** Checks every tracked store (and users' own stores). Meant to run once a day. */
export async function syncAll() {
	const repo = db();
	const accounts = await repo.listAccounts();
	const ids = new Set([
		...(await repo.allTrackedStoreIds()),
		...(accounts.map((a) => a.own_store_id).filter(Boolean) as string[])
	]);
	const stores = await repo.getStores([...ids]);
	const results = await pool(stores, 4, async (s) => {
		try {
			const r = await syncStore(s.domain);
			return { domain: s.domain, ok: r.ok, changes: r.changes.length };
		} catch (e) {
			return { domain: s.domain, ok: false, changes: 0, error: String(e) };
		}
	});
	return results;
}

/** Syncs only one account's stores (the dashboard "Refresh now" button). */
export async function syncAccount(account: Account) {
	const repo = db();
	const tracked = await repo.getTracked(account.id);
	const ids = [...tracked.map((t) => t.store_id), ...(account.own_store_id ? [account.own_store_id] : [])];
	const stores = await repo.getStores(ids);
	return pool(stores, 4, (s) => syncStore(s.domain).then((r) => r.changes.length));
}

export async function sendReminder(account: Account) {
	const repo = db();
	const tracked = await repo.getTracked(account.id);
	const storeIds = tracked.map((t) => t.store_id);
	const since = new Date(Date.now() - 7 * 864e5).toISOString();
	const changes = await repo.listChanges(storeIds, since, 2000);
	const stores = new Map<string, Store>((await repo.getStores(storeIds)).map((s) => [s.id, s]));
	const lines = headlines(changes, stores, 3);
	const email = reminderEmail({
		count: changes.length,
		competitors: storeIds.length,
		headline: lines[0] ?? null,
		url: `${config.appUrl}/dashboard`
	});
	await sendEmail(account.email, email.subject, email.html, email.text);
	return { email: account.email, changes: changes.length };
}

/** Sends the weekly summary to accounts whose chosen day is today. */
export async function sendDueReminders(date = new Date()) {
	const day = date.getUTCDay();
	const accounts = (await db().listAccounts()).filter((a) => a.reminder_day === day);
	return pool(accounts, 3, (a) => sendReminder(a).catch((e) => ({ email: a.email, error: String(e) })));
}
