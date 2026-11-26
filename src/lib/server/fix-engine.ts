// One place that answers "fix this" for any problem in Undercut.
//  - Auto-fixable (titles, descriptions, image texts, canonicals, business info): published live via the snippet.
//  - Not auto-fixable (speed, console errors, HTML errors, contrast…): a clear step-by-step fix + code for the developer,
//    written by Claude when ANTHROPIC_API_KEY is set, otherwise from a built-in playbook.
//  - Keywords: turn a keyword into a ready-to-publish title + description for the best page.
import * as env from '$app/env/private';
import type { Client } from '#lib/types.ts';
import { getSeoAudit } from './seo-audit.ts';
import { generateFixes, listFixes, publishIssue, upsertFix } from './fixes.ts';
import { gscPagesFor } from './google.ts';
import { track } from './usage.ts';

import { AUTO_FIX_ISSUES, canAutoFix } from '#lib/fixable.ts';
export { AUTO_FIX_ISSUES, canAutoFix };

/** Publish every suggested fix of one issue. Generates the suggestions first if needed. */
export async function fixIssue(client: Client, issueId: string) {
	if (!listFixes(client.id).some((f) => f.issue === issueId)) await generateFixes(client, await getSeoAudit(client));
	const n = publishIssue(client.id, issueId);
	track('fixes', n);
	return n;
}

/** Fix every auto-fixable SEO issue at once. */
export async function fixAll(client: Client) {
	const audit = await getSeoAudit(client);
	await generateFixes(client, audit);
	let n = 0;
	for (const id of AUTO_FIX_ISSUES) n += publishIssue(client.id, id);
	track('fixes', n);
	return n;
}

// ---------- keyword → fix ----------
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const clip = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');

/** Read a page's current title, description and main heading (what Google sees today). */
async function readPage(url: string) {
	try {
		const r = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'Mozilla/5.0 (UndercutBot)' } });
		const html = (await r.text()).slice(0, 400_000);
		const pick = (re: RegExp) => html.match(re)?.[1]?.replace(/\s+/g, ' ').trim() ?? '';
		const dec = (t: string) => t.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
		return {
			title: dec(pick(/<title[^>]*>([^<]*)<\/title>/i)),
			desc: dec(pick(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) || pick(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i)),
			h1: dec(pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, '')),
			lang: pick(/<html[^>]+lang=["']([a-z]{2})/i) || 'fr'
		};
	} catch {
		return { title: '', desc: '', h1: '', lang: 'fr' };
	}
}

async function aiTitleDesc(keyword: string, client: Client, page: { title: string; desc: string; h1: string; lang: string }) {
	if (!env.ANTHROPIC_API_KEY) return null;
	try {
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
			body: JSON.stringify({
				model: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
				max_tokens: 300,
				messages: [{ role: 'user', content: `Rewrite the Google title (max 60 characters) and meta description (max 155 characters) of this page so it ranks for the search "${keyword}". Language: ${page.lang}. Keep the facts of the current page, no invented claims or prices. Put the keyword near the start of the title, end the title with the brand "${client.name}". Answer as JSON {"title":"…","description":"…"} only.\n\nCurrent title: ${page.title}\nCurrent description: ${page.desc}\nMain heading: ${page.h1}` }]
			})
		});
		if (!res.ok) return null;
		const t = (await res.json()).content?.[0]?.text ?? '';
		const j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
		return j.title && j.description ? { title: clip(String(j.title), 60), description: clip(String(j.description), 155) } : null;
	} catch {
		return null;
	}
}

/**
 * Keyword → publishable title + description on the page that already appears in Google for it
 * (Search Console), written from the page's real content.
 */
export async function keywordToFix(client: Client, keyword: string) {
	const origin = new URL(client.domain).origin;
	const pages = await gscPagesFor(client, keyword).catch(() => []);
	let path = '/';
	let why = 'No page appears in Google for this search yet — the homepage is used.';
	const best = pages.find((p) => p.page.startsWith(origin) || new URL(p.page).host.replace(/^www\./, '') === new URL(origin).host.replace(/^www\./, ''));
	if (best) {
		path = new URL(best.page).pathname || '/';
		why = `Google already shows ${path} for this search (${best.impressions} times, position ${best.position}).`;
	}
	const page = await readPage(origin + path);
	const brand = client.name;
	const ai = await aiTitleDesc(keyword, client, page);
	const kw = cap(keyword);
	const title = ai?.title ?? clip(page.title.toLowerCase().includes(keyword.toLowerCase()) ? page.title : `${kw} | ${brand}`, 60);
	const baseDesc = page.desc || page.h1;
	const description = ai?.description ?? clip(baseDesc.toLowerCase().includes(keyword.toLowerCase()) ? baseDesc : baseDesc ? `${kw} — ${baseDesc}` : `${kw} — ${brand}.`, 155);
	upsertFix(client.id, { id: `title:${path}`, kind: 'title', path, value: title, by: ai ? 'ai' : 'rules', issue: `keyword:${keyword}`, current: page.title });
	upsertFix(client.id, { id: `description:${path}`, kind: 'description', path, value: description, by: ai ? 'ai' : 'rules', issue: `keyword:${keyword}`, current: page.desc });
	return { path, title, description, before: { title: page.title, description: page.desc }, why };
}

// ---------- how to fix (not automatable) ----------
export type HowTo = { title: string; steps: string[]; code?: string; ai: boolean };

const PLAYBOOK: { match: RegExp; steps: string[]; code?: string }[] = [
	{ match: /tag manager|google tag|ga4 tag|measurement id/i, steps: ['Open tagmanager.google.com → the client’s container → Tags → New.', 'Tag type “Google Tag”, paste the GA4 Measurement ID (G-XXXX, found in GA4 → Admin → Data streams).', 'Trigger: All Pages → Save → Submit / Publish.', 'Check in GA4 → Reports → Realtime that your own visit appears.'] },
	{ match: /contacts|sales|conversion/i, steps: ['Test the contact form and the phone link yourself on mobile.', 'Make sure the form submission is a key event in GA4 (Admin → Events → mark as key event).', 'Put the main button (call / book / quote) in the first screen of every page.', 'Answer every contact within 24 h — speed converts.'] },
	{ match: /visits down|traffic/i, steps: ['Compare Google Search clicks for the same period (Search & Maps tab).', 'If Search fell: check SEO issues and the pages that lost clicks.', 'If not: check social posts, newsletters and ads that stopped.', 'Publish one new page or post targeting a keyword from Keywords.'] },
	{ match: /speed|slow|performance|render-blocking|encode images|lcp/i, steps: ['Convert big images to WebP/AVIF and resize them to the size they are shown.', 'Add loading="lazy" to images below the first screen.', 'Defer scripts that are not needed immediately (chat widgets, sliders).', 'Turn on caching / a CDN (Cloudflare free plan works).'], code: '<img src="photo.webp" width="800" height="533" loading="lazy" alt="…">\n<script src="widget.js" defer></script>' },
	{ match: /console|javascript|typeerror|uncaught/i, steps: ['Open the site in Chrome → right-click → Inspect → Console.', 'Find the file named in the error (often a theme or plugin script).', 'Update or disable the plugin that loads it, or fix the code so it checks the element exists.', 'Reload and check the console is clean.'], code: "const menu = document.querySelector('#menu');\nif (menu) menu.addEventListener('click', toggle);" },
	{ match: /w3c|html error|stray|duplicate id/i, steps: ['Most HTML errors come from the theme template — fix it once, it fixes every page.', 'Duplicate IDs: give each element a unique id.', 'Stray end tags: remove the extra </div> in the template.', 'Re-run the check in Undercut.'] },
	{ match: /contrast/i, steps: ['Make text darker or the background lighter.', 'Aim for a contrast ratio of at least 4.5:1 for normal text.', 'Check with the Chrome DevTools colour picker.'], code: '.button { background: #111; color: #fff; }' },
	{ match: /accessible name|button|label/i, steps: ['Give every icon button a text label.', 'Every form field needs a <label> or aria-label.'], code: '<button aria-label="Open menu">☰</button>\n<label for="email">Email</label><input id="email" type="email">' },
	{ match: /accessibility/i, steps: ['Fix colour contrast of text and buttons.', 'Add labels to buttons and form fields.', 'Add alt texts to images (Undercut can do this one for you).'] },
	{ match: /h1|heading/i, steps: ['Keep exactly one H1 per page, with the main keyword.', 'Use H2/H3 for sections below it.'], code: '<h1>Boulangerie artisanale à Ixelles</h1>' },
	{ match: /little text|thin/i, steps: ['Add 300+ useful words: what you offer, prices, process, area served.', 'Add an FAQ with the questions from Keywords.'] },
	{ match: /error|404|broken/i, steps: ['Find the page that moved or was deleted.', 'Add a 301 redirect to the closest working page.', 'Remove the old URL from the sitemap.'], code: '# .htaccess\nRedirect 301 /old-promo /services' },
	{ match: /https/i, steps: ['Install a free SSL certificate (Let’s Encrypt, usually one click at the host).', 'Redirect all http:// traffic to https://.'] },
	{ match: /robots/i, steps: ['Create /robots.txt at the root of the site.', 'Add a line pointing to the sitemap.'], code: 'User-agent: *\nAllow: /\nSitemap: https://example.be/sitemap.xml' },
	{ match: /sitemap/i, steps: ['Most CMS generate it (WordPress: Yoast / Rank Math).', 'Submit it in Search Console → Sitemaps.'] },
	{ match: /share image|og:image/i, steps: ['Create a 1200×630 image per page (or one for the whole site).', 'Add the og:image tag in the page head.'], code: '<meta property="og:image" content="https://example.be/og.jpg">' },
	{ match: /rage|not a link|clickable/i, steps: ['Turn the clicked element into a real link to the page people expect.', 'Or change its look so it no longer looks clickable.'] },
	{ match: /quick win|page 2|keyword|position/i, steps: ['Add a section that answers this search on the most relevant page, with the words in an H2.', 'Put the keyword at the start of the page title (Undercut can publish the title for you from Keywords).', 'Link to that page from 2–3 other pages.'] },
	{ match: /crash/i, steps: ['Open Firebase Crashlytics and sort by users affected.', 'Fix the top crash and ship a hotfix release.', 'Reply to the related store reviews once fixed.'] },
	{ match: /review/i, steps: ['Reply to every negative review within 48 h, thank and explain the fix.', 'Mention the fix in the next release notes.'] },
	{ match: /scroll|mid-page|fold/i, steps: ['Move the main button and contact info into the first screen.', 'Shorten the hero, put proof (reviews, photos) higher.'] }
];

export async function howToFix(client: Client, problem: string, detail = ''): Promise<HowTo> {
	track('ai');
	if (env.ANTHROPIC_API_KEY) {
		try {
			const res = await fetch('https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
				body: JSON.stringify({
					model: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
					max_tokens: 700,
					messages: [
						{
							role: 'user',
							content: `A web agency must fix this problem on the website of their client "${client.name}" (${client.domain}). Give 3-5 short, concrete steps a junior developer can follow, and one code example if useful. Reply as JSON only: {"steps": ["..."], "code": "..."}.\nProblem: ${problem}\nDetails: ${detail}`
						}
					]
				}),
				signal: AbortSignal.timeout(30_000)
			});
			if (res.ok) {
				const j = await res.json();
				const t: string = j.content?.[0]?.text ?? '';
				const parsed = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
				if (Array.isArray(parsed.steps)) return { title: problem, steps: parsed.steps, code: parsed.code || undefined, ai: true };
			}
		} catch {
			/* fall back */
		}
	}
	const p = PLAYBOOK.find((x) => x.match.test(problem + ' ' + detail));
	return { title: problem, steps: p?.steps ?? ['Open the page in Chrome DevTools to see the exact element.', 'Fix it in the CMS or theme.', 'Run “Check again” in Undercut.'], code: p?.code, ai: false };
}
