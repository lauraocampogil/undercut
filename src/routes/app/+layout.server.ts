import { getAgency, listClients, getTokens } from '#lib/server/store.ts';
import { googleConfigured } from '#lib/server/google.ts';

export const load = () => {
	const t = getTokens();
	return {
		agency: getAgency(),
		clients: listClients()
			.map((c) => ({ id: c.id, name: c.name, color: c.color }))
			.sort((a, b) => a.name.localeCompare(b.name)),
		google: { configured: googleConfigured(), connected: Boolean(t), email: t?.email ?? null }
	};
};
