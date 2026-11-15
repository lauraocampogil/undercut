import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { COOKIE, allowedPath, authEnabled, userFromCookie } from '#lib/server/auth.ts';
import { getAccount } from '#lib/server/store.ts';
import { startScheduler } from '#lib/server/scheduler.ts';

// Pages and APIs that need a signed-in user once the workspace has a password.
const PRIVATE = /^\/(app|onboarding)(\/|$)|^\/api\/(assistant|fix|why)(\/|$)/;

export const handle: Handle = async ({ event, resolve }) => {
	startScheduler(event.url.origin);
	const locked = authEnabled();
	let user = userFromCookie(event.cookies.get(COOKIE));
	if (!locked && !user) {
		// Open workspace (no password yet): act as the owner.
		const a = getAccount();
		user = { email: a.email, name: a.name, role: 'owner' };
	}
	event.locals.user = user;
	event.locals.locked = locked;

	const path = event.url.pathname;
	if (PRIVATE.test(path)) {
		if (!user) {
			if (path.startsWith('/api/')) return new Response(JSON.stringify({ error: 'Sign in first' }), { status: 401, headers: { 'content-type': 'application/json' } });
			redirect(303, `/login?next=${encodeURIComponent(path + event.url.search)}`);
		}
		if (!allowedPath(user, path)) {
			if (path.startsWith('/api/')) return new Response(JSON.stringify({ error: 'Not allowed' }), { status: 403, headers: { 'content-type': 'application/json' } });
			redirect(303, user.role === 'client' && user.clientId ? `/app/clients/${user.clientId}` : '/app');
		}
	}
	return resolve(event);
};
