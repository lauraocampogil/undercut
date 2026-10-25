import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Supabase redirects here from the magic link. */
export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next') ?? '/dashboard';
	if (code && locals.supabase) await locals.supabase.auth.exchangeCodeForSession(code);
	redirect(303, next.startsWith('/') ? next : '/dashboard');
};
