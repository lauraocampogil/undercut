import { error } from '@sveltejs/kit';
import { getClient, hasApp, hasWeb, saveClient } from '#lib/server/store.ts';
import { googleReady, listAccounts, matchProperties } from '#lib/server/google.ts';

export const load = async ({ params }) => {
	let client = getClient(params.id);
	if (!client) error(404, 'Client not found');
	// First visit after Google is connected: link this client's Analytics, Search Console, Maps and Tag Manager automatically.
	const g = client.google;
	if (!client.demo && googleReady() && !g.autoLinkedAt && !g.ga4PropertyId && !g.gscSiteUrl && !g.gtmContainer && !g.gbpLocation) {
		try {
			const o = await listAccounts();
			const m = matchProperties(client, o);
			client = { ...client, google: { ...g, ga4PropertyId: m.ga4?.value, gscSiteUrl: m.gsc?.value, gbpLocation: m.gbp?.value, gtmContainer: m.gtm?.value, autoLinkedAt: new Date().toISOString() } };
			if (!o.errors.length || m.ga4 || m.gsc) saveClient(client);
		} catch {
			/* try again next time */
		}
	}
	return { client, web: hasWeb(client), app: hasApp(client) };
};
