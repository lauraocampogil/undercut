import { error, json, redirect } from '@sveltejs/kit';
import { addLogin, createWorkspace, getAccount, loadWorkspace, lookupLogin, saveAccount } from '#lib/server/store.ts';
import { inWorkspace } from '#lib/server/context.ts';
import { startSession } from '#lib/server/auth.ts';
import { dev } from '$app/environment';
import * as env from '$app/env/private';
import { getProduct, listProducts, productsWithIdeas } from '#lib/server/public.ts';
import { lastAiText, refresh, regroup } from '#lib/server/reviewdb.ts';
import { ideasError, makeIdeas } from '#lib/server/opportunities.ts';

// Dev only: is Claude reachable, and how long do the database queries take?
export const GET = async ({ url, cookies }) => {
	if (!dev) error(404);
	if (url.searchParams.get('stripetest')) {
		// dev only: does the Stripe key have the permissions Undercut needs? Nothing is charged; the test session is expired at once.
		const env = (await import('$app/env/private')) as unknown as Record<string, string | undefined>;
		const key = env.STRIPE_SECRET_KEY ?? '';
		const call = async (method: string, path: string, body?: Record<string, string>) => {
			const r = await fetch(`https://api.stripe.com/v1/${path}`, { method, headers: { authorization: `Bearer ${key}`, 'content-type': 'application/x-www-form-urlencoded' }, body: body ? new URLSearchParams(body) : undefined });
			const j = await r.json().catch(() => ({}));
			return { ok: r.ok, status: r.status, error: j?.error?.message?.slice(0, 160), id: j?.id, amount: j?.unit_amount, currency: j?.currency };
		};
		const out: Record<string, unknown> = { keyType: key.slice(0, 8) };
		out.price49 = await call('GET', `prices/${env.STRIPE_PRICE_DATABASE}`);
		out.price29 = await call('GET', `prices/${env.STRIPE_PRICE_FOUNDER}`);
		const s = await call('POST', 'checkout/sessions', { mode: 'subscription', 'line_items[0][price]': env.STRIPE_PRICE_FOUNDER ?? '', 'line_items[0][quantity]': '1', success_url: 'https://app.getundercut.app/app/settings/billing?session_id={CHECKOUT_SESSION_ID}', cancel_url: 'https://app.getundercut.app/app/settings/billing' });
		out.checkout = { ok: s.ok, status: s.status, error: s.error };
		if (s.id) out.readSession = await call('GET', `checkout/sessions/${s.id}`).then((x) => ({ ok: x.ok, error: x.error }));
		if (s.id) out.expire = await call('POST', `checkout/sessions/${s.id}/expire`).then((x) => ({ ok: x.ok, error: x.error }));
		out.subscriptions = await call('GET', 'subscriptions?limit=1').then((x) => ({ ok: x.ok, error: x.error }));
		out.customers = await call('GET', 'customers?limit=1').then((x) => ({ ok: x.ok, error: x.error }));
		out.portal = await call('GET', 'billing_portal/configurations?limit=1').then((x) => ({ ok: x.ok, error: x.error }));
		return json(out);
	}
	if (url.searchParams.get('launchcheck')) {
		// what the launch needs, without showing any secret
		const env = await import('$app/env/private');
		const set = (k: string) => Boolean((env as unknown as Record<string, string | undefined>)[k]);
		let resend: unknown = null;
		try {
			const r = await fetch('https://api.resend.com/domains', { headers: { authorization: `Bearer ${(env as unknown as Record<string, string>).RESEND_API_KEY}` } });
			const j = await r.json();
			resend = r.ok ? (j.data ?? []).map((d: { name: string; status: string }) => `${d.name}: ${d.status}`) : `error ${r.status}`;
		} catch (e) {
			resend = String(e);
		}
		const from = String((env as unknown as Record<string, string | undefined>).ALERTS_FROM ?? '').replace(/.*</, '').replace('>', '');
		return json({ resend, fromDomain: from.split('@')[1] ?? '', vars: Object.fromEntries(['WAITLIST', 'SESSION_SECRET', 'CRON_SECRET', 'SITE_URL', 'PUBLIC_BASE_URL', 'ORIGIN', 'ANTHROPIC_API_KEY', 'ADMIN_EMAILS', 'RESEND_API_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_PRICE_DATABASE', 'STRIPE_PRICE_FOUNDER', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].map((k) => [k, set(k)])) });
	}
	if (url.searchParams.get('rebuildSlug')) {
		const { rebuildSlug } = await import('#lib/server/rebuild.ts');
		return json(await rebuildSlug(url.searchParams.get('rebuildSlug')!));
	}
	if (url.searchParams.get('rebuild')) {
		const { rebuildSecondHand } = await import('#lib/server/rebuild.ts');
		return json(await rebuildSecondHand(Number(url.searchParams.get('rebuild')) || 3, url.searchParams.get('visible') === '1'));
	}
	if (url.searchParams.get('secondhand')) {
		const { secondHandSlugs } = await import('#lib/server/public.ts');
		const l = await secondHandSlugs();
		return json({ n: l.length, hidden: l.filter((x) => x.hidden).length, names: l.map((x) => x.name) });
	}
	if (url.searchParams.get('analyze')) {
		const { analyze, count } = await import('#lib/server/reviewdb.ts');
		const t = Date.now();
		const a = await analyze(url.searchParams.get('analyze')!);
		const top = a.themes.filter((x) => x.type === 'complaint').map((x) => ({ label: x.label, kind: x.kind, n: count(a.main, x.id), rivals: a.competitors.map((c) => count(c, x.id)) })).sort((x, y) => y.n - x.n).slice(0, 14);
		return json({ s: (Date.now() - t) / 1000, product: a.main.app.name, competitors: a.competitors.map((c) => c.app.name), reviews: a.main.reviews.length, bad: a.main.reviews.filter((r) => !r.stars || r.stars <= 3).length, badShare: a.main.badShare, note: a.themeNote ?? null, top });
	}
	if (url.searchParams.get('peek')) {
		const { getAnalysis } = await import('#lib/server/reviewdb.ts');
		const a = getAnalysis(url.searchParams.get('peek')!);
		const p = a?.competitors.find((c) => c.app.name === url.searchParams.get('app'));
		return json(p?.reviews.filter((r) => r.theme === url.searchParams.get('theme')).slice(0, 8).map((r) => `${r.stars}★ ${r.text.slice(0, 140)}`) ?? []);
	}
	if (url.searchParams.get('testemails')) {
		// dev only: the waitlist emails, the welcome email and the monthly report, sent to one address
		const to = url.searchParams.get('testemails')!;
		const l = url.searchParams.get('lang') ?? 'es';
		const { sendSamples } = await import('#lib/server/beta-invite.ts');
		const { sendEmail } = await import('#lib/server/email.ts');
		const { welcomeEmail, welcomeSubject } = await import('#lib/server/mails.ts');
		const { weeklyWatch } = await import('#lib/server/watch.ts');
		const out: Record<string, unknown> = url.searchParams.get('only') === 'account' ? {} : await sendSamples(to, l, url.origin);
		out.welcome = await sendEmail(to, welcomeSubject(l), welcomeEmail('Laura', to, l));
		const report = await weeklyWatch(url.origin, true);
		out.monthly = report ? await sendEmail(to, 'Your monthly Undercut report (sample)', report) : 'nothing followed';
		return json(out);
	}
	if (url.searchParams.get('watchtest')) {
		const { weeklyWatch } = await import('#lib/server/watch.ts');
		const html = await weeklyWatch(url.origin, true);
		return new Response(html || 'nothing watched', { headers: { 'content-type': 'text/html; charset=utf-8' } });
	}
	// dev only: sign in as a throwaway test account to check the dashboard
	if (url.searchParams.get('devlogin')) {
		const email = 'dev-test@getundercut.app';
		let ws = await lookupLogin(email);
		if (!ws) {
			ws = await createWorkspace('Dev test');
			await addLogin(email, ws);
		}
		await loadWorkspace(ws, true);
		await inWorkspace(ws, () => {
			if (!getAccount().email) saveAccount({ name: 'Dev test', email, language: 'en' });
			startSession(cookies, email, false);
		});
		redirect(303, '/app/analyses');
	}
	const rs = url.searchParams.get('refresh');
	if (rs) {
		const p = await getProduct(rs);
		if (!p) return json({ error: 'no product' });
		const a = structuredClone(p.analysis);
		a.themeNote = 'x'; // force the full regroup, the slowest case
		const t = Date.now();
		const b = await refresh(a);
		return json({ ms: Date.now() - t, note: b.themeNote ?? null, themes: b.themes.length, reviews: [b.main, ...b.competitors].reduce((s, x) => s + x.reviews.length, 0) });
	}
	const slug = url.searchParams.get('regroup');
	if (slug) {
		const p = await getProduct(slug);
		if (!p) return json({ error: 'no product' });
		const t = Date.now();
		const a = await regroup(structuredClone(p.analysis));
		if (url.searchParams.get('ideas')) {
			const t2 = Date.now();
			const ideas = await makeIdeas(a);
			return json({ groupMs: t2 - t, ideasMs: Date.now() - t2, error: ideas ? null : ideasError(), ideas });
		}
		return json({ ms: Date.now() - t, note: a.themeNote ?? null, themes: a.themes.map((x) => x.label), assigned: a.main.reviews.filter((r) => r.theme).length, total: a.main.reviews.length, raw: lastAiText().slice(0, 1500) });
	}
	const out: Record<string, unknown> = { model: env.ANTHROPIC_MODEL, reviewsModel: env.REVIEWS_MODEL ?? '(default claude-haiku-5-5)' };
	for (const model of [env.REVIEWS_MODEL || 'claude-haiku-5-5', env.ANTHROPIC_MODEL || 'claude-sonnet-5-5']) {
		const t = Date.now();
		try {
			const res = await fetch('https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: { 'x-api-key': env.ANTHROPIC_API_KEY ?? '', 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
				body: JSON.stringify({ model, max_tokens: 10, messages: [{ role: 'user', content: 'Say ok' }] })
			});
			out[model] = { status: res.status, ms: Date.now() - t, body: (await res.text()).slice(0, 200) };
		} catch (e) {
			out[model] = { error: (e as Error).message };
		}
	}
	let t = Date.now();
	try {
		out.listProducts = { n: (await listProducts()).length, ms: Date.now() - t };
	} catch (e) {
		out.listProducts = { error: (e as Error).message, ms: Date.now() - t };
	}
	t = Date.now();
	try {
		out.productsWithIdeas = { n: (await productsWithIdeas()).length, ms: Date.now() - t };
	} catch (e) {
		out.productsWithIdeas = { error: (e as Error).message, ms: Date.now() - t };
	}
	return json(out);
};
