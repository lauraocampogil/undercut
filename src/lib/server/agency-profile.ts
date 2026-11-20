// Understands an agency from its own URL: what it sells, where, in which language.
// Static HTML read (title, headings, meta, schema.org, footer) + keyword dictionaries in FR / NL / EN.
// Optional: Claude refines the result when ANTHROPIC_API_KEY is set.
import * as env from '$app/env/private';

export type Service = 'web' | 'app' | 'social' | 'seo' | 'branding' | 'ads';
export type AgencyProfile = {
	url: string;
	name: string;
	services: Service[];
	city: string;
	country: string;
	lang: 'fr' | 'nl' | 'en';
	summary: string;
	source: 'site' | 'manual' | 'ai';
	needs?: string; // what could not be detected
	color?: string; // brand colour found on the site (#rrggbb)
	platform?: string; // when built from a social profile: Instagram, TikTok, LinkedIn…
};

export const SERVICE_LABEL: Record<Service, string> = { web: 'Websites', app: 'Mobile apps', social: 'Social media', seo: 'SEO', branding: 'Branding & design', ads: 'Ads' };

const DICT: Record<Service, RegExp> = {
	web: /\b(site(s)? (web|internet|vitrine)|website|webdesign|web design|webdevelop|développement web|creation de site|création de site|wordpress|webflow|shopify|e-?commerce|webshop|landing page|websites?)\b/i,
	app: /\b(application(s)? mobile|app(s)? mobile|mobile app|ios|android|react native|flutter|app development|applicatie|apps?\b)/i,
	social: /\b(réseaux sociaux|reseaux sociaux|social media|community manag|instagram|tiktok|facebook|linkedin|sociale media|contenu|content creat|influen)/i,
	seo: /\b(seo|référencement|referencement|zoekmachine|search engine|google ads|sea)\b/i,
	branding: /\b(branding|identité visuelle|identite visuelle|logo|graphi|design graphique|huisstijl|brand identity)\b/i,
	ads: /\b(publicité|publicite|ads|advertising|campagne(s)? (meta|google)|adverteren|paid media|meta ads|google ads)\b/i
};

// Belgian postal code + city in text ("1050 Ixelles", "B-1000 Bruxelles")
const BE_CITY = /\b(?:B-?)?([1-9]\d{3})\s+([A-ZÀ-Ý][a-zà-ÿ'’-]+(?:[\s-][A-ZÀ-Ý][a-zà-ÿ'’-]+)?)/g;
const KNOWN_CITIES = ['Bruxelles', 'Brussels', 'Brussel', 'Ixelles', 'Etterbeek', 'Uccle', 'Schaerbeek', 'Anderlecht', 'Saint-Gilles', 'Woluwe', 'Forest', 'Liège', 'Namur', 'Charleroi', 'Mons', 'Louvain-la-Neuve', 'Wavre', 'Waterloo', 'Gand', 'Gent', 'Antwerpen', 'Anvers', 'Leuven', 'Louvain', 'Brugge', 'Bruges', 'Hasselt', 'Mechelen', 'Malines', 'Tournai', 'Arlon', 'Paris', 'Lille', 'Lyon', 'Amsterdam', 'Rotterdam', 'Luxembourg'];

const clean = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, ' ').trim();

export function isSocialUrl(u: string) {
	return /(instagram\.com|tiktok\.com|facebook\.com|linkedin\.com|behance\.net|x\.com|twitter\.com)/i.test(u);
}

export function normaliseUrl(input: string) {
	let s = input.trim();
	// "@unixstudio" on its own: an Instagram handle
	if (/^@[\w.]{2,30}$/.test(s)) s = `instagram.com/${s.slice(1)}`;
	if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
	const u = new URL(s);
	if (!u.hostname.includes('.')) throw new Error('invalid');
	return u.toString();
}

// ---------- brand colour ----------
const rgbOf = (h: string) => {
	let x = h.replace('#', '');
	if (x.length === 3) x = x.split('').map((c) => c + c).join('');
	const n = parseInt(x, 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const saturated = (h: string) => {
	const [r, g, b] = rgbOf(h);
	const max = Math.max(r, g, b), min = Math.min(r, g, b);
	return max - min > 60 && max > 60; // not grey, not almost black
};
const norm = (h: string) => {
	let x = h.replace('#', '').toLowerCase();
	if (x.length === 3) x = x.split('').map((c) => c + c).join('');
	return `#${x}`;
};
/** The agency's brand colour: theme-color meta, CSS brand variables, then the most used saturated colour in its CSS. */
export async function brandColor(html: string, base: string): Promise<string | undefined> {
	const meta = /<meta[^>]+name=["'](?:theme-color|msapplication-TileColor)["'][^>]*content=["'](#[0-9a-f]{3,6})["']/i.exec(html)?.[1];
	if (meta && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(meta) && saturated(meta)) return norm(meta);
	let css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n') + ' ' + [...html.matchAll(/style=["']([^"']+)["']/gi)].map((m) => m[1]).join(';');
	const sheets = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)].map((m) => /href=["']([^"']+)["']/i.exec(m[0])?.[1]).filter(Boolean).slice(0, 2) as string[];
	for (const href of sheets) {
		try {
			const r = await fetch(new URL(href, base), { signal: AbortSignal.timeout(5000) });
			if (r.ok) css += '\n' + (await r.text()).slice(0, 600_000);
		} catch {
			/* ignore */
		}
	}
	const v = /--(?:wp--preset--color--)?(?:primary|brand|accent|main|theme)(?:-color)?\s*:\s*(#[0-9a-f]{6}|#[0-9a-f]{3})\b/i.exec(css)?.[1];
	if (v && saturated(v)) return norm(v);
	const count = new Map<string, number>();
	for (const m of css.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
		const h = norm(m[0]);
		if (saturated(h)) count.set(h, (count.get(h) ?? 0) + 1);
	}
	const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
	return top && top[1] >= 2 ? top[0] : undefined;
}

async function aiRefine(p: AgencyProfile, text: string): Promise<AgencyProfile | null> {
	if (!env.ANTHROPIC_API_KEY) return null;
	try {
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
			signal: AbortSignal.timeout(15000),
			body: JSON.stringify({
				model: env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
				max_tokens: 250,
				messages: [{ role: 'user', content: `From this agency website text, answer JSON only: {"name":"","services":[subset of "web","app","social","seo","branding","ads"],"city":"main city or empty","country":"BE/FR/NL/LU or empty","lang":"fr|nl|en","summary":"one sentence: what they sell to whom"}.\n\n${text.slice(0, 5000)}` }]
			})
		});
		if (!res.ok) return null;
		const t = (await res.json()).content?.[0]?.text ?? '';
		const j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
		const services = (j.services ?? []).filter((s: string) => s in DICT) as Service[];
		return { ...p, name: j.name || p.name, services: services.length ? services : p.services, city: j.city || p.city, country: j.country || p.country, lang: ['fr', 'nl', 'en'].includes(j.lang) ? j.lang : p.lang, summary: j.summary || p.summary, source: 'ai' };
	} catch {
		return null;
	}
}

const PLATFORM: [RegExp, string][] = [
	[/instagram\.com/i, 'Instagram'],
	[/tiktok\.com/i, 'TikTok'],
	[/linkedin\.com/i, 'LinkedIn'],
	[/facebook\.com/i, 'Facebook'],
	[/behance\.net/i, 'Behance'],
	[/(x|twitter)\.com/i, 'X']
];
/** Name from the handle in a social URL: instagram.com/unix.studio → "Unix Studio", linkedin.com/company/acme-agency → "Acme Agency". */
const handleName = (url: string) => {
	const parts = new URL(url).pathname.split('/').filter(Boolean).filter((x) => !['company', 'in', 'school', 'showcase', 'pages'].includes(x));
	const h = (parts[0] ?? '').replace(/^@/, '');
	return h.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
};
/** Instagram, TikTok, LinkedIn…: read the public preview (name + bio) that these sites share with link previews. */
async function fromSocial(url: string, base: AgencyProfile): Promise<AgencyProfile> {
	const platform = PLATFORM.find(([re]) => re.test(url))?.[1] ?? 'Social';
	const name = handleName(url) || base.name;
	let title = '';
	let bio = '';
	for (const ua of ['facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', 'Mozilla/5.0 (compatible; UndercutBot/1.0; +https://getundercut.app)']) {
		try {
			const r = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: 'follow', headers: { 'user-agent': ua, 'accept-language': 'en,fr;q=0.8' } });
			const html = (await r.text()).slice(0, 400_000);
			const meta = (prop: string) => clean(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)`, 'i').exec(html)?.[1] ?? new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, 'i').exec(html)?.[1] ?? '');
			title = meta('og:title') || clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
			bio = meta('og:description') || meta('description');
			if (bio || (title && !/log ?in|sign ?up|instagram$|tiktok$/i.test(title))) break;
		} catch {
			/* try the next way */
		}
	}
	// "Unix Studio (@unix.studio) • Instagram photos and videos" → "Unix Studio"
	const cleanTitle = title.replace(/\s*(\(@|•|·|\|| - | – | on TikTok).*$/i, '').replace(/\s*\|\s*LinkedIn$/i, '').trim();
	const text = `${title} ${bio}`;
	const services = (Object.keys(DICT) as Service[]).filter((x) => DICT[x].test(text));
	if (!services.includes('social') && /Instagram|TikTok/.test(platform)) services.push('social');
	const city = KNOWN_CITIES.find((c) => new RegExp(`\\b${c}\\b`, 'i').test(text)) ?? [...text.matchAll(BE_CITY)].map((x) => x[2])[0] ?? '';
	let p: AgencyProfile = { ...base, name: (cleanTitle && cleanTitle.length <= 60 ? cleanTitle : name).slice(0, 60), services: services.length ? services : ['social'], city, summary: bio.slice(0, 200), source: 'site', platform };
	if (bio) {
		const ai = await aiRefine(p, `${platform} profile of an agency. ${text}`);
		if (ai) p = { ...ai, platform };
	}
	p.needs = !p.city ? `We read your ${platform} profile. Which city do you look for clients in? Check what you sell too.` : bio ? undefined : `We could only read your ${platform} name. Tell us what you sell and where.`;
	return p;
}

export async function profileFromUrl(raw: string): Promise<AgencyProfile> {
	const url = normaliseUrl(raw);
	const host = new URL(url).hostname.replace(/^www\./, '');
	const base: AgencyProfile = { url, name: host.split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), services: [], city: '', country: host.endsWith('.be') ? 'BE' : host.endsWith('.fr') ? 'FR' : host.endsWith('.nl') ? 'NL' : host.endsWith('.lu') ? 'LU' : '', lang: 'fr', summary: '', source: 'site' };
	if (isSocialUrl(url)) return fromSocial(url, base);
	let html = '';
	try {
		const r = await fetch(url, { signal: AbortSignal.timeout(9000), redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (compatible; UndercutBot/1.0; +https://getundercut.app)', 'accept-language': 'fr,nl;q=0.8,en;q=0.6' } });
		html = (await r.text()).slice(0, 800_000);
	} catch {
		return { ...base, source: 'manual', needs: 'We could not open this site — tell us what you sell and where.' };
	}
	const pick = (re: RegExp) => clean(html.match(re)?.[1] ?? '');
	const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
	const desc = pick(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)/i) || pick(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)/i);
	const ogName = pick(/<meta[^>]+property=["']og:site_name["'][^>]*content=["']([^"']*)/i);
	const headings = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map((m) => clean(m[1])).filter(Boolean).slice(0, 40).join(' · ');
	const body = clean(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')).slice(0, 20000);
	const text = `${title} ${desc} ${headings} ${body}`;
	const lang = (html.match(/<html[^>]+lang=["']([a-z]{2})/i)?.[1] ?? '').toLowerCase();

	const services = (Object.keys(DICT) as Service[]).filter((s) => DICT[s].test(`${title} ${desc} ${headings}`) || (body.match(new RegExp(DICT[s].source, 'gi'))?.length ?? 0) >= 2);

	// city: schema.org addressLocality, then "1050 Ixelles", then known city names
	let city = pick(/"addressLocality"\s*:\s*"([^"]+)"/i);
	if (!city) {
		const m = [...body.matchAll(BE_CITY)].map((x) => x[2]).filter((c) => !/^(Copyright|Tous|All|Tel|Fax|Mail)/i.test(c));
		city = m[0] ?? '';
	}
	if (!city) city = KNOWN_CITIES.find((c) => new RegExp(`\\b${c}\\b`, 'i').test(text)) ?? '';
	const country = pick(/"addressCountry"\s*:\s*"([^"]+)"/i).slice(0, 2).toUpperCase() || base.country || (/\b\d{4}\s+(Bruxelles|Brussel|Ixelles|Liège|Gent|Namur)/i.test(body) ? 'BE' : '');

	const name = (ogName || title.split(/[|–—·:-]/)[0] || base.name).trim().slice(0, 60);
	let p: AgencyProfile = {
		...base,
		name,
		services: services.length ? services : ['web'],
		city,
		country: country || '',
		lang: lang === 'nl' ? 'nl' : lang === 'en' ? 'en' : 'fr',
		summary: (desc || headings.split(' · ')[0] || '').slice(0, 200)
	};
	p.color = await brandColor(html, url).catch(() => undefined);
	const ai = await aiRefine(p, text);
	if (ai) p = ai;
	if (!p.city) p.needs = 'We could not find your city — pick it so we search the right area.';
	return p;
}
