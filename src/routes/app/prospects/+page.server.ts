import { getOS, monthlyQuota, pipelineStats, usedThisMonth } from '#lib/server/agency-os.ts';
import { agencyActions } from '#lib/server/agency-actions.ts';

export const load = () => {
	const s = getOS();
	return { profile: s.profile, pipeline: s.pipeline, stats: pipelineStats(s), quota: monthlyQuota(), used: usedThisMonth(s) };
};

export const actions = agencyActions;
