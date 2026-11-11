// Real sitemap.xml analysis — works for any public site, no Google login needed.
import { XMLParser } from 'fast-xml-parser';
import type { SitemapReport } from '#lib/types.ts';

const parser = new XMLParser({ ignoreAttributes: true });
const UA = { 'user-agent': 'UndercutBot/0.1 (+https://undercut.app)' };

async function get(url: string, timeoutMs = 8000) {
	const ctrl = new AbortController();
	const t = setTimeout(() => ctrl.abort(), timeoutMs);
	try {
		return await fetch(url, { headers: UA, signal: ctrl.signal, redirect: 'follow' });
	} finally {
		clearTimeout(t);
	}
}

export function normaliseSite(input: string) {
	let s = input.trim();
	if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
	const u = new URL(s);
	return u.origin;
}

const arr = <T>(x: T | T[] | undefined): T[] => (x === undefined ? [] : Array.isArray(x) ? x : [x]);

export async function analyseSitemap(site: string): Promise<SitemapReport> {
	const origin = normaliseSite(site);
	const report: SitemapReport = {
		url: origin,
		found: false,
		sitemapUrl: null,
		via: null,
		urlCount: 0,
		childSitemaps: 0,
		withLastmod: 0,
		newestLastmod: null,
		stale: 0,
		httpUrls: 0,
		duplicates: 0,
		checked: [],
		broken: 0
	};

	// 1. robots.txt may declare the sitemap location
	let candidates: { url: string; via: 'robots.txt' | 'default' }[] = [];
	try {
		const r = await get(`${origin}/robots.txt`);
		if (r.ok) {
			const txt = await r.text();
			for (const m of txt.matchAll(/^\s*sitemap:\s*(\S+)/gim)) candidates.push({ url: m[1], via: 'robots.txt' });
		}
	} catch {
		/* ignore */
	}
	candidates.push(
		{ url: `${origin}/sitemap.xml`, via: 'default' },
		{ url: `${origin}/sitemap_index.xml`, via: 'default' }
	);

	let xml: any = null;
	for (const c of candidates) {
		try {
			const r = await get(c.url);
			if (!r.ok) continue;
			const body = await r.text();
			if (!body.includes('<urlset') && !body.includes('<sitemapindex')) continue;
			xml = parser.parse(body);
			report.found = true;
			report.sitemapUrl = c.url;
			report.via = c.via;
			break;
		} catch {
			/* try next */
		}
	}
	if (!xml) {
		report.error = 'No sitemap.xml found (checked robots.txt, /sitemap.xml and /sitemap_index.xml).';
		return report;
	}

	// 2. Collect URLs, following a sitemap index (max 10 child sitemaps)
	const urls: { loc: string; lastmod?: string }[] = [];
	const index = arr<any>(xml.sitemapindex?.sitemap);
	if (index.length) {
		report.childSitemaps = index.length;
		const children = index.slice(0, 10);
		await Promise.all(
			children.map(async (s) => {
				try {
					const r = await get(String(s.loc));
					if (!r.ok) return;
					const child = parser.parse(await r.text());
					for (const u of arr<any>(child.urlset?.url)) urls.push({ loc: String(u.loc), lastmod: u.lastmod });
				} catch {
					/* ignore broken child */
				}
			})
		);
	} else {
		for (const u of arr<any>(xml.urlset?.url)) urls.push({ loc: String(u.loc), lastmod: u.lastmod });
	}

	report.urlCount = urls.length;
	const seen = new Set<string>();
	const yearAgo = Date.now() - 365 * 864e5;
	let newest = 0;
	for (const u of urls) {
		if (seen.has(u.loc)) report.duplicates++;
		seen.add(u.loc);
		if (u.loc.startsWith('http://')) report.httpUrls++;
		if (u.lastmod) {
			report.withLastmod++;
			const t = Date.parse(String(u.lastmod));
			if (!Number.isNaN(t)) {
				if (t < yearAgo) report.stale++;
				if (t > newest) newest = t;
			}
		}
	}
	report.newestLastmod = newest ? new Date(newest).toISOString().slice(0, 10) : null;

	// 3. Check a sample of URLs actually respond (first 15)
	const sample = [...seen].slice(0, 15);
	report.checked = await Promise.all(
		sample.map(async (url) => {
			try {
				const r = await get(url, 6000);
				return { url, status: r.status };
			} catch {
				return { url, status: 0 };
			}
		})
	);
	report.broken = report.checked.filter((c) => c.status === 0 || c.status >= 400).length;
	return report;
}

// ---- cache + demo ----
const cache = new Map<string, { at: number; report: SitemapReport }>();

export async function sitemapFor(client: { domain: string; demo?: boolean; id: string }): Promise<SitemapReport> {
	if (client.demo) return demoSitemap(client.domain, client.id);
	const key = normaliseSite(client.domain);
	const hit = cache.get(key);
	if (hit && Date.now() - hit.at < 60 * 60 * 1000) return hit.report;
	const report = await analyseSitemap(key);
	cache.set(key, { at: Date.now(), report });
	return report;
}

function demoSitemap(domain: string, id: string): SitemapReport {
	const n = 12 + (id.length * 7) % 40;
	const broken = id.length % 3 === 0 ? 2 : 0;
	const origin = normaliseSite(domain);
	const paths = ['/', '/services', '/contact', '/about', '/blog/guide-2026', '/pricing', '/faq', '/old-promo', '/team'];
	return {
		url: origin,
		found: true,
		sitemapUrl: `${origin}/sitemap.xml`,
		via: 'robots.txt',
		urlCount: n,
		childSitemaps: 0,
		withLastmod: n - 2,
		newestLastmod: new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10),
		stale: 3,
		httpUrls: 0,
		duplicates: 0,
		checked: paths.map((p, i) => ({ url: origin + p, status: broken && i >= paths.length - broken ? 404 : 200 })),
		broken
	};
}
