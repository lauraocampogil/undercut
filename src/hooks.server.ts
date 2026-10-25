import * as Sentry from '@sentry/sveltekit';
import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { env as publicEnv } from '$env/dynamic/public';
import { config, db, demoMode } from '$lib/server/config';
import { readDemoSession } from '$lib/server/session';

// Error monitoring on the server. Disabled when PUBLIC_SENTRY_DSN is empty.
if (publicEnv.PUBLIC_SENTRY_DSN) {
	Sentry.init({
		dsn: publicEnv.PUBLIC_SENTRY_DSN,
		environment: publicEnv.PUBLIC_SENTRY_ENVIRONMENT || 'development',
		tracesSampleRate: 0.2
	});
}

const auth: Handle = async ({ event, resolve }) => {
	event.locals.account = null;
	event.locals.supabase = null;

	if (demoMode) {
		const id = readDemoSession(event.cookies);
		if (id) event.locals.account = await db().getAccount(id);
	} else {
		const supabase = createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (list) => list.forEach(({ name, value, options }) => event.cookies.set(name, value, { ...options, path: '/' }))
			}
		});
		event.locals.supabase = supabase;
		const { data } = await supabase.auth.getUser();
		const email = data.user?.email?.toLowerCase();
		if (email) event.locals.account = (await db().getAccountByEmail(email)) ?? (await db().upsertAccount(email));
	}
	if (event.locals.account) Sentry.setUser({ id: event.locals.account.id });

	return resolve(event, {
		filterSerializedResponseHeaders: (name) => name === 'content-range' || name === 'x-supabase-api-version'
	});
};

export const handle = sequence(Sentry.sentryHandle(), auth);
export const handleError = Sentry.handleErrorWithSentry();
