import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { config } from './config';

/** Demo-mode session: a signed cookie holding the account id (no email verification). */
const COOKIE = 'rw_session';
const secret = () => config.cronSecret || 'rivalwatch-demo-secret';
const sign = (v: string) => createHmac('sha256', secret()).update(v).digest('base64url');

export function setDemoSession(cookies: Cookies, accountId: string) {
	cookies.set(COOKIE, `${accountId}.${sign(accountId)}`, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: false,
		maxAge: 60 * 60 * 24 * 60
	});
}

export function readDemoSession(cookies: Cookies): string | null {
	const raw = cookies.get(COOKIE);
	if (!raw) return null;
	const i = raw.lastIndexOf('.');
	const id = raw.slice(0, i);
	const a = Buffer.from(raw.slice(i + 1));
	const b = Buffer.from(sign(id));
	return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}

export function clearDemoSession(cookies: Cookies) {
	cookies.delete(COOKIE, { path: '/' });
}
