// Automatic SEO audit: runs on the client's own URL (no typing), cached 24 h.
// Checks the homepage + up to 9 pages from the sitemap, robots.txt, sitemap.xml and,
// optionally, Core Web Vitals through Google PageSpeed Insights.
import { parse } from 'node-html-parser';
import * as env from '$app/env/private';
import type { Client, Level } from '#lib/types.ts';
import { normaliseSite, sitemapFor } from './sitemap.ts';
import type { Draft } from './insights.ts';

export type PageAudit = {
	url: string;
	path: string;
	status: number;
	ms: number;
	title: string;
	desc: string;
	h1: number;
	canonical: boolean;
	noindex: boolean;
	lang: boolean;
	viewport: boolean;
	ogImage: boolean;
	schema: boolean;
	images: number;
	imagesNoAlt: number;
	words: number;
	h1Text?: string;
	noAltSrcs?: string[];
};

export type SeoIssue = {
	id: string;
	level: Level;
	title: string;
	why: string;
	fix: string;
	pages: string[];
};

export type Lighthouse = {
	source: 'psi' | 'demo';
	scores: { performance: number; accessibility: number; bestPractices: number; seo: number };
	audits: { id: string; category: 'Performance' | 'Accessibility' | 'Best practices' | 'SEO'; title: string; value?: string; level: Level }[];
};
export type W3C = {
	source: 'live' | 'demo';
	errors: number;
	warnings: number;
	messages: { type: 'error' | 'warning'; message: string; line?: number; extract?: string; count: number }[];
};

export type SeoAudit = {
	source: 'live' | 'demo';
	checkedAt: string;
	score: number;
	site: { https: boolean; robotsTxt: boolean; sitemap: boolean; sitemapUrls: number };
	speed: { source: 'psi' | 'demo'; performance: number; lcp: number; cls: number; tbt: number } | null;
	lighthouse: Lighthouse | null;
	w3c: W3C | null;
	pages: PageAudit[];
	issues: SeoIssue[];
	passed: string[];
};

const UA = { 'user-agent': 'Mozilla/5.0 (compatible; UndercutBot/0.2; +https://undercut.app)' };

async function timed(url: string, timeoutMs = 9000) {
	const ctrl = new AbortController();
	const t = setTimeout(() => ctrl.abort(), timeoutMs);
	const start = Date.now();
	try {
		const r = await fetch(url, { headers: UA, signal: ctrl.signal, redirect: 'follow' });
		const body = r.headers.get('content-type')?.includes('html') ? await r.text() : '';
		return { status: r.status, ms: Date.now() - start, body, finalUrl: r.url };
	} catch {
		return { status: 0, ms: Date.now() - start, body: '', finalUrl: url };
	} finally {
		clearTimeout(t);
	}
}

function auditPage(url: string, status: number, ms: number, html: string): PageAudit {
	const root = parse(html || '<html></html>');
	const meta = (name: string) => root.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ?? '';
	const imgs = root.querySelectorAll('img');
	const text = root.querySelector('body')?.textContent.replace(/\s+/g, ' ').trim() ?? '';
	return {
		url,
		path: new URL(url).pathname || '/',
		status,
		ms,
		title: root.querySelector('title')?.textContent.trim() ?? '',
		desc: meta('description').trim(),
		h1: root.querySelectorAll('h1').length,
		canonical: Boolean(root.querySelector('link[rel="canonical"]')),
		noindex: /noindex/i.test(meta('robots')),
		lang: Boolean(root.querySelector('html')?.getAttribute('lang')),
		viewport: Boolean(root.querySelector('meta[name="viewport"]')),
		ogImage: Boolean(root.querySelector('meta[property="og:image"]')),
		schema: Boolean(root.querySelector('script[type="application/ld+json"]')),
		images: imgs.length,
		imagesNoAlt: imgs.filter((i) => !i.getAttribute('alt')?.trim()).length,
		words: text ? text.split(' ').length : 0,
		h1Text: root.querySelector('h1')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 90),
		noAltSrcs: imgs.filter((i) => !i.getAttribute('alt')?.trim()).map((i) => i.getAttribute('src') ?? '').filter(Boolean).slice(0, 12)
	};
}

const CAT: Record<string, Lighthouse['audits'][number]['category']> = {
	performance: 'Performance',
	accessibility: 'Accessibility',
	'best-practices': 'Best practices',
	seo: 'SEO'
};

// Google Lighthouse through the PageSpeed Insights API: the same 4 scores as Chrome DevTools.
async function lighthouse(url: string): Promise<{ speed: SeoAudit['speed']; lighthouse: Lighthouse | null }> {
	const p = new URLSearchParams({ url, strategy: 'mobile' });
	for (const c of ['PERFORMANCE', 'ACCESSIBILITY', 'BEST_PRACTICES', 'SEO']) p.append('category', c);
	if (env.PAGESPEED_API_KEY) p.set('key', env.PAGESPEED_API_KEY);
	try {
		const r = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${p}`, { signal: AbortSignal.timeout(45_000) });
		if (!r.ok) return { speed: null, lighthouse: null };
		const j = await r.json();
		const lr = j.lighthouseResult ?? {};
		const a = lr.audits ?? {};
		const cats = lr.categories ?? {};
		const score = (k: string) => Math.round((cats[k]?.score ?? 0) * 100);
		const audits: Lighthouse['audits'] = [];
		for (const [catKey, cat] of Object.entries<any>(cats)) {
			for (const ref of cat.auditRefs ?? []) {
				const au = a[ref.id];
				if (!au || au.score === null || au.score >= 0.9 || ['manual', 'notApplicable', 'informative'].includes(au.scoreDisplayMode)) continue;
				if (ref.weight === 0 && catKey !== 'performance') continue;
				audits.push({ id: ref.id, category: CAT[catKey], title: au.title, value: au.displayValue, level: au.score < 0.5 ? 'bad' : 'warn' });
			}
		}
		const seen = new Set<string>();
		return {
			speed: {
				source: 'psi',
				performance: score('performance'),
				lcp: +((a['largest-contentful-paint']?.numericValue ?? 0) / 1000).toFixed(1),
				cls: +(a['cumulative-layout-shift']?.numericValue ?? 0).toFixed(2),
				tbt: Math.round(a['total-blocking-time']?.numericValue ?? 0)
			},
			lighthouse: {
				source: 'psi',
				scores: { performance: score('performance'), accessibility: score('accessibility'), bestPractices: score('best-practices'), seo: score('seo') },
				audits: audits.filter((x) => !seen.has(x.id) && seen.add(x.id)).slice(0, 14)
			}
		};
	} catch {
		return { speed: null, lighthouse: null };
	}
}

// W3C Nu HTML Checker — the official validator, on the homepage HTML.
async function w3c(html: string): Promise<W3C | null> {
	if (!html) return null;
	try {
		const r = await fetch('https://validator.w3.org/nu/?out=json', {
			method: 'POST',
			headers: { 'content-type': 'text/html; charset=utf-8', 'user-agent': UA['user-agent'] },
			body: html,
			signal: AbortSignal.timeout(20_000)
		});
		if (!r.ok) return null;
		const j = await r.json();
		const groups = new Map<string, W3C['messages'][number]>();
		let errors = 0,
			warnings = 0;
		for (const m of j.messages ?? []) {
			const type = m.type === 'error' ? 'error' : m.subType === 'warning' ? 'warning' : null;
			if (!type) continue;
			type === 'error' ? errors++ : warnings++;
			const key = type + m.message;
			const g = groups.get(key);
			if (g) g.count++;
			else groups.set(key, { type, message: m.message, line: m.lastLine, extract: m.extract?.slice(0, 120), count: 1 });
		}
		return { source: 'live', errors, warnings, messages: [...groups.values()].sort((a, b) => (a.type === b.type ? b.count - a.count : a.type === 'error' ? -1 : 1)).slice(0, 15) };
	} catch {
		return null;
	}
}

export function buildIssues(pages: PageAudit[], site: SeoAudit['site'], speed: SeoAudit['speed'], lh: Lighthouse | null = null, v: W3C | null = null) {
	const issues: SeoIssue[] = [];
	const passed: string[] = [];
	const check = (id: string, level: Level, okLabel: string, bad: PageAudit[], title: string, why: string, fix: string) => {
		if (bad.length) issues.push({ id, level, title: title.replace('{n}', String(bad.length)), why, fix, pages: bad.map((p) => p.path) });
		else passed.push(okLabel);
	};
	const ok = pages.filter((p) => p.status >= 200 && p.status < 400);

	check('broken', 'bad', 'All pages respond', pages.filter((p) => p.status === 0 || p.status >= 400), '{n} page(s) return an error', 'Visitors and Google land on an error page.', 'Fix the page or redirect it (301) to the closest working page.');
	check('noindex', 'bad', 'No page is hidden from Google', ok.filter((p) => p.noindex), '{n} page(s) hidden from Google', 'A "noindex" tag tells Google not to show these pages at all.', 'Remove the noindex tag unless the page should really stay private.');
	check('title-missing', 'bad', 'Every page has a title', ok.filter((p) => !p.title), '{n} page(s) without a title', 'The title is the blue link people click in Google.', 'Write a unique title of 30–60 characters with the main keyword first.');
	check('title-length', 'warn', 'Titles have a good length', ok.filter((p) => p.title && (p.title.length > 62 || p.title.length < 25)), '{n} title(s) too long or too short', 'Google cuts titles above ~60 characters; very short ones waste space.', 'Aim for 30–60 characters: keyword + benefit + brand.');
	check('desc', 'warn', 'Every page has a description', ok.filter((p) => !p.desc), '{n} page(s) without a description', 'Google then picks random text from the page as the snippet.', 'Write a 120–155 character description that makes people want to click.');
	check('h1', 'warn', 'One main heading per page', ok.filter((p) => p.h1 !== 1), '{n} page(s) with no or several main headings (H1)', 'The H1 tells Google what the page is about.', 'Keep exactly one H1 per page, containing the main keyword.');
	check('thin', 'warn', 'Pages have enough text', ok.filter((p) => p.words < 250), '{n} page(s) with very little text', 'Pages under ~250 words rarely rank.', 'Add useful content: FAQ, prices, process, local details.');
	check('alt', 'warn', 'Images are described', ok.filter((p) => p.imagesNoAlt > 0), 'Images without description on {n} page(s)', 'Google cannot "see" images without alt text, and it helps accessibility.', 'Add a short alt text describing each image.');
	check('canonical', 'warn', 'Canonical tags present', ok.filter((p) => !p.canonical), '{n} page(s) without canonical tag', 'Without it, Google may treat duplicate URLs as separate pages.', 'Add <link rel="canonical"> pointing to the preferred URL.');
	check('viewport', 'bad', 'Mobile-ready', ok.filter((p) => !p.viewport), '{n} page(s) not set up for mobile', 'Most visits are on mobile; Google ranks the mobile version.', 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.');
	check('lang', 'warn', 'Language declared', ok.filter((p) => !p.lang), '{n} page(s) without a language', 'Helps Google show the right language version (FR / NL / EN).', 'Add lang="fr" (or nl, en) on the <html> tag.');
	check('og', 'warn', 'Share image set', ok.filter((p) => !p.ogImage).slice(0, 1).length ? ok.filter((p) => !p.ogImage) : [], 'No share image on {n} page(s)', 'Links shared on WhatsApp, LinkedIn or Facebook show without picture.', 'Add an og:image (1200×630) to each page.');
	check('slow', 'warn', 'Server answers fast', ok.filter((p) => p.ms > 1800), '{n} slow page(s)', 'Pages taking more than ~2 s lose visitors before they load.', 'Enable caching / a CDN and compress images.');
	const home = ok[0];
	if (home && !home.schema)
		issues.push({ id: 'schema', level: 'warn', title: 'No structured data on the homepage', why: 'Structured data (LocalBusiness) can add opening hours, stars and address in Google.', fix: 'Add LocalBusiness JSON-LD with name, address, phone and hours.', pages: [home.path] });
	else if (home) passed.push('Structured data present');

	if (!site.https) issues.push({ id: 'https', level: 'bad', title: 'Site not on HTTPS', why: 'Browsers show "Not secure" and Google ranks it lower.', fix: 'Install an SSL certificate and redirect http → https.', pages: [] });
	else passed.push('Secure (HTTPS)');
	if (!site.robotsTxt) issues.push({ id: 'robots', level: 'warn', title: 'No robots.txt', why: 'Crawlers look for it first to find the sitemap.', fix: 'Add /robots.txt with a "Sitemap:" line.', pages: [] });
	else passed.push('robots.txt found');
	if (!site.sitemap) issues.push({ id: 'sitemap', level: 'bad', title: 'No sitemap.xml', why: 'Google finds new pages slowly without it.', fix: 'Generate a sitemap.xml and submit it in Search Console.', pages: [] });
	else passed.push(`Sitemap with ${site.sitemapUrls} pages`);

	if (speed) {
		if (speed.performance < 50)
			issues.push({ id: 'speed', level: 'bad', title: `Slow on mobile (speed score ${speed.performance}/100)`, why: `The main content takes ${speed.lcp}s to appear. Google recommends under 2.5 s.`, fix: 'Compress and resize images, lazy-load below the fold, remove unused scripts.', pages: ['/'] });
		else if (speed.performance < 90)
			issues.push({ id: 'speed', level: 'warn', title: `Mobile speed can improve (${speed.performance}/100)`, why: `Main content appears after ${speed.lcp}s.`, fix: 'Serve images in WebP/AVIF and defer non-critical scripts.', pages: ['/'] });
		else passed.push(`Fast on mobile (${speed.performance}/100)`);
	}
	if (lh) {
		if (lh.scores.accessibility < 90)
			issues.push({ id: 'a11y', level: lh.scores.accessibility < 70 ? 'bad' : 'warn', title: `Accessibility ${lh.scores.accessibility}/100`, why: 'Some visitors (screen readers, low vision, keyboard) cannot use parts of the site — and it is a legal requirement in the EU from 2025 (European Accessibility Act).', fix: 'See the Lighthouse list below: contrast, labels on buttons and fields, alt texts.', pages: ['/'] });
		else passed.push(`Accessible (${lh.scores.accessibility}/100)`);
		if (lh.scores.bestPractices < 90)
			issues.push({ id: 'bp', level: 'warn', title: `Best practices ${lh.scores.bestPractices}/100`, why: 'Errors in the browser console, old libraries or insecure requests.', fix: 'See the Lighthouse list below.', pages: ['/'] });
	}
	if (v) {
		if (v.errors > 0)
			issues.push({ id: 'w3c', level: v.errors > 20 ? 'warn' : 'warn', title: `${v.errors} HTML error${v.errors > 1 ? 's' : ''} (W3C)`, why: 'Invalid HTML can break the layout in some browsers and confuse Google and screen readers.', fix: 'See the W3C list below — most come from a theme or plugin and are fixed once for all pages.', pages: ['/'] });
		else passed.push('Valid HTML (W3C)');
	}
	const order = { bad: 0, warn: 1, good: 2 };
	issues.sort((a, b) => order[a.level] - order[b.level]);
	const score = Math.max(0, Math.min(100, 100 - issues.filter((i) => i.level === 'bad').length * 12 - issues.filter((i) => i.level === 'warn').length * 4));
	return { issues, passed, score };
}

function demoAudit(client: Client): SeoAudit {
	const origin = normaliseSite(client.domain);
	const paths = ['/', '/services', '/contact', '/about', '/blog/guide-2026', '/pricing', '/faq', '/team', '/old-promo'];
	let seed = 0;
	for (const ch of client.id) seed = (seed * 31 + ch.charCodeAt(0)) % 997;
	const messy = seed % 3 === 0; // some example clients are in worse shape than others
	const pages: PageAudit[] = paths.map((path, i) => ({
		url: origin + path,
		path,
		status: path === '/old-promo' && messy ? 404 : 200,
		ms: 300 + ((i * 137 + seed * 53) % 1900),
		title: i === 5 && messy ? '' : i === 4 ? `${client.name} — the complete guide to everything you need to know in 2026` : `${client.name} · ${path === '/' ? 'Accueil' : path.slice(1)}`,
		desc: i % 3 === 2 && (messy || i === 2) ? '' : 'Description de la page.',
		h1: messy && i === 3 ? 0 : i === 6 ? 2 : 1,
		canonical: !messy || i % 4 !== 1,
		noindex: false,
		lang: true,
		viewport: true,
		ogImage: i === 0,
		schema: seed % 2 === 0,
		images: 6,
		imagesNoAlt: messy && i % 2 ? 2 : 0,
		noAltSrcs: messy && i % 2 ? [`/images/${path.slice(1) || 'home'}-team-photo.jpg`, `/images/${path.slice(1) || 'home'}-shop-front.webp`] : [],
		h1Text: path === '/' ? `${client.name}, right in Brussels` : path.slice(1).replace(/[-/]/g, ' '),
		words: i === 2 ? 140 : 480 + i * 60
	}));
	const site = { https: true, robotsTxt: true, sitemap: true, sitemapUrls: 12 + ((seed * 7) % 40) };
	const speed = { source: 'demo' as const, performance: messy ? 42 : 72 + (seed % 20), lcp: +(1.8 + (seed % 5) * 0.6).toFixed(1), cls: 0.04, tbt: 180 + (seed % 40) * 20 };
	const lh: Lighthouse = {
		source: 'demo',
		scores: { performance: speed.performance, accessibility: messy ? 74 : 92, bestPractices: messy ? 78 : 96, seo: messy ? 83 : 92 },
		audits: [
			{ id: 'uses-optimized-images', category: 'Performance', title: 'Efficiently encode images', value: 'Potential savings of 412 KiB', level: 'bad' },
			{ id: 'render-blocking-resources', category: 'Performance', title: 'Eliminate render-blocking resources', value: 'Potential savings of 820 ms', level: 'warn' },
			{ id: 'color-contrast', category: 'Accessibility', title: 'Background and foreground colors do not have a sufficient contrast ratio', level: 'warn' },
			{ id: 'button-name', category: 'Accessibility', title: 'Buttons do not have an accessible name', level: messy ? 'bad' : 'warn' },
			{ id: 'errors-in-console', category: 'Best practices', title: 'Browser errors were logged to the console', level: 'warn' },
			{ id: 'meta-description', category: 'SEO', title: 'Document does not have a meta description', level: 'warn' }
		].slice(0, messy ? 6 : 3) as Lighthouse['audits']
	};
	const v: W3C = {
		source: 'demo',
		errors: messy ? 23 : 4,
		warnings: 7,
		messages: [
			{ type: 'error', message: 'Duplicate ID “menu”.', line: 48, extract: '<nav id="menu" class="mobile">', count: messy ? 2 : 1 },
			{ type: 'error', message: 'Stray end tag “div”.', line: 212, extract: '</section></div></div>', count: messy ? 9 : 2 },
			{ type: 'error', message: 'An “img” element must have an “alt” attribute, except under certain conditions.', line: 131, extract: '<img src="/img/hero.jpg">', count: messy ? 12 : 1 },
			{ type: 'warning', message: 'The “type” attribute is unnecessary for JavaScript resources.', line: 20, extract: '<script type="text/javascript" src=…', count: 5 },
			{ type: 'warning', message: 'Section lacks heading. Consider using “h2”-“h6” elements.', line: 160, count: 2 }
		]
	};
	return { source: 'demo', checkedAt: new Date().toISOString(), site, speed, lighthouse: lh, w3c: v, pages, ...buildIssues(pages, site, speed, lh, v) };
}

const cache = new Map<string, SeoAudit>();

export async function getSeoAudit(client: Client, force = false): Promise<SeoAudit> {
	if (client.demo) return demoAudit(client);
	const hit = cache.get(client.id);
	if (!force && hit && Date.now() - Date.parse(hit.checkedAt) < 24 * 3600_000) return hit;

	const origin = normaliseSite(client.domain);
	const [sm, robots, lhRes, home] = await Promise.all([
		sitemapFor(client).catch(() => null),
		timed(`${origin}/robots.txt`, 6000),
		lighthouse(origin),
		timed(origin + '/')
	]);
	const speed = lhRes.speed;
	const v = await w3c(home.body);
	const urls = [origin + '/'];
	try {
		// Re-read the sitemap URLs (sitemapFor only keeps a sample) — homepage first, then up to 9 others
		for (const c of sm?.checked ?? []) if (new URL(c.url).host === new URL(origin).host && !urls.includes(c.url)) urls.push(c.url);
	} catch {
		/* ignore */
	}
	const list = urls.slice(0, 10);
	const pages: PageAudit[] = [];
	for (let i = 0; i < list.length; i += 4) {
		const batch = await Promise.all(list.slice(i, i + 4).map((u) => timed(u)));
		batch.forEach((r, k) => pages.push(auditPage(list[i + k], r.status, r.ms, r.body)));
	}
	const site = {
		https: origin.startsWith('https://'),
		robotsTxt: robots.status === 200,
		sitemap: Boolean(sm?.found),
		sitemapUrls: sm?.urlCount ?? 0
	};
	const audit: SeoAudit = { source: 'live', checkedAt: new Date().toISOString(), site, speed, lighthouse: lhRes.lighthouse, w3c: v, pages, ...buildIssues(pages, site, speed, lhRes.lighthouse, v) };
	cache.set(client.id, audit);
	return audit;
}

// Top SEO issues become tasks on the client summary
export function seoTasks(a: SeoAudit, fixed: Set<string> = new Set()): Draft[] {
	return a.issues.filter((i) => !fixed.has(i.id)).slice(0, 3).map((i) => ({
		level: i.level,
		area: 'SEO' as const,
		title: i.title,
		meaning: i.why + (i.pages.length ? ` (${i.pages.slice(0, 3).join(', ')}${i.pages.length > 3 ? '…' : ''})` : ''),
		action: i.fix
	}));
}
