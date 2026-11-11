import { error } from '@sveltejs/kit';
import { getClient } from '#lib/server/store.ts';
import { demoPageHtml, readSnapshot, type Device } from '#lib/server/tracking.ts';

// Serves the stored page snapshot for the heatmap iframe. Scripts are blocked by CSP + sandbox.
export const GET = ({ params, url }) => {
	const client = getClient(params.id);
	if (!client) error(404);
	const device: Device = url.searchParams.get('device') === 'mobile' ? 'mobile' : 'desktop';
	const path = url.searchParams.get('path') ?? '/';
	const html = client.demo
		? demoPageHtml(client, device)
		: (readSnapshot(client.id, path, device)?.html ??
			`<!doctype html><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#f3f3f0;color:#666"><p>No snapshot of ${path} on ${device} yet — it is captured on the first real visit after the snippet is installed.</p></body>`);
	return new Response(html, {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'content-security-policy': "script-src 'none'; frame-ancestors 'self'",
			'x-frame-options': 'SAMEORIGIN',
			'cache-control': 'private, max-age=300'
		}
	});
};
