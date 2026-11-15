// Finds a Chrome/Chromium on the server (installed in the Docker image) for Lighthouse and live checks.
import { existsSync } from 'node:fs';

const CANDIDATES = [process.env.CHROME_PATH, '/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome', '/opt/google/chrome/chrome'];
export function chromePath(): string | null {
	return (CANDIDATES.filter(Boolean) as string[]).find((p) => existsSync(p)) ?? null;
}
export const CHROME_ARGS = ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'];

let queue: Promise<unknown> = Promise.resolve();
/** One headless Chrome job at a time: keeps a small server responsive. */
export function inChromeQueue<T>(fn: () => Promise<T>): Promise<T> {
	const run = queue.then(fn, fn);
	queue = run.catch(() => null);
	return run;
}
