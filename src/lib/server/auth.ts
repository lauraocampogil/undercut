// Login for the workspace: owner + team members (+ client logins limited to one client).
// Passwords: scrypt. Sessions: signed cookie (HMAC-SHA256). No external service needed.
// Until the owner sets a password the workspace stays open (local setup) — /app/settings/account shows how to lock it.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as env from '$app/env/private';
import type { Cookies } from '@sveltejs/kit';
import { getAccount, listMembers, saveAccount, saveMembers, type Member } from '#lib/server/store.ts';
import { currentWs } from './context.ts';
import { dbOn } from './db.ts';

export type User = { email: string; name: string; role: Member['role']; clientId?: string };
export const COOKIE = 'uc_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function secret() {
	if (env.SESSION_SECRET) return env.SESSION_SECRET;
	const dir = join(process.cwd(), '.data');
	const p = join(dir, 'secret.txt');
	if (!existsSync(p)) {
		mkdirSync(dir, { recursive: true });
		writeFileSync(p, randomBytes(32).toString('hex'));
	}
	return readFileSync(p, 'utf8').trim();
}

export function hashPassword(pw: string) {
	const salt = randomBytes(16).toString('hex');
	return `scrypt$${salt}$${scryptSync(pw, salt, 32).toString('hex')}`;
}
export function verifyPassword(pw: string, stored?: string) {
	if (!stored?.startsWith('scrypt$')) return false;
	const [, salt, hash] = stored.split('$');
	const a = Buffer.from(hash, 'hex');
	const b = scryptSync(pw, salt, 32);
	return a.length === b.length && timingSafeEqual(a, b);
}
export const passwordProblem = (pw: string) => (pw.length < 8 ? 'Use at least 8 characters.' : null);

/** Login is enforced once the owner has a password. */
export const authEnabled = () => dbOn() || Boolean(getAccount().passwordHash || getAccount().googleLogin);

function sign(payload: string) {
	return createHmac('sha256', secret()).update(payload).digest('base64url');
}
export function startSession(cookies: Cookies, email: string, secure: boolean) {
	const payload = Buffer.from(JSON.stringify({ e: email, x: Date.now() + MAX_AGE * 1000, w: currentWs() ?? undefined })).toString('base64url');
	cookies.set(COOKIE, `${payload}.${sign(payload)}`, { path: '/', httpOnly: true, sameSite: 'lax', secure, maxAge: MAX_AGE });
}
export function endSession(cookies: Cookies) {
	cookies.delete(COOKIE, { path: '/' });
}

export function findUser(email: string): (User & { passwordHash?: string }) | null {
	const e = email.trim().toLowerCase();
	const owner = getAccount();
	if (owner.email && owner.email.toLowerCase() === e) return { email: owner.email, name: owner.name, role: 'owner', passwordHash: owner.passwordHash };
	const m = listMembers().find((x) => x.email === e && x.status === 'active');
	return m ? { email: m.email, name: m.name ?? m.email.split('@')[0], role: m.role, clientId: m.clientId, passwordHash: m.passwordHash } : null;
}

/** Verified session content: email + workspace. */
export function sessionPayload(value?: string): { e: string; w?: string } | null {
	if (!value) return null;
	const [payload, sig] = value.split('.');
	if (!payload || !sig) return null;
	const expected = sign(payload);
	if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
	try {
		const { e, x, w } = JSON.parse(Buffer.from(payload, 'base64url').toString());
		if (Date.now() > x) return null;
		return { e, w };
	} catch {
		return null;
	}
}

export function userFromCookie(value?: string): User | null {
	const p = sessionPayload(value);
	if (!p) return null;
	const u = findUser(p.e);
	return u ? { email: u.email, name: u.name, role: u.role, clientId: u.clientId } : null;
}

// --- brute-force protection: 10 attempts / 15 min per IP+email ---
const attempts = new Map<string, { n: number; at: number }>();
export function tooManyAttempts(key: string) {
	const a = attempts.get(key);
	if (!a || Date.now() - a.at > 15 * 60_000) return false;
	return a.n >= 10;
}
export function failedAttempt(key: string) {
	const a = attempts.get(key);
	attempts.set(key, !a || Date.now() - a.at > 15 * 60_000 ? { n: 1, at: Date.now() } : { n: a.n + 1, at: a.at });
}

export function setOwnerPassword(pw: string) {
	saveAccount({ ...getAccount(), passwordHash: hashPassword(pw) });
}

// --- invitations ---
export function createInvite(m: Omit<Member, 'status' | 'invitedAt' | 'inviteToken'>) {
	// multi-agency mode: the token carries its workspace, so the invite page knows where to look
	const token = (dbOn() && currentWs() ? `${currentWs()}.` : '') + randomBytes(18).toString('base64url');
	const all = listMembers().filter((x) => x.email !== m.email);
	all.push({ ...m, status: 'invited', invitedAt: new Date().toISOString(), inviteToken: token });
	saveMembers(all);
	return token;
}
export const inviteWorkspace = (token: string) => (token.includes('.') ? token.split('.')[0] : null);

export function inviteByToken(token: string) {
	return listMembers().find((m) => m.inviteToken && m.inviteToken === token && m.status === 'invited') ?? null;
}
export function acceptInvite(token: string, name: string, pw: string) {
	const all = listMembers();
	const m = all.find((x) => x.inviteToken === token && x.status === 'invited');
	if (!m) return null;
	m.status = 'active';
	m.name = name || m.name;
	m.passwordHash = hashPassword(pw);
	delete m.inviteToken;
	saveMembers(all);
	return m;
}

/** Activate an invitation with a Google account (the Google email must match the invited email). */
export function acceptInviteWithGoogle(token: string, email: string, name: string) {
	const all = listMembers();
	const m = all.find((x) => x.inviteToken === token && x.status === 'invited');
	if (!m || m.email !== email) return null;
	m.status = 'active';
	m.name = m.name || name;
	m.googleLogin = true;
	delete m.inviteToken;
	saveMembers(all);
	return m;
}

/** Where a role may go. Clients only see their own dashboard; members can't touch billing/team. */
export function allowedPath(u: User, path: string) {
	if (u.role === 'client') return Boolean(u.clientId) && (path.startsWith(`/app/clients/${u.clientId}`) || path === '/app/settings/account' || path.startsWith('/app/settings/account'));
	if (u.role === 'member') return !/^\/app\/settings\/(billing|team)/.test(path) && !/^\/app\/clients\/[^/]+\/settings/.test(path);
	return true;
}
