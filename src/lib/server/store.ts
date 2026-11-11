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
