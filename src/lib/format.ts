import type { ChangeKind } from './types';

export const KIND_LABEL: Record<ChangeKind, string> = {
	price_down: 'Price drop',
	price_up: 'Price up',
	new_product: 'New product',
	sale_start: 'On sale',
	sale_end: 'Sale ended',
	out_of_stock: 'Sold out',
	restock: 'Back in stock'
};

export const KIND_TONE: Record<ChangeKind, 'down' | 'up' | 'new' | 'neutral'> = {
	price_down: 'down',
	sale_start: 'down',
	price_up: 'up',
	sale_end: 'up',
	new_product: 'new',
	out_of_stock: 'neutral',
	restock: 'neutral'
};

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function money(n: number | null | undefined, currency: string | null | undefined = 'EUR') {
	if (n === null || n === undefined || Number.isNaN(n)) return '—';
	try {
		return new Intl.NumberFormat('en-IE', {
			style: 'currency',
			currency: currency || 'EUR',
			maximumFractionDigits: n >= 100 ? 0 : 2
		}).format(n);
	} catch {
		return `${n.toFixed(2)} ${currency ?? ''}`;
	}
}

export const signedPct = (n: number | null | undefined) =>
	n === null || n === undefined ? '' : `${n > 0 ? '+' : ''}${n.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;

export function relativeDay(iso: string) {
	const d = new Date(iso);
	const days = Math.floor((Date.now() - d.getTime()) / 864e5);
	if (days <= 0) return 'Today';
	if (days === 1) return 'Yesterday';
	if (days < 7) return `${days} days ago`;
	return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Thumbnail of an image on Shopify's CDN. */
export function thumb(url: string | null, width = 200) {
	if (!url) return '';
	return url.includes('cdn.shopify.com') || url.includes('/cdn/shop/') ? `${url}${url.includes('?') ? '&' : '?'}width=${width}` : url;
}
