// Proof that someone really works on a product before they can claim it. Two ways, like Google Search Console:
//  1. a code sent to an email address on the product's domain (laura@notion.so for notion.so)
//  2. a tag on the product's website: <meta name="undercut-verify" content="TOKEN">, or a DNS TXT record "undercut-verify=TOKEN"
// Nothing is stored: the token and the codes are signatures of (account, product).
import { createHmac } from 'node:crypto';
import { resolveTxt } from 'node:dns/promises';
import { secret } from './auth.ts';

const sign = (s: string) => createHmac('sha256', secret()).update(`claim:${s}`).digest('hex');

export const siteToken = (ws: string, slug: string) => sign(`${ws}|${slug}`).slice(0, 20);

const hourCode = (ws: string, slug: string, email: string, hour: number) => String(parseInt(sign(`${ws}|${slug}|${email}|${hour}`).slice(0, 8), 16) % 1_000_000).padStart(6, '0');
/** 6-digit code, valid for about an hour. */
export const emailCode = (ws: string, slug: string, email: string) => hourCode(ws, slug, email.toLowerCase(), Math.floor(Date.now() / 36e5));
export const checkEmailCode = (ws: string, slug: string, email: string, code: string) => {
	const h = Math.floor(Date.now() / 36e5);
	return [h, h - 1].some((x) => hourCode(ws, slug, email.toLowerCase(), x) === code.trim());
};

const base = (d: string) => d.toLowerCase().replace(/^www\./, '');
/** The email must be on the product's domain (or one of its subdomains). Free mailboxes never count. */
export function emailMatches(email: string, domain?: string) {
	if (!domain) return false;
	const host = base(email.split('@')[1] ?? '');
	const d = base(domain);
	return Boolean(host) && (host === d || host.endsWith(`.${d}`) || d.endsWith(`.${host}`));
}

/** Looks for the token in the homepage's meta tags, then in the domain's DNS TXT records. */
export async function checkSite(domain: string, token: string): Promise<'meta' | 'dns' | null> {
	const d = base(domain);
	for (const url of [`https://${d}`, `https://www.${d}`]) {
		try {
			const html = await (await fetch(url, { signal: AbortSignal.timeout(8000), redirect: 'follow', headers: { 'user-agent': 'UndercutVerify/1.0 (+https://getundercut.app)' } })).text();
			const re = /<meta[^>]+name=["']undercut-verify["'][^>]*>/gi;
			for (const tag of html.match(re) ?? []) if (tag.includes(token)) return 'meta';
		} catch {
			/* next */
		}
	}
	try {
		const records = (await resolveTxt(d)).map((r) => r.join(''));
		if (records.some((r) => r.trim() === `undercut-verify=${token}`)) return 'dns';
	} catch {
		/* no TXT */
	}
	return null;
}
