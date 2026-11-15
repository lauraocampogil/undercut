import { error } from '@sveltejs/kit';
import { getClient } from '#lib/server/store.ts';
import { demoPageHtml, readSnapshot, type Device } from '#lib/server/tracking.ts';

// Serves the stored page snapshot for the heatmap iframe. Scripts are blocked by CSP + sandbox.
export const GET = ({ params, url }) => {
	const client = getClient(params.id);
	if (!client) error(404);
	const device: Device = url.searchParams.get('device') === 'mobile' ? 'mobile' : 'desktop';
	const path = url.searchParams.get('path') ?? '/';
	let html = client.demo
		? demoPageHtml(client, device)
		: (readSnapshot(client.id, path, device)?.html ??
			`<!doctype html><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#f3f3f0;color:#666"><p>No snapshot of ${path} on ${device} yet — it is captured on the first real visit after the snippet is installed.</p></body>`);
	// Animation libraries (GSAP, AOS, scroll reveals) keep content invisible until JS runs — scripts are off here,
	// so force everything visible and still, otherwise the heatmap is drawn over an empty page.
	const reveal = `<style id="undercut-reveal">*,*::before,*::after{animation:none!important;transition:none!important}[style*="opacity: 0"],[style*="opacity:0"],[data-aos],[data-scroll],.reveal,.fade-in,.fade-up,[class*="opacity-0"]{opacity:1!important}[style*="visibility: hidden"],[style*="visibility:hidden"]{visibility:visible!important}[data-aos],[style*="translate"],[style*="matrix"]{transform:none!important}</style>`;
	if (!client.demo) html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${reveal}</head>`) : reveal + html;
	return new Response(html, {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'content-security-policy': "script-src 'none'; frame-ancestors 'self'",
			'x-frame-options': 'SAMEORIGIN',
			'cache-control': 'private, max-age=300'
		}
	});
};
