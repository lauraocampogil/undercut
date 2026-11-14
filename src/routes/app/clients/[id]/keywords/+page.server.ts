import { fail } from '@sveltejs/kit';
import { getClient, hasApp, hasWeb } from '#lib/server/store.ts';
import { getIdeas, type Lang } from '#lib/server/ideas.ts';
import { appIdeas, appKeywords, getTracked, saveTracked, track, untrack, webKeywords } from '#lib/server/keywords.ts';

const LANGS: Lang[] = ['fr', 'nl', 'en', 'es'];
const GEOS = ['BE', 'FR', 'NL', 'LU', 'ES', 'GB', 'US'];

export const load = async ({ parent, url }) => {
	const { client } = await parent();
	const web = hasWeb(client);
	const app = hasApp(client);
	const mode: 'web' | 'app' = url.searchParams.get('mode') === 'app' && app ? 'app' : web ? 'web' : 'app';
	const days = [7, 28, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 28;
	const t = getTracked(client);
	const q = (url.searchParams.get('q') ?? '').trim();
	const base = { mode, web, app, q, lang: t.lang, geo: t.geo, langs: LANGS, geos: GEOS, days };
	if (mode === 'app') {
		const [kw, research] = await Promise.all([appKeywords(client), q ? appIdeas(q, client) : null]);
		return { ...base, appKw: kw, appResearch: research, webKw: null, ideas: null };
	}
	const [kw, ideas] = await Promise.all([webKeywords(client, days), q ? getIdeas(q, t.lang, t.geo) : null]);
	return { ...base, webKw: kw, ideas, appKw: null, appResearch: null };
};

const kindOf = (v: FormDataEntryValue | null) => (v === 'app' ? 'app' : 'web');

export const actions = {
	track: async ({ params, request }) => {
		const client = getClient(params.id);
		if (!client) return fail(404);
		const f = await request.formData();
		const words = String(f.get('keyword') ?? '').split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
		if (!words.length) return fail(400, { error: 'Type a keyword.' });
		for (const w of words) track(client, kindOf(f.get('kind')), w);
		return { tracked: words.length };
	},
	untrack: async ({ params, request }) => {
		const client = getClient(params.id);
		if (!client) return fail(404);
		const f = await request.formData();
		untrack(client, kindOf(f.get('kind')), String(f.get('keyword')));
		return { removed: true };
	},
	market: async ({ params, request }) => {
		const client = getClient(params.id);
		if (!client) return fail(404);
		const f = await request.formData();
		const t = getTracked(client);
		const lang = String(f.get('lang')) as Lang;
		const geo = String(f.get('geo'));
		if (LANGS.includes(lang)) t.lang = lang;
		if (GEOS.includes(geo)) t.geo = geo;
		saveTracked(client, t);
		return { market: true };
	}
};
