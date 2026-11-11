import { getIdeas, type Lang } from '#lib/server/ideas.ts';
import { getClient } from '#lib/server/store.ts';
import { demoMetrics } from '#lib/server/demo.ts';
import { getSearchConsole } from '#lib/server/google.ts';

const LANGS: Lang[] = ['fr', 'nl', 'en', 'es'];
const GEOS = ['BE', 'FR', 'NL', 'LU', 'ES', 'GB', 'US'];

export const load = async ({ url }) => {
	const q = (url.searchParams.get('q') ?? '').trim();
	const lang = (LANGS.includes(url.searchParams.get('lang') as Lang) ? url.searchParams.get('lang') : 'fr') as Lang;
	const geo = GEOS.includes(url.searchParams.get('geo') ?? '') ? url.searchParams.get('geo')! : 'BE';
	const client = getClient(url.searchParams.get('client') ?? '');
	// Seed ideas from the client's own Google searches
	const seeds = client ? demoMetrics(client).search.queries.slice(0, 5).map((x) => x.query) : ['boulangerie bruxelles', 'kiné', 'architecte rénovation', 'site web restaurant', 'vélo électrique'];
	const ideas = q ? await getIdeas(q, lang, geo) : null;
	// Where does the selected client already rank for these keywords? (Search Console)
	let positions: Record<string, number> = {};
	if (ideas && client) {
		const gsc = await getSearchConsole(client).catch(() => null);
		for (const k of ideas.keywords) {
			const hit = gsc?.queries.find((x) => x.key === k.keyword) ?? gsc?.queries.find((x) => x.key.includes(k.keyword));
			if (hit) positions[k.keyword] = hit.position;
		}
	}
	return { q, lang, geo, langs: LANGS, geos: GEOS, client: client ? { id: client.id, name: client.name } : null, seeds, ideas, positions };
};
