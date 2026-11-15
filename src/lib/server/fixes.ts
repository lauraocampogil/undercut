// Auto-fix: Undercut does not only report SEO problems, it proposes the fix and can
// publish it on the client's site through the same snippet as the heatmaps.
//   suggested → (agency edits / approves) → live → (undo) → suggested
// Live fixes are served at /api/fixes and applied in the browser by /u.js.
// For a permanent fix the agency can also copy the code for the CMS / developer.
import { readData, writeData } from './store.ts';
import * as env from '$app/env/private';
import type { Client } from '#lib/types.ts';
import type { SeoAudit, PageAudit } from './seo-audit.ts';

export type FixKind = 'title' | 'description' | 'alt' | 'canonical' | 'schema';
export type Fix = {
	id: string;
	kind: FixKind;
	path: string;
	target?: string; // image src for alt texts
	preview?: string; // absolute image URL, shown next to the suggestion
	context?: string; // nearby text on the page (caption, heading, link label)
	current?: string;
	value: string;
	status: 'suggested' | 'live' | 'dismissed';
	by: 'ai' | 'rules';
	issue: string; // audit issue id it solves
	updatedAt: string;
	createdAt?: string; // equal to updatedAt while nobody touched the suggestion
};

const file = (clientId: string) => `fixes/${clientId.replace(/[^a-z0-9-]/gi, '')}.json`;

export function listFixes(clientId: string): Fix[] {
	const all = readData<Fix[]>(file(clientId), []).map((f) =>
		// older audits kept spaces/new lines around image addresses ("   https://…"): the snippet could never match them
		f.kind === 'alt' && f.target && f.target !== f.target.trim() ? { ...f, target: f.target.trim(), id: `alt:${f.path}:${f.target.trim()}` } : f
	);
	// older files could hold duplicates; keep the live one when there is one, in the original order
	const best = new Map<string, Fix>();
	for (const f of all) if (!best.has(f.id) || (f.status === 'live' && best.get(f.id)!.status !== 'live')) best.set(f.id, f);
	const seen = new Set<string>();
	return all.filter((f) => !seen.has(f.id) && seen.add(f.id)).map((f) => best.get(f.id)!);
}

function saveFixes(clientId: string, fixes: Fix[]) {
	writeData(file(clientId), fixes);
}

export function updateFix(clientId: string, id: string, patch: Partial<Pick<Fix, 'value' | 'status'>>) {
	const all = listFixes(clientId);
	const f = all.find((x) => x.id === id);
	if (!f) return;
	if (patch.value !== undefined) f.value = patch.value.slice(0, 5000);
	if (patch.status) f.status = patch.status;
	f.updatedAt = new Date().toISOString();
	saveFixes(clientId, all);
}

export function setAll(clientId: string, from: Fix['status'], to: Fix['status']) {
	const all = listFixes(clientId);
	for (const f of all) if (f.status === from) {
		f.status = to;
		f.updatedAt = new Date().toISOString();
	}
	saveFixes(clientId, all);
}

// ---------- generating suggestions ----------

const human = (s: string) =>
	s
		.replace(/^\/+|\/+$/g, '')
		.split('/')
		.pop()!
		.replace(/\.[a-z0-9]+$/i, '')
		.replace(/[-_]+/g, ' ')
		.replace(/\b\d{2,}\b/g, '')
		.trim();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const clip = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');

function topic(p: PageAudit) {
	return cap(p.h1Text?.trim() || human(p.path) || 'Home');
}

function rulesTitle(client: Client, p: PageAudit) {
	let t = p.path === '/' ? `${client.name} — ${p.h1Text ? clip(p.h1Text, 38) : 'Brussels'}` : `${topic(p)} | ${client.name}`;
	if (t.length < 30) t += ' · Bruxelles';
	return clip(t, 60);
}

function rulesDescription(client: Client, p: PageAudit) {
	const what = p.path === '/' ? `Discover ${client.name}` : `${topic(p)} at ${client.name}`;
	return clip(`${what} in Brussels. Clear information, prices and quick contact — get in touch today.`, 155);
}

// File names like "45a786d9-307c-…" or "IMG_2034" say nothing — then use the text around the image.
const meaningless = (w: string) => !w || /^[0-9a-f\s]{8,}$/i.test(w) || /\b[0-9a-f]{8}\b/i.test(w) || /^(img|dsc|image|photo|screenshot|pxl)?\s*\d+$/i.test(w) || w.length < 4;
function altFrom(src: string, p: PageAudit, client: Client, context = '') {
	const words = human(src.split('?')[0]);
	const base = !meaningless(words) ? words : context || topic(p);
	return clip(cap(`${base} — ${client.name}`), 110);
}

/** Describe images with Claude (vision) when ANTHROPIC_API_KEY is set. Returns { imageUrl: alt }. */
async function aiAlts(client: Client, imgs: { abs: string; context: string; page: string }[]): Promise<Record<string, string>> {
	if (!env.ANTHROPIC_API_KEY || !imgs.length) return {};
	const list = imgs.filter((i) => /^https:\/\//.test(i.abs)).slice(0, 12);
	if (!list.length) return {};
	try {
		const content: object[] = [];
		list.forEach((i, n) => {
			content.push({ type: 'text', text: `Image ${n + 1} (page ${i.page}${i.context ? `, near the text "${i.context}"` : ''}):` });
			content.push({ type: 'image', source: { type: 'url', url: i.abs } });
		});
		content.push({ type: 'text', text: `Write an alt text for each image of the website of ${client.name} (${client.domain}): what the image shows, max 110 characters, in the language of the site (French if unsure), no "image of". Reply with JSON only: {"1": "...", "2": "..."}` });
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
			body: JSON.stringify({ model: env.ANTHROPIC_MODEL || 'claude-sonnet-4-5', max_tokens: 1200, messages: [{ role: 'user', content }] }),
			signal: AbortSignal.timeout(45_000)
		});
		if (!res.ok) return {};
		const j = await res.json();
		const text: string = j.content?.[0]?.text ?? '';
		const out = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as Record<string, string>;
		return Object.fromEntries(list.map((i, n) => [i.abs, out[String(n + 1)]]).filter(([, v]) => v));
	} catch {
		return {};
	}
}

function schemaFor(client: Client) {
	const origin = client.domain.replace(/\/$/, '');
	return JSON.stringify(
		{
			'@context': 'https://schema.org',
			'@type': 'LocalBusiness',
			name: client.name,
			url: origin + '/',
			telephone: '',
			address: { '@type': 'PostalAddress', streetAddress: '', postalCode: '', addressLocality: 'Bruxelles', addressCountry: 'BE' },
			openingHours: []
		},
		null,
		2
	);
}

async function aiCopy(client: Client, pages: PageAudit[]): Promise<Record<string, { title?: string; description?: string }>> {
	if (!env.ANTHROPIC_API_KEY || !pages.length) return {};
	try {
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
			body: JSON.stringify({
				model: env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
				max_tokens: 1500,
				messages: [
					{
						role: 'user',
						content: `You are an SEO copywriter for a small business in Belgium. For each page, write a Google title (max 60 characters, main keyword first, brand last) and a meta description (120-155 characters, a clear benefit + call to action). Use the language of the page content (French if unsure). Reply with JSON only: {"<path>": {"title": "...", "description": "..."}}.\n\nBusiness: ${client.name} (${client.domain})\nPages:\n${pages.map((p) => `- ${p.path} | H1: ${p.h1Text ?? ''} | current title: ${p.title ?? ''}`).join('\n')}`
					}
				]
			}),
			signal: AbortSignal.timeout(30_000)
		});
		if (!res.ok) return {};
		const j = await res.json();
		const text: string = j.content?.[0]?.text ?? '';
		return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
	} catch {
		return {};
	}
}

export async function generateFixes(client: Client, audit: SeoAudit): Promise<Fix[]> {
	const existing = new Map(listFixes(client.id).map((f) => [f.id, f]));
	const ok = audit.pages.filter((p) => p.status >= 200 && p.status < 400);
	const needCopy = ok.filter((p) => !p.title || p.title.length > 62 || p.title.length < 25 || !p.desc);
	const imgs = ok.flatMap((p) => (p.noAltImgs ?? []).map((i) => ({ ...i, page: p.path })));
	const [ai, alts] = await Promise.all([aiCopy(client, needCopy), aiAlts(client, imgs)]);
	const now = new Date().toISOString();
	const out: Fix[] = [];
	const add = (f: Omit<Fix, 'status' | 'updatedAt'>) => {
		if (out.some((o) => o.id === f.id)) return; // same image twice on a page, etc.
		const prev = existing.get(f.id);
		// keep what the agency edited, published or dismissed; refresh untouched suggestions (better text, image preview)
		const keepPrev = prev && (prev.status !== 'suggested' || (prev.createdAt && prev.updatedAt !== prev.createdAt));
		out.push(keepPrev ? { ...f, value: prev!.value, status: prev!.status, updatedAt: prev!.updatedAt, createdAt: prev!.createdAt } : { ...f, status: 'suggested', updatedAt: now, createdAt: now });
	};

	for (const p of ok) {
		const a = ai[p.path] ?? {};
		if (!p.title || p.title.length > 62 || p.title.length < 25)
			add({ id: `title:${p.path}`, kind: 'title', path: p.path, current: p.title, value: a.title ? clip(a.title, 60) : rulesTitle(client, p), by: a.title ? 'ai' : 'rules', issue: p.title ? 'title-length' : 'title-missing' });
		if (!p.desc)
			add({ id: `description:${p.path}`, kind: 'description', path: p.path, current: '', value: a.description ? clip(a.description, 158) : rulesDescription(client, p), by: a.description ? 'ai' : 'rules', issue: 'desc' });
		if (!p.canonical)
			add({ id: `canonical:${p.path}`, kind: 'canonical', path: p.path, value: client.domain.replace(/\/$/, '') + p.path, by: 'rules', issue: 'canonical' });
		const imgList = p.noAltImgs ?? (p.noAltSrcs ?? []).map((src) => ({ src, abs: src, context: '' }));
		for (const im of imgList)
			add({ id: `alt:${p.path}:${im.src}`, kind: 'alt', path: p.path, target: im.src, preview: im.abs, context: im.context, value: alts[im.abs] ? clip(alts[im.abs], 110) : altFrom(im.src, p, client, im.context), by: alts[im.abs] ? 'ai' : 'rules', issue: 'alt' });
	}
	if (ok[0] && !ok[0].schema) add({ id: 'schema:/', kind: 'schema', path: '/', value: schemaFor(client), by: 'rules', issue: 'schema' });

	// keep live fixes whose page is no longer in the audit sample
	for (const f of existing.values()) if (f.status === 'live' && !out.some((o) => o.id === f.id)) out.push(f);
	saveFixes(client.id, out);
	return out;
}

// drop fields the agency left empty, so Google never sees "telephone": ""
function cleanJson(text: string) {
	try {
		const strip = (v: unknown): unknown => {
			if (Array.isArray(v)) return v.map(strip).filter((x) => x !== undefined && x !== '');
			if (v && typeof v === 'object') {
				const o = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, strip(x)]).filter(([, x]) => x !== '' && x !== undefined && !(Array.isArray(x) && !x.length)));
				return Object.keys(o).length ? o : undefined;
			}
			return v;
		};
		return JSON.stringify(strip(JSON.parse(text)));
	} catch {
		return text;
	}
}

/** What the snippet applies on a given page. */
export function livePayload(clientId: string, path: string) {
	const live = listFixes(clientId).filter((f) => f.status === 'live' && (f.path === path || (f.kind === 'schema' && f.path === path)));
	const one = (k: FixKind) => live.find((f) => f.kind === k)?.value;
	return {
		title: one('title'),
		description: one('description'),
		canonical: one('canonical'),
		schema: live.filter((f) => f.kind === 'schema').map((f) => cleanJson(f.value)),
		alts: Object.fromEntries(live.filter((f) => f.kind === 'alt' && f.target).map((f) => [f.target!, f.value]))
	};
}

/** Code a developer can paste in the CMS for a permanent fix. */
export function codeFor(f: Fix) {
	const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
	switch (f.kind) {
		case 'title':
			return `<title>${esc(f.value)}</title>`;
		case 'description':
			return `<meta name="description" content="${esc(f.value)}">`;
		case 'canonical':
			return `<link rel="canonical" href="${esc(f.value)}">`;
		case 'alt':
			return `<img src="${esc(f.target ?? '')}" alt="${esc(f.value)}">`;
		case 'schema':
			return `<script type="application/ld+json">\n${f.value}\n</script>`;
	}
}

/** Issues fully handled by live fixes — shown as "Fixed by Undercut" instead of a task. */
export function fixedIssues(clientId: string): Set<string> {
	const all = listFixes(clientId).filter((f) => f.status !== 'dismissed');
	const byIssue = new Map<string, Fix[]>();
	for (const f of all) byIssue.set(f.issue, [...(byIssue.get(f.issue) ?? []), f]);
	return new Set([...byIssue].filter(([, list]) => list.length && list.every((f) => f.status === 'live')).map(([k]) => k));
}

export function upsertFix(clientId: string, f: Omit<Fix, 'updatedAt' | 'status'> & { status?: Fix['status'] }) {
	const all = listFixes(clientId).filter((x) => x.id !== f.id);
	all.push({ ...f, status: f.status ?? 'suggested', updatedAt: new Date().toISOString() });
	saveFixes(clientId, all);
}

export function publishIssue(clientId: string, issue: string) {
	const all = listFixes(clientId);
	let n = 0;
	for (const f of all)
		if (f.issue === issue && f.status !== 'live') {
			f.status = 'live';
			f.updatedAt = new Date().toISOString();
			n++;
		}
	saveFixes(clientId, all);
	return n;
}
