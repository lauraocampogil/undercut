import { listProducts } from '#lib/server/public.ts';

// Every public product page, so search engines find "what users hate about X".
export const GET = async () => {
	const base = 'https://getundercut.app';
	const rows = await listProducts().catch(() => []);
	const urls = [
		{ loc: `${base}/`, mod: new Date().toISOString().slice(0, 10) },
		{ loc: `${base}/waitlist`, mod: new Date().toISOString().slice(0, 10) },
		{ loc: `${base}/privacy` },
		{ loc: `${base}/terms` },
		...rows.map((r) => ({ loc: `${base}/p/${r.slug}`, mod: r.updatedAt.slice(0, 10) }))
	];
	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${u.loc}</loc>${u.mod ? `<lastmod>${u.mod}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>`;
	return new Response(xml, { headers: { 'content-type': 'application/xml', 'cache-control': 'max-age=3600' } });
};
