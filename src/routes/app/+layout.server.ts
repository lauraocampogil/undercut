import { getAccount, getAgency, getBilling, listClients, getTokens } from '#lib/server/store.ts';
import { googleConfigured } from '#lib/server/google.ts';
import { unreadCount } from '#lib/server/alerts.ts';

export const load = () => {
	const t = getTokens();
	return {
		agency: getAgency(),
		account: getAccount(),
		billing: getBilling(),
		unread: unreadCount(),
		clients: listClients()
			.map((c) => ({ id: c.id, name: c.name, color: c.color }))
			.sort((a, b) => a.name.localeCompare(b.name)),
		google: { configured: googleConfigured(), connected: Boolean(t), email: t?.email ?? null }
	};
};
