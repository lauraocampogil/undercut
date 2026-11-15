import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { COOKIE, allowedPath, authEnabled, findUser, sessionPayload, userFromCookie, type User } from '#lib/server/auth.ts';
import { getAccount, loadWorkspace } from '#lib/server/store.ts';
import { startScheduler } from '#lib/server/scheduler.ts';
import { inWorkspace } from '#lib/server/context.ts';
import { dbOn } from '#lib/server/db.ts';

// Pages and APIs that need a signed-in user once the workspace has a password (always in multi-agency mode).
const PRIVATE = /^\/(app|onboarding|admin)(\/|$)|^\/api\/(assistant|fix|why)(\/|$)/;

function guard(event: Parameters<Handle>[0]['event'], user: User | null) {
	const path = event.url.pathname;
	if (!PRIVATE.test(path)) return null;
	if (!user) {
		if (path.startsWith('/api/')) return new Response(JSON.stringify({ error: 'Sign in first' }), { status: 401, headers: { 'content-type': 'application/json' } });
		redirect(303, `/login?next=${encodeURIComponent(path + event.url.search)}`);
	}
	if (!allowedPath(user, path)) {
		if (path.startsWith('/api/')) return new Response(JSON.stringify({ error: 'Not allowed' }), { status: 403, headers: { 'content-type': 'application/json' } });
		redirect(303, user.role === 'client' && user.clientId ? `/app/clients/${user.clientId}` : '/app');
	}
	return null;
}

export const handle: Handle = async ({ event, resolve }) => {
	startScheduler(event.url.origin);

	// ---- multi-agency mode (Supabase): the session says which workspace this request runs in ----
	if (dbOn()) {
		const s = sessionPayload(event.cookies.get(COOKIE));
		event.locals.locked = true;
		if (s?.w) {
			await loadWorkspace(s.w);
			return inWorkspace(s.w, async () => {
				const u = findUser(s.e);
				event.locals.user = u ? { email: u.email, name: u.name, role: u.role, clientId: u.clientId } : null;
				event.locals.ws = s.w!;
				return guard(event, event.locals.user) ?? resolve(event);
			});
		}
		event.locals.user = null;
		return guard(event, null) ?? resolve(event);
	}

	// ---- local mode: one workspace in ./.data ----
	const locked = authEnabled();
	let user = userFromCookie(event.cookies.get(COOKIE));
	if (!locked && !user) {
		// Open workspace (no password yet): act as the owner.
		const a = getAccount();
		user = { email: a.email, name: a.name, role: 'owner' };
	}
	event.locals.user = user;
	event.locals.locked = locked;
	return guard(event, user) ?? resolve(event);
};
