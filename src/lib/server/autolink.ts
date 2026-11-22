// Link a tracked site to its Google Analytics, Search Console, Maps and Tag Manager automatically.
// Only empty links are filled, at most once a day, and never after the agency chose them by hand.
import type { Client } from '#lib/types.ts';
import { saveClient } from './store.ts';
import { googleReady, listAccounts, matchProperties } from './google.ts';

export async function autoLink(client: Client): Promise<Client> {
	const g = client.google ?? {};
	const missing = !g.ga4PropertyId || !g.gscSiteUrl || !g.gtmContainer;
	const stale = !g.autoLinkedAt || Date.now() - Date.parse(g.autoLinkedAt) > 864e5;
	if (client.demo || !googleReady() || !missing || !stale || g.manualAt) return client;
	try {
		const o = await listAccounts();
		const m = matchProperties(client, o);
		const next = { ...client, google: { ...g, ga4PropertyId: g.ga4PropertyId || m.ga4?.value, gscSiteUrl: g.gscSiteUrl || m.gsc?.value, gbpLocation: g.gbpLocation || m.gbp?.value, gtmContainer: g.gtmContainer || m.gtm?.value, autoLinkedAt: new Date().toISOString() } };
		saveClient(next);
		return next;
	} catch {
		return client; // try again next time
	}
}
