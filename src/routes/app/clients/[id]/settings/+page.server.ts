import { error, redirect } from '@sveltejs/kit';
import * as env from '$app/env/private';
import { deleteClient, getClient, saveClient } from '#lib/server/store.ts';
import { canManage, createGa4, createGtm, googleConfigured, gscVerificationToken, gscVerifyAndAdd, isConnected, listAccounts, matchProperties } from '#lib/server/google.ts';
import { fail } from '@sveltejs/kit';
import { normaliseSite } from '#lib/server/sitemap.ts';
import { getHeatmap } from '#lib/server/tracking.ts';

export const load = async ({ params, url }) => {
	const client = getClient(params.id);
	if (!client) error(404, 'Client not found');
	const connected = isConnected() && googleConfigured();
	const options = connected ? await listAccounts() : null;
	const base = env.PUBLIC_BASE_URL || url.origin;
	const m = options ? matchProperties(client, options) : null;
	const suggested = { ga4: m?.ga4?.value, gsc: m?.gsc?.value, gbp: m?.gbp?.value, gtm: m?.gtm?.value };
	return {
		connected,
		options,
		suggested,
		snippet: `<script defer src="${base}/u.js" data-site="${client.id}"></script>`,
		trackingInstalled: getHeatmap(client).installed,
		canManage: canManage()
	};
};

export const actions = {
	save: async ({ params, request }) => {
		const client = getClient(params.id);
		if (!client) error(404);
		const f = await request.formData();
		const v = (k: string) => String(f.get(k) ?? '').trim() || undefined;
		client.name = v('name') ?? client.name;
		client.color = v('color') ?? client.color;
		const type = v('type');
		if (type === 'web' || type === 'app' || type === 'both') client.type = type;
		if (v('domain')) {
			try {
				client.domain = normaliseSite(v('domain')!);
			} catch {
				/* keep old */
			}
		}
		client.app = { name: v('appName'), iosId: v('iosId')?.replace(/\D/g, ''), androidPackage: v('androidPackage') };
		client.google = { ...client.google, ga4PropertyId: v('ga4'), gscSiteUrl: v('gsc'), gbpLocation: v('gbp'), gtmContainer: v('gtm'), loadGtm: f.get('loadGtm') === 'on', autoLinkedAt: client.google.autoLinkedAt ?? new Date().toISOString() };
		saveClient(client);
		redirect(303, `/app/clients/${client.id}`);
	},
	createGa4: async ({ params, url }) => {
		const client = getClient(params.id);
		if (!client) error(404);
		if (!canManage()) redirect(303, manageUrl(url, client.id));
		try {
			const r = await createGa4(client);
			client.google = { ...client.google, ga4PropertyId: r.property, measurementId: r.measurementId };
			saveClient(client);
			return { created: 'ga4', measurementId: r.measurementId };
		} catch (e) {
			return fail(400, { createError: explain(e, 'ga4') });
		}
	},
	createGtm: async ({ params, url }) => {
		const client = getClient(params.id);
		if (!client) error(404);
		if (!canManage()) redirect(303, manageUrl(url, client.id));
		try {
			const r = await createGtm(client, client.google.measurementId);
			client.google = { ...client.google, gtmContainer: r.container, gtmPublicId: r.publicId, loadGtm: true };
			saveClient(client);
			return { created: 'gtm', publicId: r.publicId, published: r.published };
		} catch (e) {
			return fail(400, { createError: explain(e, 'gtm') });
		}
	},
	gscToken: async ({ params, request, url }) => {
		const client = getClient(params.id);
		if (!client) error(404);
		if (!canManage()) redirect(303, manageUrl(url, client.id));
		const method = String((await request.formData()).get('method')) === 'DNS_TXT' ? 'DNS_TXT' : 'META';
		try {
			const t = await gscVerificationToken(client, method);
			return { gsc: { method, token: t.token, host: client.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '') } };
		} catch (e) {
			return fail(400, { createError: explain(e, 'gsc') });
		}
	},
	gscVerify: async ({ params, request, url }) => {
		const client = getClient(params.id);
		if (!client) error(404);
		if (!canManage()) redirect(303, manageUrl(url, client.id));
		const fd = await request.formData();
		const m = String(fd.get('method'));
		const method = (['META', 'DNS_TXT', 'TAG_MANAGER', 'ANALYTICS'].includes(m) ? m : 'META') as 'META' | 'DNS_TXT' | 'TAG_MANAGER' | 'ANALYTICS';
		try {
			const id = await gscVerifyAndAdd(client, method);
			client.google = { ...client.google, gscSiteUrl: id };
			saveClient(client);
			return { created: 'gsc', gscId: id };
		} catch (e) {
			return fail(400, { createError: explain(e, 'gsc'), gsc: { method, token: String(fd.get('token') ?? ''), host: String(fd.get('host') ?? '') } });
		}
	},
	delete: async ({ params }) => {
		deleteClient(params.id);
		redirect(303, '/app');
	}
};

const manageUrl = (url: URL, id: string) => `/auth/google?mode=manage&next=${encodeURIComponent(`/app/clients/${id}/settings`)}`;

function explain(e: unknown, what: 'ga4' | 'gtm' | 'gsc') {
	const msg = (e as Error).message ?? String(e);
	if (msg === 'NO_GA_ACCOUNT') return 'Your Google account has no Analytics account yet. Create one (free, 1 minute) at analytics.google.com → then click Create again: https://analytics.google.com/analytics/web/#/provision';
	if (msg === 'NO_GTM_ACCOUNT') return 'Your Google account has no Tag Manager account yet. Create one (free) at tagmanager.google.com → then click Create again: https://tagmanager.google.com/#/admin/accounts/create';
	if (what === 'gsc' && /verif/i.test(msg)) return 'Google could not find the verification yet. Check the tag / DNS record is live (DNS can take up to an hour), then try again.';
	return msg;
}
