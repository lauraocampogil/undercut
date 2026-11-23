// A real look at a business's website: home page + its contact / booking / menu pages.
// Finds the email (also written as text or "name [at] domain"), online booking, opening hours, prices, a clickable phone, a Google description.
// And Google's own mobile speed test (PageSpeed Insights) for the few leads we keep.
import * as env from '$app/env/private';

export type Audit = { email?: string; booking: boolean; hours: boolean; prices: boolean; tel: boolean; desc: boolean; form: boolean; pages: number };

const UA = 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36';
const SUB = /contact|reserv|r%C3%A9serv|book|rendez|rdv|afspraak|boeken|menu|carte|kaart|tarif|prix|prijs|price|horaire|openingsuren|opening|commander|bestellen|order/i;
const BOOKING = /(calendly|planity|treatwell|resengo|booksy|fresha|salonized|zenchef|thefork|lafourchette|opentable|formitable|guestplan|tablebooker|sevenrooms|simplybook|setmore|timify|doctolib|doctoranytime|mobminder|agendize|acuityscheduling|square\.site\/book|lightspeed.*reserv|booking\.com|hotelrunner|cubilis|apps\.apple\.com|play\.google\.com|uber\s?eats|deliveroo|takeaway\.com|commande en ligne|commander en ligne|online bestellen|réserver en ligne|reserver en ligne|prendre rendez-vous|online reserveren|online boeken|book (now|online|a table)|réservez|reserveer)/i;
const HOURS = /(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|monday|tuesday|wednesday|thursday|friday|saturday|sunday|lun\.?|mar\.?|ma\.|di\.)[^<]{0,60}?\d{1,2}\s?(h|:|u)\s?\d{0,2}/i;
const PRICE = /\d{1,4}(?:[.,]\d{1,2})?\s?(€|&euro;|eur\b)|(€|&euro;)\s?\d{1,4}/i;
const BAD_MAIL = /\.(png|jpe?g|gif|webp|svg|css|js)$|sentry|wixpress|example\.|domain\.|yourdomain|votredomaine|email@|nom@|name@|you@|info@site|@2x/i;

async function get(url: string, ms = 6000) {
	try {
		const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(ms), headers: { 'user-agent': UA, accept: 'text/html' } });
		if (!r.ok || !(r.headers.get('content-type') ?? '').includes('html')) return '';
		return (await r.text()).slice(0, 300_000);
	} catch {
		return '';
	}
}

/** The email written on the page: mailto links, plain text, or "name [at] domain [dot] be". */
export function emailIn(html: string): string | undefined {
	const found = [
		...[...html.matchAll(/mailto:([^"'?\s>]+@[^"'?\s>]+\.[a-z]{2,})/gi)].map((m) => decodeURIComponent(m[1])),
		...[...html.replace(/<[^>]+>/g, ' ').matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,10}\b/gi)].map((m) => m[0]),
		...[...html.replace(/<[^>]+>/g, ' ').matchAll(/\b([\w.+-]+)\s*(?:\[at\]|\(at\)|\{at\}| at |\[arobase\])\s*([\w-]+)\s*(?:\[dot\]|\(dot\)|\[point\]| dot |\.)\s*([a-z]{2,10})\b/gi)].map((m) => `${m[1]}@${m[2]}.${m[3]}`)
	]
		.map((e) => e.trim().toLowerCase())
		.filter((e) => !BAD_MAIL.test(e));
	// a contact address beats a personal or no-reply one
	return found.find((e) => /^(info|contact|hello|bonjour|hallo|welkom|reservation|reservatie|booking|admin|office|mail)@/.test(e)) ?? found.find((e) => !/no-?reply/.test(e));
}

/** Read the home page we already have plus up to 3 useful inner pages (contact, booking, menu, prices). */
export async function auditSite(base: string, home: string): Promise<Audit & { html: string }> {
	let origin = '';
	try {
		origin = new URL(base).origin;
	} catch {
		/* keep empty */
	}
	const links = new Set<string>();
	for (const m of home.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]{0,80}?)<\/a>/gi)) {
		const [href, text] = [m[1], m[2].replace(/<[^>]+>/g, '')];
		if (!SUB.test(href) && !SUB.test(text)) continue;
		try {
			const u = new URL(href, base);
			if (u.origin === origin && !/\.(pdf|jpe?g|png)$/i.test(u.pathname)) links.add(u.href.split('#')[0]);
		} catch {
			/* not a link */
		}
		if (links.size >= 3) break;
	}
	const inner = (await Promise.all([...links].map((u) => get(u)))).filter(Boolean);
	const all = [home, ...inner].join('\n');
	return {
		html: all,
		email: emailIn(all),
		booking: BOOKING.test(all),
		hours: HOURS.test(all.replace(/<[^>]+>/g, ' ')),
		prices: PRICE.test(all.replace(/<[^>]+>/g, ' ')),
		tel: /href=["']tel:/i.test(all),
		desc: (/<meta[^>]+name=["']description["'][^>]*content=["']([^"']{30,})/i.exec(home) ?? /<meta[^>]+content=["']([^"']{30,})["'][^>]*name=["']description["']/i.exec(home)) !== null,
		form: /<form[\s\S]{0,3000}?(e-?mail|message|bericht)/i.test(all),
		pages: 1 + inner.length
	};
}

/** Google's mobile speed test: performance score 0–100 and the time before the main content shows. */
export async function pageSpeed(url: string): Promise<{ score: number; lcp: number } | null> {
	const q = new URLSearchParams({ url, strategy: 'mobile', category: 'performance' });
	if (env.PAGESPEED_API_KEY) q.set('key', env.PAGESPEED_API_KEY);
	try {
		const r = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${q}`, { signal: AbortSignal.timeout(45000) });
		if (!r.ok) return null;
		const j = await r.json();
		const score = j.lighthouseResult?.categories?.performance?.score;
		const lcp = j.lighthouseResult?.audits?.['largest-contentful-paint']?.numericValue;
		return typeof score === 'number' && typeof lcp === 'number' ? { score: Math.round(score * 100), lcp: Math.round(lcp / 100) / 10 } : null;
	} catch {
		return null;
	}
}
