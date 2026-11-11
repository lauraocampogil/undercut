import { json } from '@sveltejs/kit';
import { getClient } from '#lib/server/store.ts';
import { livePayload } from '#lib/server/fixes.ts';

// Read by /u.js on every page view: the SEO fixes the agency published for this page.
export const GET = ({ url }) => {
	const site = url.searchParams.get('site') ?? '';
	const headers = { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=120' };
	if (!getClient(site)) return json({}, { headers });
	return json(livePayload(site, url.searchParams.get('path') ?? '/'), { headers });
};
