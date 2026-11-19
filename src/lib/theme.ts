// The agency's colour → CSS variables. No colour = Undercut lime (set in layout.css). NEUTRAL = black & white.
const hex = (h: string) => {
	const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
	if (!m) return null;
	const n = parseInt(m[1], 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lum = ([r, g, b]: number[]) => {
	const f = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
	return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const toHex = (c: number[]) => '#' + c.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
const mix = (a: number[], b: number[], t: number) => a.map((x, i) => x + (b[i] - x) * t);

export const isHex = (h: string) => Boolean(hex(h));

/** Inline style for the app root. `accent` null → neutral. */
export function themeStyle(accent: string | null | undefined) {
	const c = accent ? hex(accent) : null;
	if (!c) return '';
	const L = lum(c);
	const ink = L > 0.45 ? '#0d0d0d' : '#ffffff';
	// on dark cards, a too-dark colour is lifted so it stays readable
	let dark = c;
	for (let i = 0; i < 6 && lum(dark) < 0.18; i++) dark = mix(dark, [255, 255, 255], 0.25);
	const darkInk = lum(dark) > 0.45 ? '#0d0d0d' : '#ffffff';
	return `--color-accent:${toHex(c)};--color-accent-soft:color-mix(in oklab, ${toHex(c)} 12%, white);--color-accent-ink:${ink};--accent-dark:${toHex(dark)};--accent-dark-ink:${darkInk}`;
}

export const NEUTRAL = '#0D0D0D';
export const SWATCHES = ['#2F6BFF', '#7C5CFF', '#E8590C', '#E64980', '#12B886', '#F2C94C'];
