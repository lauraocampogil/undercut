import { listAlerts, markAllRead, runAlerts } from '#lib/server/alerts.ts';

export const load = () => ({ alerts: listAlerts() });

export const actions = {
	read: () => {
		markAllRead();
		return { ok: true };
	},
	run: async ({ url }) => ({ found: (await runAlerts(url.origin)).length })
};
