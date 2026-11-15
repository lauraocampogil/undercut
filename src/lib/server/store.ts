// Storage gateway. Two modes, same functions:
// - local (no SUPABASE_URL): JSON files in ./.data — one agency workspace, zero setup.
// - multi-agency (Supabase): every agency has its own workspace; its documents live in the `kv` table,
//   loaded once in memory per workspace (reads stay synchronous) and saved on every write.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Agency, Client } from '#lib/types.ts';
import { currentCtx } from './context.ts';
import { db, dbOn } from './db.ts';

const DIR = join(process.cwd(), '.data');

// ---- workspace documents (Supabase mode) ----
const wsCache = new Map<string, { at: number; docs: Map<string, unknown> }>();
const RELOAD_MS = 5 * 60_000;

/** Load a workspace's documents in memory (call before running code inside the workspace). */
export async function loadWorkspace(ws: string, force = false) {
	const hit = wsCache.get(ws);
	if (!force && hit && Date.now() - hit.at < RELOAD_MS) return;
	const rows = await db.select<{ key: string; value: unknown }>('kv', { workspace_id: `eq.${ws}`, select: 'key,value' });
	wsCache.set(ws, { at: Date.now(), docs: new Map(rows.map((r) => [r.key, r.value])) });
}

function read<T>(file: string, fallback: T): T {
	const ctx = currentCtx();
	if (dbOn() && ctx) {
		const docs = wsCache.get(ctx.ws)?.docs;
		if (!docs?.has(file)) return fallback;
		return structuredClone(docs.get(file)) as T;
	}
	const p = join(DIR, file);
	if (!existsSync(p)) return fallback;
	try {
		return JSON.parse(readFileSync(p, 'utf8')) as T;
	} catch {
		return fallback;
	}
}

function write(file: string, data: unknown) {
	const ctx = currentCtx();
	if (dbOn() && ctx) {
		let entry = wsCache.get(ctx.ws);
		if (!entry) wsCache.set(ctx.ws, (entry = { at: Date.now(), docs: new Map() }));
		entry.docs.set(file, structuredClone(data));
		ctx.writes.push(
			db.upsert('kv', { workspace_id: ctx.ws, key: file, value: data ?? null, updated_at: new Date().toISOString() }, 'workspace_id,key').catch((e) => console.error('[kv write]', file, e))
		);
		return;
	}
	if (dbOn()) throw new Error(`write(${file}) outside a workspace`);
	mkdirSync(dirname(join(DIR, file)), { recursive: true });
	writeFileSync(join(DIR, file), JSON.stringify(data, null, 2));
}

const SEED: Client[] = [
	{
		id: 'boulangerie-ixelles',
		name: 'Boulangerie Ixelles',
		domain: 'https://boulangerie-ixelles.be',
		color: '#E0A458',
		createdAt: '2026-09-02',
		demo: true,
		google: {}
	},
	{
		id: 'atelier-vert',
		name: 'Atelier Vert Architectes',
		domain: 'https://ateliervert.be',
		color: '#3E8E63',
		createdAt: '2026-09-15',
		demo: true,
		google: {}
	},
	{
		id: 'kine-schaerbeek',
		name: 'Kiné Schaerbeek',
		domain: 'https://kine-schaerbeek.be',
		color: '#4C7DD9',
		createdAt: '2026-10-01',
		demo: true,
		google: {}
	},
	{
		id: 'velo-flandria',
		name: 'Vélo Flandria',
		domain: 'https://veloflandria.be',
		color: '#D9534C',
		createdAt: '2026-10-20',
		demo: true,
		type: 'both',
		app: { name: 'Vélo Flandria', iosId: '', androidPackage: 'be.veloflandria.app' },
		google: {}
	},
	{
		id: 'moove-app',
		name: 'Moove Fitness App',
		domain: 'https://moove.fit',
		color: '#8B5CF6',
		createdAt: '2026-11-01',
		demo: true,
		type: 'app',
		app: { name: 'Moove', iosId: '', androidPackage: 'fit.moove.app' },
		google: {}
	}
];

export function listClients(): Client[] {
	// example clients only in local mode; a new agency workspace starts empty
	return read<Client[]>('clients.json', dbOn() ? [] : SEED);
}

/** A client id that is unique across every agency (it is also the tracking site id in the snippet). */
export function newClientId(name: string) {
	let id = slugify(name);
	if (dbOn()) return `${id}-${Math.random().toString(36).slice(2, 6)}`;
	while (getClient(id)) id += '-2';
	return id;
}

// ---- site → workspace index (public endpoints: snippet, collect, reports) ----
const siteCache = new Map<string, { ws: string | null; at: number }>();
export async function siteWorkspace(site: string) {
	const hit = siteCache.get(site);
	if (hit && Date.now() - hit.at < 10 * 60_000) return hit.ws;
	const rows = await db.select<{ workspace_id: string }>('sites', { site_id: `eq.${site}`, select: 'workspace_id' }).catch(() => []);
	const ws = rows[0]?.workspace_id ?? null;
	siteCache.set(site, { ws, at: Date.now() });
	return ws;
}

/** Run fn in the workspace that owns this site (client id). Returns null when the site is unknown. */
export async function withSite<T>(site: string, fn: () => T | Promise<T>): Promise<T | null> {
	if (!dbOn()) return fn();
	const ws = await siteWorkspace(site);
	if (!ws) return null;
	await loadWorkspace(ws);
	const { inWorkspace } = await import('./context.ts');
	return inWorkspace(ws, fn);
}

/** Every agency workspace id (scheduler). */
export async function allWorkspaces(): Promise<string[]> {
	if (!dbOn()) return [];
	return (await db.select<{ id: string }>('workspaces', { select: 'id' })).map((r) => r.id);
}

// ---- login index: which workspace an email belongs to ----
export async function lookupLogin(email: string): Promise<string | null> {
	if (!dbOn()) return null;
	const rows = await db.select<{ workspace_id: string }>('logins', { email: `eq.${email.trim().toLowerCase()}`, select: 'workspace_id' });
	return rows[0]?.workspace_id ?? null;
}
export function addLogin(email: string, ws: string) {
	if (!dbOn()) return Promise.resolve();
	return db.upsert('logins', { email: email.trim().toLowerCase(), workspace_id: ws }, 'email');
}
export async function createWorkspace(name: string) {
	const [row] = await db.insert<{ id: string }>('workspaces', { name });
	return row.id;
}

export function getClient(id: string): Client | undefined {
	return listClients().find((c) => c.id === id);
}

export function saveClient(client: Client) {
	const all = listClients().filter((c) => c.id !== client.id);
	all.push(client);
	write('clients.json', all);
	const ctx = currentCtx();
	if (dbOn() && ctx) {
		siteCache.set(client.id, { ws: ctx.ws, at: Date.now() });
		ctx.writes.push(db.upsert('sites', { site_id: client.id, workspace_id: ctx.ws }, 'site_id').catch((e) => console.error('[sites]', e)));
	}
}

export function deleteClient(id: string) {
	const ctx = currentCtx();
	if (dbOn() && ctx) ctx.writes.push(db.remove('sites', { site_id: `eq.${id}` }).catch(() => null));
	write(
		'clients.json',
		listClients().filter((c) => c.id !== id)
	);
}

export function getAgency(): Agency {
	return read<Agency>('agency.json', {
		name: 'Unix Creative Studio',
		color: '#C6F432',
		reportFooter: 'Questions? Reply to this email and we will help.'
	});
}

export function saveAgency(a: Agency) {
	write('agency.json', a);
}

// Google OAuth tokens (one Google login per agency in the MVP).
export type GoogleTokens = {
	access_token: string;
	refresh_token?: string;
	expires_at: number; // ms epoch
	email?: string;
	scope?: string;
};

export function getTokens(): GoogleTokens | null {
	return read<GoogleTokens | null>('google.json', null);
}

export function saveTokens(t: GoogleTokens | null) {
	write('google.json', t);
}

export function slugify(s: string) {
	return (
		s
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/(^-|-$)/g, '')
			.slice(0, 40) || 'client'
	);
}

// Tasks ticked off by the agency: { clientId: { insightId: isoDate } }
type Done = Record<string, Record<string, string>>;

export function getDone(clientId: string): Record<string, string> {
	return read<Done>('tasks.json', {})[clientId] ?? {};
}

export function toggleDone(clientId: string, insightId: string) {
	const all = read<Done>('tasks.json', {});
	const c = (all[clientId] ??= {});
	if (c[insightId]) delete c[insightId];
	else c[insightId] = new Date().toISOString();
	write('tasks.json', all);
}

export const clientType = (c: Client) => c.type ?? 'web';
export const hasWeb = (c: Client) => clientType(c) !== 'app';
export const hasApp = (c: Client) => clientType(c) !== 'web';

// The signed-in person (MVP: one local account; production: Supabase Auth)
export type Account = { name: string; email: string; language: 'en' | 'fr' | 'nl' | 'es'; passwordHash?: string; googleLogin?: boolean };
export function getAccount(): Account {
	return read<Account>('account.json', { name: 'Agency owner', email: '', language: 'en' });
}
export function saveAccount(a: Account) {
	write('account.json', a);
}

// Team members & invitations
export type Member = { email: string; name?: string; role: 'owner' | 'admin' | 'member' | 'client'; status: 'active' | 'invited'; clientId?: string; invitedAt: string; passwordHash?: string; inviteToken?: string; googleLogin?: boolean };
export function listMembers(): Member[] {
	return read<Member[]>('team.json', []);
}
export function saveMembers(m: Member[]) {
	write('team.json', m);
}

// Billing (MVP: plan stored locally; production: Stripe customer + subscription)
export type Billing = { plan: 'trial' | 'freelance' | 'agency' | 'studio'; trialEnds: string; customerId?: string };
export function getBilling(): Billing {
	return read<Billing>('billing.json', { plan: 'trial', trialEnds: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10) });
}
export function saveBilling(b: Billing) {
	write('billing.json', b);
}

/** Generic JSON helpers for feature modules (keywords, campaigns…). */
export const readData = read;
export const writeData = write;
