import { getOS } from '#lib/server/agency-os.ts';
import { agencyActions } from '#lib/server/agency-actions.ts';
import { businessActions } from '#lib/server/business-actions.ts';
import { getBiz } from '#lib/server/business.ts';
import { mailboxInfo, syncReplies } from '#lib/server/mailbox.ts';
import { mailboxActions } from '#lib/server/mailbox-actions.ts';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Pipeline: everyone you wrote to, in three steps. Undercut moves them (follow-ups, "Not now" after 2 without answer).
export const load = async () => {
	await Promise.race([syncReplies().catch(() => 0), wait(5000)]);
	const os = getOS();
	const clients = Object.fromEntries(getBiz().clients.filter((c) => c.fromProspect).map((c) => [c.fromProspect!, c.id]));
	const card = (p: (typeof os.pipeline)[number]) => ({
		id: p.id,
		name: p.name,
		category: p.category,
		contactedAt: p.contactedAt,
		updatedAt: p.updatedAt.slice(0, 10),
		next: p.next,
		followups: p.followups ?? 0,
		note: p.note,
		value: p.value,
		email: p.email,
		phone: p.phone,
		reply: p.reply,
		clientId: clients[p.id]
	});
	const cards = os.pipeline.filter((p) => p.stage !== 'new').sort((a, z) => z.updatedAt.localeCompare(a.updatedAt)).map((p) => ({ ...card(p), stage: p.stage }));
	const mb = mailboxInfo();
	return { mailbox: mb ? { email: mb.email, lastSync: mb.lastSync ?? null, error: mb.lastError ?? null } : null, cards, toSend: os.pipeline.filter((p) => p.stage === 'new').length };
};

export const actions = { syncNow: mailboxActions.syncNow, stage: agencyActions.stage, item: agencyActions.item, makeClient: businessActions.makeClient };
