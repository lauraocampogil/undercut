import { getOS, monthlyQuota, pipelineStats, usedThisMonth } from '#lib/server/agency-os.ts';
import { agencyActions } from '#lib/server/agency-actions.ts';
import { businessActions } from '#lib/server/business-actions.ts';
import { getBiz } from '#lib/server/business.ts';

export const load = () => {
	const s = getOS();
	const clients = Object.fromEntries(getBiz().clients.filter((c) => c.fromProspect).map((c) => [c.fromProspect!, c.id]));
	return { profile: s.profile, pipeline: s.pipeline, stats: pipelineStats(s), quota: monthlyQuota(), used: usedThisMonth(s), clients };
};

export const actions = { ...agencyActions, makeClient: businessActions.makeClient };
