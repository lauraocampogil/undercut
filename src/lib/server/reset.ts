// Password reset links: signed, valid 1 hour, and single-use (they stop working once the password changes).
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { secret } from './auth.ts';

const TTL = 60 * 60 * 1000;
const fp = (hash?: string) => createHash('sha256').update(hash ?? 'none').digest('hex').slice(0, 16);
const sign = (p: string) => createHmac('sha256', secret()).update(`reset:${p}`).digest('base64url');

export function resetToken(email: string, ws: string | null, passwordHash?: string) {
	const p = Buffer.from(JSON.stringify({ e: email, w: ws ?? undefined, x: Date.now() + TTL, h: fp(passwordHash) })).toString('base64url');
	return `${p}.${sign(p)}`;
}

/** Returns who the link is for, or null when it is wrong or expired. Check `h` against the current password with `sameHash`. */
export function readResetToken(t: string): { e: string; w?: string; h: string } | null {
	const [p, s] = (t ?? '').split('.');
	if (!p || !s) return null;
	const a = Buffer.from(s);
	const b = Buffer.from(sign(p));
	if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
	try {
		const v = JSON.parse(Buffer.from(p, 'base64url').toString());
		return v.x > Date.now() && v.e ? v : null;
	} catch {
		return null;
	}
}
export const sameHash = (h: string, passwordHash?: string) => h === fp(passwordHash);
