// MVP storage: JSON files in ./.data so the app runs with zero setup.
// Production: replace with Supabase (see supabase/schema.sql) — same function signatures.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Agency, Client } from '#lib/types.ts';

const DIR = join(process.cwd(), '.data');

function read<T>(file: string, fallback: T): T {
	const p = join(DIR, file);
	if (!existsSync(p)) return fallback;
	try {
		return JSON.parse(readFileSync(p, 'utf8')) as T;
	} catch {
		return fallback;
	}
}

function write(file: string, data: unknown) {
	mkdirSync(DIR, { recursive: true });
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
	return read<Client[]>('clients.json', SEED);
}

export function getClient(id: string): Client | undefined {
	return listClients().find((c) => c.id === id);
}

export function saveClient(client: Client) {
	const all = listClients().filter((c) => c.id !== client.id);
	all.push(client);
	write('clients.json', all);
}

export function deleteClient(id: string) {
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
export type Account = { name: string; email: string; language: 'en' | 'fr' | 'nl' | 'es'; passwordHash?: string };
export function getAccount(): Account {
	return read<Account>('account.json', { name: 'Agency owner', email: '', language: 'en' });
}
export function saveAccount(a: Account) {
	write('account.json', a);
}

// Team members & invitations
export type Member = { email: string; name?: string; role: 'owner' | 'admin' | 'member' | 'client'; status: 'active' | 'invited'; clientId?: string; invitedAt: string; passwordHash?: string; inviteToken?: string };
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
