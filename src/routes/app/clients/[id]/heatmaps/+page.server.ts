import { redirect } from '@sveltejs/kit';
import * as env from '$app/env/private';
import { hasWeb } from '#lib/server/store.ts';
import { sitemapFor } from '#lib/server/sitemap.ts';
import { behaviourTasks, getHeatmap, readSnapshot, type Device } from '#lib/server/tracking.ts';

export const load = async ({ parent, url }) => {
	const { client } = await parent();
	if (!hasWeb(client)) redirect(307, `/app/clients/${client.id}`);
	const device: Device = url.searchParams.get('device') === 'mobile' ? 'mobile' : 'desktop';
	let path = url.searchParams.get('path') ?? '/';
	if (!path.startsWith('/')) path = `/${path}`;
	const mode: 'clicks' | 'scroll' = url.searchParams.get('mode') === 'scroll' ? 'scroll' : 'clicks';
	const heat = getHeatmap(client, path, device);

	// Every page we know: visited pages first, then the rest of the sitemap (no visits yet).
	let sitemapPaths: string[] = [];
	if (!client.demo) {
		try {
			sitemapPaths = (await Promise.race([sitemapFor(client), new Promise<never>((_, r) => setTimeout(() => r(new Error('slow')), 6000))])).paths ?? [];
		} catch {
			/* sitemap is optional */
		}
	}
	const known = new Map(heat.pages.filter((p) => p.views || p.clicks).map((p) => [p.path, p]));
	const pages = [...known.values(), ...['/', ...sitemapPaths].filter((p) => !known.has(p)).filter((p, i, a) => a.indexOf(p) === i).map((p) => ({ path: p, views: 0, clicks: 0 }))];
	if (!pages.some((p) => p.path === path)) pages.unshift({ path, views: 0, clicks: 0 });

	const base = env.PUBLIC_BASE_URL || url.origin;
	return {
		heat,
		pages,
		device,
		path,
		mode,
		captured: client.demo || Boolean(readSnapshot(client.id, path, device)),
		tasks: behaviourTasks(heat),
		snippet: `<script defer src="${base}/u.js" data-site="${client.id}"></script>`
	};
};
