// Proof that published fixes are really on the client's site: open the page in a real (headless) Chrome,
// like Google's renderer does, let the Undercut snippet run, then read the title, description and image texts.
import type { Client } from '#lib/types.ts';
import { chromePath, CHROME_ARGS, inChromeQueue } from './chrome.ts';
import { livePayload } from './fixes.ts';
import { readData, writeData } from './store.ts';

export type CheckItem = { kind: 'title' | 'description' | 'alt' | 'schema'; expected: string; found: string | null; ok: boolean; target?: string };
export type LiveCheck = { path: string; at: string; snippet: boolean; items: CheckItem[]; error?: string };

const file = (id: string) => `livecheck-${id}.json`;
export function lastChecks(client: Client): Record<string, LiveCheck> {
	return readData<Record<string, LiveCheck>>(file(client.id), {});
}

export async function checkLive(client: Client, path: string): Promise<LiveCheck> {
	const at = new Date().toISOString();
	const expected = livePayload(client.id, path);
	const fail = (error: string): LiveCheck => ({ path, at, snippet: false, items: [], error });
	const chrome = chromePath();
	if (!chrome) return fail('The live check needs Chrome on the server (included in the Docker image — redeploy).');
	if (!client.domain) return fail('This client has no website.');
	const result = await inChromeQueue(async () => {
		const { default: puppeteer } = await import('puppeteer-core');
		const browser = await puppeteer.launch({ executablePath: chrome, args: CHROME_ARGS });
		try {
			const page = await browser.newPage();
			await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 UndercutCheck');
			// tell the snippet this is a check: apply the fixes, but record no visit
			await page.evaluateOnNewDocument(() => Object.assign(window, { __ucCheck: 1 }));
			const url = new URL(path, client.domain).toString();
			await page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 }).catch(() => page.goto(url, { waitUntil: 'load', timeout: 30_000 }));
			const ready = await page.waitForFunction(() => (window as unknown as { __ucReady?: number }).__ucReady === 1, { timeout: 8000 }).then(() => true).catch(() => false);
			await new Promise((r) => setTimeout(r, 2500)); // fixes are applied right after the snippet loads them
			const seen = await page.evaluate(() => ({
				title: document.title,
				description: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? null,
				schema: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent ?? ''),
				imgs: [...document.images].map((i) => ({ src: (i.getAttribute('src') ?? '').trim(), abs: i.currentSrc || i.src, alt: i.getAttribute('alt') }))
			}));
			return { ready, seen };
		} finally {
			await browser.close().catch(() => null);
		}
	}).catch((e: Error) => ({ error: e.message }) as const);
	if ('error' in result) return fail(`Could not open the page (${String(result.error).slice(0, 140)}).`);
	const { ready, seen } = result;
	const bare = (u: string) => {
		try {
			const x = new URL(u.trim(), client.domain);
			return x.host + x.pathname;
		} catch {
			return u.trim();
		}
	};
	const items: CheckItem[] = [];
	if (expected.title) items.push({ kind: 'title', expected: expected.title, found: seen.title, ok: seen.title === expected.title });
	if (expected.description) items.push({ kind: 'description', expected: expected.description, found: seen.description, ok: seen.description === expected.description });
	for (const [target, alt] of Object.entries(expected.alts)) {
		const img = seen.imgs.find((i) => bare(i.src) === bare(target) || bare(i.abs) === bare(target));
		items.push({ kind: 'alt', target, expected: alt, found: img ? img.alt : null, ok: Boolean(img?.alt?.trim()) });
	}
	for (const s of expected.schema) items.push({ kind: 'schema', expected: 'structured data', found: seen.schema.some((x) => x.trim() === s.trim()) ? 'present' : null, ok: seen.schema.some((x) => x.trim() === s.trim()) });
	const check: LiveCheck = { path, at, snippet: ready, items, error: ready ? undefined : 'The Undercut snippet was not found on this page — fixes cannot go live until it is installed.' };
	const all = lastChecks(client);
	all[path] = check;
	writeData(file(client.id), all);
	return check;
}
