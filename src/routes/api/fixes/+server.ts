import { json } from '@sveltejs/kit';
import { getClient, withSite } from '#lib/server/store.ts';
import { livePayload } from '#lib/server/fixes.ts';

// Read by /u.js on every page view: the SEO fixes the agency published for this page.
export const GET = async ({ url }) => {
	const site = url.searchParams.get('site') ?? '';
	const headers = { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=120' };
	const out = await withSite(site, () => {
		const client = getClient(site);
		if (!client) return {};
		const g = client.google;
		// optional: the snippet also loads the client's Tag Manager container (GA4 without touching the site)
		const gtm = g.loadGtm && g.gtmPublicId && /^GTM-[A-Z0-9]+$/.test(g.gtmPublicId) ? g.gtmPublicId : undefined;
		return { ...livePayload(site, url.searchParams.get('path') ?? '/'), gtm };
	});
	return json(out ?? {}, { headers });
};
