import { fail, redirect } from '@sveltejs/kit';
import * as env from '$app/env/private';
import { getAccount, getAgency, getClient, saveClient, slugify, newClientId } from '#lib/server/store.ts';
import { normaliseSite } from '#lib/server/sitemap.ts';
import { googleConfigured, isConnected, listAccounts, matchProperties, type Option } from '#lib/server/google.ts';
import { getHeatmap } from '#lib/server/tracking.ts';

const COLORS = ['#E0A458', '#3E8E63', '#4C7DD9', '#D9534C', '#8B5CF6', '#0EA5A4', '#F97316'];

export const load = async ({ url }) => {
	const step = Math.min(4, Math.max(1, Number(url.searchParams.get('step') ?? 1) || 1));
	const client = url.searchParams.get('client') ? getClient(url.searchParams.get('client')!) : undefined;
	if (step > 1 && !client) redirect(303, '/onboarding');
	const configured = googleConfigured();
	const connected = configured && isConnected();
	let matches: { key: string; label: string; option: Option | undefined }[] = [];
	let googleErrors: string[] = [];
	if (step === 2 && client && connected) {
		try {
			const o = await listAccounts();
			googleErrors = o.errors;
			const mm = matchProperties(client, o);
			matches = [
				{ key: 'ga4', label: 'Google Analytics', option: mm.ga4 },
				{ key: 'gsc', label: 'Search Console', option: mm.gsc },
				{ key: 'gbp', label: 'Business Profile', option: mm.gbp },
				{ key: 'gtm', label: 'Tag Manager', option: mm.gtm }
			];
		} catch {
			/* show the connect button again */
		}
	}
	const base = env.PUBLIC_BASE_URL || url.origin;
	return {
		step,
		account: { name: getAccount().name },
		agency: getAgency().name,
		client: client ? { id: client.id, name: client.name, domain: client.domain, type: client.type ?? 'web', google: client.google } : null,
		google: { configured, connected, error: url.searchParams.get('error'), ok: url.searchParams.has('ok') },
		matches,
		googleErrors,
		snippet: client ? `<script defer src="${base}/u.js" data-site="${client.id}"></script>` : '',
		installed: client ? getHeatmap(client).installed : false
	};
};

export const actions = {
	client: async ({ request }) => {
		const f = await request.formData();
		const name = String(f.get('name') ?? '').trim();
		const domainRaw = String(f.get('domain') ?? '').trim();
		const t = String(f.get('type') ?? 'web');
		const type = (['web', 'app', 'both'].includes(t) ? t : 'web') as 'web' | 'app' | 'both';
		if (!name) return fail(400, { name, domain: domainRaw, error: 'Give the client a name.' });
		if (type !== 'app' && !domainRaw) return fail(400, { name, domain: domainRaw, error: 'Add the website address.' });
		let domain = '';
		if (domainRaw) {
			try {
				domain = normaliseSite(domainRaw);
			} catch {
				return fail(400, { name, domain: domainRaw, error: 'That website address does not look valid.' });
			}
		}
		const id = newClientId(name);
		saveClient({ id, name, domain, color: COLORS[Math.floor(Math.random() * COLORS.length)], createdAt: new Date().toISOString().slice(0, 10), type, app: type !== 'web' ? { name } : undefined, google: {} });
		redirect(303, `/onboarding?step=2&client=${id}`);
	},
	link: async ({ request }) => {
		const f = await request.formData();
		const client = getClient(String(f.get('client')));
		if (!client) return fail(404);
		const v = (k: string) => String(f.get(k) ?? '').trim() || undefined;
		client.google = { ...client.google, ga4PropertyId: v('ga4'), gscSiteUrl: v('gsc'), gbpLocation: v('gbp'), gtmContainer: v('gtm'), autoLinkedAt: new Date().toISOString() };
		saveClient(client);
		redirect(303, `/onboarding?step=${client.type === 'app' ? 4 : 3}&client=${client.id}`);
	},
	check: async ({ request }) => {
		const f = await request.formData();
		const client = getClient(String(f.get('client')));
		if (!client) return fail(404);
		if (getHeatmap(client).installed) return { check: 'ok' as const };
		if (!client.domain) return { check: 'missing' as const };
		try {
			const res = await fetch(client.domain, { signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'UndercutBot/1.0 (+install check)' } });
			const html = await res.text();
			const found = /\/u\.js/.test(html) && new RegExp(`data-site=["']?${client.id}["'\\s>]`).test(html);
			return { check: found ? ('ok' as const) : ('missing' as const) };
		} catch {
			return { check: 'unreachable' as const };
		}
	}
};
