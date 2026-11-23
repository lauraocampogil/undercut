import { getOS, monthlyQuota, usedThisMonth } from '#lib/server/agency-os.ts';
import { agencyActions } from '#lib/server/agency-actions.ts';
import { businessActions } from '#lib/server/business-actions.ts';
import { inboxItems, weekStats } from '#lib/server/inbox.ts';

// Today: Undercut does one thing, find clients. First messages and follow-ups to approve, one at a time.
export const load = () => {
	const os = getOS();
	const ui = os.ui ?? os.profile?.lang ?? 'fr';
	return {
		profile: os.profile,
		started: os.pipeline.length > 0,
		inbox: os.profile ? inboxItems({ payments: false, ui }) : [],
		week: weekStats(),
		waiting: os.pipeline.filter((p) => p.stage === 'new').length,
		quota: monthlyQuota(),
		used: usedThisMonth(os)
	};
};

export const actions = { start: agencyActions.start, find: agencyActions.find, refresh: agencyActions.refresh, stage: agencyActions.stage, inbox: businessActions.inbox };
