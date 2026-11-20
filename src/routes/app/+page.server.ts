import { getOS, monthlyQuota, pipelineStats, usedThisMonth } from '#lib/server/agency-os.ts';
import { agencyActions } from '#lib/server/agency-actions.ts';
import { businessActions } from '#lib/server/business-actions.ts';
import { agenda, getBiz, money } from '#lib/server/business.ts';

export const load = () => {
	const os = getOS();
	const b = getBiz();
	const stats = pipelineStats(os);
	const names = Object.fromEntries(b.clients.map((c) => [c.id, c.name]));
	return {
		os: { profile: os.profile, blocks: os.blocks, order: os.order, sizes: os.sizes, goal: os.goal, built: os.built && !os.built.seen ? os.built : null, fresh: os.pipeline.filter((p) => p.stage === 'new').slice(0, 4) },
		stats: { counts: stats.counts, wonMonth: stats.wonMonth, wonValue: stats.wonValue, replyRate: stats.replyRate },
		quota: monthlyQuota(),
		used: usedThisMonth(os),
		tasks: b.tasks.filter((t) => !t.done).sort((a, z) => (a.due ?? '9').localeCompare(z.due ?? '9')).slice(0, 6).map((t) => ({ ...t, client: t.clientId ? names[t.clientId] : undefined })),
		openTasks: b.tasks.filter((t) => !t.done).length,
		agenda: agenda(b, os.pipeline, 7).slice(0, 7),
		clients: b.clients.filter((c) => c.status === 'active').sort((a, z) => (z.fee ?? 0) - (a.fee ?? 0)).slice(0, 6).map((c) => ({ id: c.id, name: c.name, services: c.services, fee: c.fee, site: c.site ? c.site.status >= 200 && c.site.status < 400 : null })),
		clientCount: b.clients.length,
		clientOptions: b.clients.filter((c) => c.status !== 'ended').map((c) => ({ id: c.id, name: c.name })),
		money: money(b),
		currency: b.details.currency
	};
};

export const actions = { ...agencyActions, ...businessActions };
