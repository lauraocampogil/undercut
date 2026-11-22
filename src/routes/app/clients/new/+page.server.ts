import { fail, redirect } from '@sveltejs/kit';
import { getClient, saveClient, slugify, newClientId } from '#lib/server/store.ts';
import { normaliseSite } from '#lib/server/sitemap.ts';
import { getBiz, saveClient as saveBizClient } from '#lib/server/business.ts';

const COLORS = ['#E0A458', '#3E8E63', '#4C7DD9', '#D9534C', '#8B5CF6', '#0EA5A4', '#F97316'];

export const actions = {
	default: async ({ request }) => {
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
		saveClient({
			id,
			name,
			domain,
			color: String(f.get('color') || COLORS[Math.floor(Math.random() * COLORS.length)]),
			createdAt: new Date().toISOString().slice(0, 10),
			type,
			app: type !== 'web' ? { name } : undefined,
			google: {}
		});
		// the same client in Clients: link the record it came from, or create one
		const crm = String(f.get('crm') ?? '');
		const existing = getBiz().clients.find((c) => c.id === crm);
		if (existing) saveBizClient({ ...existing, siteId: id, website: existing.website || domain || undefined });
		else saveBizClient({ name, website: domain || undefined, siteId: id, services: [] });
		redirect(303, `/app/clients/${id}/settings?new=1`);
	}
};
