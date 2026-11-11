import { fail, redirect } from '@sveltejs/kit';
import { getClient, saveClient, slugify } from '#lib/server/store.ts';
import { normaliseSite } from '#lib/server/sitemap.ts';

const COLORS = ['#E0A458', '#3E8E63', '#4C7DD9', '#D9534C', '#8B5CF6', '#0EA5A4', '#F97316'];

export const actions = {
	default: async ({ request }) => {
		const f = await request.formData();
		const name = String(f.get('name') ?? '').trim();
		const domainRaw = String(f.get('domain') ?? '').trim();
		if (!name || !domainRaw) return fail(400, { name, domain: domainRaw, error: 'Name and website are required.' });
		let domain: string;
		try {
			domain = normaliseSite(domainRaw);
		} catch {
			return fail(400, { name, domain: domainRaw, error: 'That website address does not look valid.' });
		}
		let id = slugify(name);
		while (getClient(id)) id += '-2';
		saveClient({
			id,
			name,
			domain,
			color: String(f.get('color') || COLORS[Math.floor(Math.random() * COLORS.length)]),
			createdAt: new Date().toISOString().slice(0, 10),
			google: {}
		});
		redirect(303, `/app/clients/${id}/settings?new=1`);
	}
};
