// Private beta: waitlist on the landing page → the founder invites agencies from /admin → they sign up with their code.
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as env from '$app/env/private';
import { db, dbOn } from './db.ts';

export type WaitRow = { id: string; email: string; name: string; agency: string; kind: string; website: string; note: string; status: 'waiting' | 'invited' | 'joined'; code?: string | null; workspace_id?: string | null; created_at: string; invited_at?: string | null };

export const seats = () => Math.max(1, Number(env.BETA_SEATS) || 30);

// local mode: one JSON file (global, not per workspace)
const FILE = join(process.cwd(), '.data', 'waitlist.json');
const readLocal = (): WaitRow[] => (existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : []);
const writeLocal = (rows: WaitRow[]) => {
	mkdirSync(join(process.cwd(), '.data'), { recursive: true });
	writeFileSync(FILE, JSON.stringify(rows, null, 2));
};

export async function joinWaitlist(r: Pick<WaitRow, 'email' | 'name' | 'agency' | 'kind' | 'website' | 'note'>) {
	const row = { ...r, email: r.email.trim().toLowerCase() };
	if (dbOn()) {
		await db.upsert('waitlist', row, 'email');
		return;
	}
	const all = readLocal();
	const i = all.findIndex((x) => x.email === row.email);
	if (i >= 0) all[i] = { ...all[i], ...row };
	else all.push({ ...row, id: randomBytes(6).toString('hex'), status: 'waiting', created_at: new Date().toISOString() });
	writeLocal(all);
}

export async function listWaitlist(): Promise<WaitRow[]> {
	const rows = dbOn() ? await db.select<WaitRow>('waitlist', { order: 'created_at.desc' }) : readLocal().reverse();
	return rows;
}

export async function invite(id: string) {
	const code = randomBytes(9).toString('base64url');
	const patch = { status: 'invited', code, invited_at: new Date().toISOString() };
	if (dbOn()) {
		const [row] = await db.update<WaitRow>('waitlist', { id: `eq.${id}` }, patch);
		return row;
	}
	const all = readLocal();
	const row = all.find((x) => x.id === id);
	if (!row) return null;
	Object.assign(row, patch);
	writeLocal(all);
	return row;
}

export async function rowByCode(code: string) {
	if (!code) return null;
	const rows = dbOn() ? await db.select<WaitRow>('waitlist', { code: `eq.${code}` }) : readLocal().filter((x) => x.code === code);
	return rows[0] ?? null;
}

export async function markJoined(code: string, ws: string | null) {
	if (dbOn()) {
		await db.update('waitlist', { code: `eq.${code}` }, { status: 'joined', workspace_id: ws });
		return;
	}
	const all = readLocal();
	const row = all.find((x) => x.code === code);
	if (row) Object.assign(row, { status: 'joined' });
	writeLocal(all);
}

export const isAdmin = (email?: string | null) =>
	Boolean(email) && (env.ADMIN_EMAILS ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean).includes(email!.toLowerCase());
