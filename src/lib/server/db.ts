// Supabase (Postgres) through its REST API — no SDK, server side only, with the service role key.
// Tables: see supabase/schema.sql. When SUPABASE_URL is not set, Undercut runs on local JSON files (one workspace).
import * as env from '$app/env/private';

export const dbOn = () => Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);

async function rest<T = any>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T> {
	const res = await fetch(`${env.SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/${path}`, {
		...init,
		headers: {
			apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
			authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
			'content-type': 'application/json',
			...(init.prefer ? { prefer: init.prefer } : {}),
			...(init.headers ?? {})
		},
		signal: AbortSignal.timeout(15_000)
	});
	if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 300)}`);
	const text = await res.text();
	return (text ? JSON.parse(text) : null) as T;
}

const q = (o: Record<string, string>) => new URLSearchParams(o).toString();

export const db = {
	select: <T = any>(table: string, query: Record<string, string> = {}) => rest<T[]>(`${table}?${q({ select: '*', ...query })}`),
	insert: <T = any>(table: string, rows: object | object[]) => rest<T[]>(table, { method: 'POST', body: JSON.stringify(rows), prefer: 'return=representation' }),
	upsert: <T = any>(table: string, rows: object | object[], onConflict: string) =>
		rest<T[]>(`${table}?on_conflict=${onConflict}`, { method: 'POST', body: JSON.stringify(rows), prefer: 'resolution=merge-duplicates,return=representation' }),
	update: <T = any>(table: string, query: Record<string, string>, patch: object) => rest<T[]>(`${table}?${q(query)}`, { method: 'PATCH', body: JSON.stringify(patch), prefer: 'return=representation' }),
	remove: (table: string, query: Record<string, string>) => rest(`${table}?${q(query)}`, { method: 'DELETE' })
};
