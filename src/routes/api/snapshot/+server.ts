import { json } from '@sveltejs/kit';
import { getClient, withSite } from '#lib/server/store.ts';
import { fromClientSite, needSnapshot, saveSnapshot, type Device } from '#lib/server/tracking.ts';

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' };
const dev = (d: string | null): Device => (d === 'mobile' ? 'mobile' : 'desktop');

export const OPTIONS = () => new Response(null, { headers: CORS });

export const GET = async ({ url, request }) => {
	const site = url.searchParams.get('site') ?? '';
	if (!(await withSite(site, () => { const c = getClient(site); return Boolean(c && fromClientSite(c, request)); }))) return json({ need: false }, { headers: CORS });
	return json({ need: needSnapshot(site, url.searchParams.get('path') ?? '/', dev(url.searchParams.get('device'))) }, { headers: CORS });
};

export const POST = async ({ request }) => {
	const text = await request.text();
	if (text.length > 2_500_000) return new Response('too large', { status: 413, headers: CORS });
	try {
		const b = JSON.parse(text);
		if (typeof b.html !== 'string' || !(await withSite(String(b.site), () => { const c = getClient(String(b.site)); return Boolean(c && fromClientSite(c, request)); }))) return new Response('unknown site', { status: 404, headers: CORS });
		saveSnapshot(b.site, String(b.path || '/'), dev(b.device), b.html, Number(b.height) || 2000);
		return new Response(null, { status: 204, headers: CORS });
	} catch {
		return new Response('bad request', { status: 400, headers: CORS });
	}
};
