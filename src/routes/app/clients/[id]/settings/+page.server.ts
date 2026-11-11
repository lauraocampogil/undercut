import { error, redirect } from '@sveltejs/kit';
import * as env from '$app/env/private';
import { deleteClient, getClient, saveClient } from '#lib/server/store.ts';
import { googleConfigured, isConnected, listAccounts } from '#lib/server/google.ts';
import { normaliseSite } from '#lib/server/sitemap.ts';
import { getHeatmap } from '#lib/server/tracking.ts';

export const load = async ({ params, url }) => {
	const client = getClient(params.id);
	if (!client) error(404, 'Client not found');
	const connected = isConnected() && googleConfigured();
	const options = connected ? await listAccounts() : null;
	const base = env.PUBLIC_BASE_URL || url.origin;
	// Auto-match: pre-select the Google properties that look like this client (domain / name)
	const host = client.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase();
	const words = client.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
	const guess = (list: { value: string; label: string }[] = []) =>
		list.find((o) => host && (o.value + o.label).toLowerCase().includes(host))?.value ??
		list.find((o) => words.some((w) => o.label.toLowerCase().includes(w)))?.value;
	const suggested = options
		? { ga4: guess(options.ga4), gsc: guess(options.gsc), gbp: guess(options.gbp), gtm: guess(options.gtm) }
		: { ga4: undefined, gsc: undefined, gbp: undefined, gtm: undefined };
	return {
		connected,
		options,
		suggested,
		snippet: `<script defer src="${base}/u.js" data-site="${client.id}"></script>`,
		trackingInstalled: getHeatmap(client).installed
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
		client.google = { ga4PropertyId: v('ga4'), gscSiteUrl: v('gsc'), gbpLocation: v('gbp'), gtmContainer: v('gtm') };
		saveClient(client);
		redirect(303, `/app/clients/${client.id}`);
	},
	delete: async ({ params }) => {
		deleteClient(params.id);
		redirect(303, '/app');
	}
};
