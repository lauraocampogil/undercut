import { page } from '$app/state';

/** Form action URL that keeps the current query string (?days=…&mode=…), so the page reloads in place after submit. */
export function act(name: string) {
	const p = new URLSearchParams(page.url.search);
	for (const k of [...p.keys()]) if (k.startsWith('/')) p.delete(k);
	const q = p.toString();
	return `?${q ? `${q}&` : ''}/${name}`;
}
