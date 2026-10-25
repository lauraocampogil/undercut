import { redirect } from '@sveltejs/kit';
import { clearDemoSession } from '$lib/server/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, locals }) => {
	clearDemoSession(cookies);
	await locals.supabase?.auth.signOut();
	redirect(303, '/');
};
