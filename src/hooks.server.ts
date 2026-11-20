import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { COOKIE, allowedPath, authEnabled, findUser, sessionPayload, userFromCookie, type User } from '#lib/server/auth.ts';
import { getAccount, loadWorkspace } from '#lib/server/store.ts';
import { startScheduler } from '#lib/server/scheduler.ts';
import { inWorkspace } from '#lib/server/context.ts';
import { dbOn } from '#lib/server/db.ts';
import * as env from '$app/env/private';

// Two domains, one app: the marketing site (SITE_URL, e.g. getundercut.app) and the app (PUBLIC_BASE_URL, e.g. app.getundercut.app).
const MARKETING = /^\/($|prospects|privacy|terms|dpa|beta)(\/|$)/;
const hostOf = (u?: string) => {
	try {
		return u ? new URL(u).host : '';
	} catch {
		return '';
	}
};
function domainRedirect(url: URL, reqHost: string): string | null {
	const site = hostOf(env.SITE_URL);
	const app = hostOf(env.PUBLIC_BASE_URL);
	if (!site || !app || site === app) return null;
	// behind a proxy with ORIGIN set, url.host is always the app host: trust the forwarded host instead
	const host = reqHost || url.host;
	const path = url.pathname + url.search;
	if (host === `www.${site}`) return `${env.SITE_URL!.replace(/\/$/, '')}${path}`;
	if (host === site && !MARKETING.test(url.pathname) && !url.pathname.startsWith('/_app/') && !/\.[a-z0-9]+$/i.test(url.pathname)) return `${env.PUBLIC_BASE_URL!.replace(/\/$/, '')}${path}`;
	if (host === app && url.pathname === '/') return '/app';
	if (host === app && /^\/(prospects|privacy|terms|dpa)(\/|$)/.test(url.pathname)) return `${env.SITE_URL!.replace(/\/$/, '')}${path}`;
	return null;
}

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
	const to = event.request.method === 'GET' ? domainRedirect(event.url, (event.request.headers.get('x-forwarded-host') ?? event.request.headers.get('host') ?? '').split(',')[0].trim()) : null;
	// a Response, not redirect(): SvelteKit refuses redirect() to another domain
	if (to) return new Response(null, { status: 308, headers: { location: to } });

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
