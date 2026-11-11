import { fail } from '@sveltejs/kit';
import { analyseSitemap } from '#lib/server/sitemap.ts';

export const actions = {
	default: async ({ request }) => {
		const site = String((await request.formData()).get('site') ?? '').trim();
		if (!site) return fail(400, { site, error: 'Type a website address.' });
		try {
			return { site, report: await analyseSitemap(site) };
		} catch {
			return fail(400, { site, error: 'That website address does not look valid.' });
		}
	}
};
