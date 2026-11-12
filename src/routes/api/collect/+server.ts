import { getClient } from '#lib/server/store.ts';
import { record, type TrackEvent } from '#lib/server/tracking.ts';

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' };

export const OPTIONS = () => new Response(null, { headers: CORS });

export const POST = async ({ request }) => {
	// country only (no IP stored), from the hosting platform's geo header when available
	const country = request.headers.get('x-vercel-ip-country') ?? request.headers.get('cf-ipcountry') ?? '';
	try {
		const text = await request.text();
		if (text.length > 200_000) return new Response('too large', { status: 413, headers: CORS });
		const body = JSON.parse(text) as { site: string; events: TrackEvent[] };
		if (!body?.site || !getClient(body.site) || !Array.isArray(body.events)) return new Response('unknown site', { status: 404, headers: CORS });
		record(body.site, body.events, country);
		return new Response(null, { status: 204, headers: CORS });
	} catch {
		return new Response('bad request', { status: 400, headers: CORS });
	}
};
