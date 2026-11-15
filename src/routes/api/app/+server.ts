import { getClient, withSite } from '#lib/server/store.ts';
import { recordApp } from '#lib/server/app-events.ts';
import { fromClientSite } from '#lib/server/tracking.ts';

// Receives events from the Undercut app SDK (paywall, purchases, errors, sessions)
// and JS errors caught by the web snippet. Body: { site, events: [...] }
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' };

export const OPTIONS = () => new Response(null, { headers: CORS });

export const POST = async ({ request }) => {
	try {
		const text = await request.text();
		if (text.length > 300_000) return new Response('too large', { status: 413, headers: CORS });
		const body = JSON.parse(text) as { site?: string; events?: unknown[] };
		if (!body?.site || !Array.isArray(body.events)) return new Response('bad request', { status: 400, headers: CORS });
		const fromBrowser = Boolean(request.headers.get('origin'));
		const ok = await withSite(body.site, () => {
			const client = getClient(body.site!);
			if (!client) return false;
			// native apps send no Origin header; browsers must come from the client's own site
			if (fromBrowser && !fromClientSite(client, request)) return true;
			recordApp(body.site!, body.events!, fromBrowser ? 'web' : undefined);
			return true;
		});
		return ok ? new Response(null, { status: 204, headers: CORS }) : new Response('unknown site', { status: 404, headers: CORS });
	} catch {
		return new Response('bad request', { status: 400, headers: CORS });
	}
};
