import { getProduct } from '#lib/server/public.ts';

// <img> badge for the owner's website: "Undercut | 82% fixed"
export const GET = async ({ params }) => {
	const p = await getProduct(params.slug);
	const value = p?.owner ? `${p.score ?? 0}% fixed` : 'not claimed';
	const w = 92 + value.length * 7;
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="28" viewBox="0 0 ${w} 28" role="img" aria-label="Undercut: ${value}"><rect width="${w}" height="28" rx="14" fill="#0d0d0d"/><rect x="84" y="3" width="${w - 87}" height="22" rx="11" fill="#fff"/><text x="14" y="18" font-family="Plus Jakarta Sans,Arial,sans-serif" font-size="12" font-weight="600" fill="#fff">Undercut</text><text x="${84 + (w - 87) / 2}" y="18" text-anchor="middle" font-family="Plus Jakarta Sans,Arial,sans-serif" font-size="12" font-weight="600" fill="#0d0d0d">${value}</text></svg>`;
	return new Response(svg, { headers: { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=3600' } });
};
