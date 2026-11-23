import { getOS, monthlyQuota, usedThisMonth } from '#lib/server/agency-os.ts';
import { agencyActions } from '#lib/server/agency-actions.ts';
import { businessActions } from '#lib/server/business-actions.ts';
import { inboxItems, weekStats } from '#lib/server/inbox.ts';
import { mailboxInfo, syncReplies } from '#lib/server/mailbox.ts';
import { mailboxActions } from '#lib/server/mailbox-actions.ts';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Today: Undercut does one thing, find clients. First messages and follow-ups to approve, one at a time.
export const load = async () => {
	// who replied since last time (from the agency's mailbox, at most every 5 minutes)
	await Promise.race([syncReplies().catch(() => 0), wait(5000)]);
	const os = getOS();
	const ui = os.ui ?? os.profile?.lang ?? 'fr';
	return {
		profile: os.profile,
		started: os.pipeline.length > 0,
		inbox: os.profile ? inboxItems({ payments: false, ui }) : [],
		week: weekStats(),
		waiting: os.pipeline.filter((p) => p.stage === 'new').length,
		quota: monthlyQuota(),
		used: usedThisMonth(os),
		mailbox: mailboxInfo()?.email ?? null
	};
};

export const actions = { start: agencyActions.start, find: agencyActions.find, refresh: agencyActions.refresh, stage: agencyActions.stage, inbox: businessActions.inbox, send: mailboxActions.send };
