import { checkUnsubscribe } from '#lib/server/mails.ts';
import { early, setAnswers } from '#lib/server/waitlist.ts';
import { dbOn } from '#lib/server/db.ts';
import { getAccount, loadWorkspace, lookupLogin, saveAccount } from '#lib/server/store.ts';
import { inWorkspace } from '#lib/server/context.ts';

// The link at the bottom of every email: no more emails to this address (waitlist and monthly report).
async function unsubscribe(email: string) {
	const w = (await early()).find((x) => x.row.email === email);
	if (w) await setAnswers(email, { ...w.a, unsubscribed: new Date().toISOString() });
	const ws = dbOn() ? await lookupLogin(email).catch(() => null) : null;
	if (ws) {
		await loadWorkspace(ws);
		await inWorkspace(ws, () => saveAccount({ ...getAccount(), noEmails: true }));
	} else if (!dbOn() && getAccount().email === email) saveAccount({ ...getAccount(), noEmails: true });
}

const run = async (url: URL) => {
	const email = (url.searchParams.get('e') ?? '').toLowerCase();
	if (!checkUnsubscribe(email, url.searchParams.get('t') ?? '')) return { ok: false, email: '' };
	await unsubscribe(email);
	return { ok: true, email };
};

export const load = ({ url }) => run(url);
// one-click unsubscribe from Gmail / Outlook (List-Unsubscribe-Post)
export const actions = { default: ({ url }) => run(url) };
