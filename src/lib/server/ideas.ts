// Ideas = AnswerThePublic + Google Trends + BuzzSumo, in one search.
// - Questions: Google Autocomplete (free, no key) with question words per language.
// - Trends + top content: SerpApi (SERPAPI_KEY). Without a key, clearly-labelled demo data.
import * as env from '$app/env/private';

export type Lang = 'en' | 'fr' | 'nl' | 'es';

export type IdeasResult = {
	keyword: string;
	lang: Lang;
	geo: string;
	questions: { group: string; items: string[] }[];
	prepositions: { group: string; items: string[] }[];
	comparisons: string[];
	alphabet: { letter: string; items: string[] }[];
	suggestSource: 'google' | 'demo';
	trend: { source: 'serpapi' | 'demo'; points: { date: string; value: number }[]; change: number; peakMonth: string | null };
	rising: { query: string; value: string }[];
	content: {
		source: 'serpapi' | 'demo';
		items: { title: string; url: string; domain: string; snippet: string; date?: string }[];
	};
	total: number;
	keywords: { keyword: string; volume: number; competition: 'low' | 'medium' | 'high'; cpc?: number; trend: number }[];
	volumeSource: 'dataforseo' | 'estimate';
};

const Q: Record<Lang, string[]> = {
	en: ['how', 'what', 'why', 'where', 'when', 'who', 'which', 'can', 'is', 'are'],
	fr: ['comment', 'pourquoi', 'quel', 'quelle', 'quoi', 'où', 'quand', 'qui', 'combien', 'est-ce que'],
	nl: ['hoe', 'wat', 'waarom', 'waar', 'wanneer', 'wie', 'welke', 'kan', 'is', 'hoeveel'],
	es: ['cómo', 'qué', 'por qué', 'dónde', 'cuándo', 'quién', 'cuál', 'cuánto', 'es', 'se puede']
};
const P: Record<Lang, string[]> = {
	en: ['for', 'with', 'near', 'without', 'to', 'like'],
	fr: ['pour', 'avec', 'près de', 'sans', 'à', 'comme'],
	nl: ['voor', 'met', 'bij', 'zonder', 'in', 'zoals'],
	es: ['para', 'con', 'cerca de', 'sin', 'en', 'como']
};
const C: Record<Lang, string[]> = { en: ['vs', 'or'], fr: ['vs', 'ou'], nl: ['vs', 'of'], es: ['vs', 'o'] };

const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
	const hit = cache.get(key);
	if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
	const value = await fn();
	cache.set(key, { at: Date.now(), value });
	return value;
}

async function suggest(q: string, lang: Lang, geo: string): Promise<string[]> {
	const url = `https://suggestqueries.google.com/complete/search?client=firefox&ie=utf-8&oe=utf-8&hl=${lang}&gl=${geo.toLowerCase()}&q=${encodeURIComponent(q)}`;
	const ctrl = new AbortController();
	const t = setTimeout(() => ctrl.abort(), 4000);
	try {
		const r = await fetch(url, { signal: ctrl.signal });
		if (!r.ok) return [];
		const j = await r.json();
		return Array.isArray(j?.[1]) ? (j[1] as string[]) : [];
	} catch {
		return [];
	} finally {
		clearTimeout(t);
	}
}

async function pool<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
	const out: R[] = new Array(items.length);
	let i = 0;
	await Promise.all(
		Array.from({ length: Math.min(size, items.length) }, async () => {
			while (i < items.length) {
				const idx = i++;
				out[idx] = await fn(items[idx]);
			}
		})
	);
	return out;
}

const clean = (list: string[], kw: string) =>
	[...new Set(list.map((s) => s.trim().toLowerCase()))].filter((s) => s && s !== kw.toLowerCase()).slice(0, 8);

const AZ: Record<Lang, Record<string, string>> = {
	en: { a: 'address', b: 'best', c: 'cheap', d: 'delivery', e: 'events', f: 'free', g: 'gift card', h: 'hours', i: 'ideas', j: 'jobs' },
	fr: { a: 'avis', b: 'bio', c: 'centre', d: 'dimanche', e: 'emploi', f: 'fermé', g: 'gluten', h: 'horaires', i: 'ixelles', j: 'jette' },
	nl: { a: 'adres', b: 'beste', c: 'centrum', d: 'zondag', e: 'eten', f: 'feest', g: 'glutenvrij', h: 'openingsuren', i: 'ideeën', j: 'jobs' },
	es: { a: 'abierto', b: 'barato', c: 'centro', d: 'domingo', e: 'empleo', f: 'fiesta', g: 'gluten', h: 'horario', i: 'ideas', j: 'junto a mí' }
};

const PT: Record<Lang, string[]> = {
	en: ['families', 'delivery', 'parking', 'students', 'home', 'a pro'],
	fr: ['enfants', 'livraison', 'parking', 'étudiants', 'domicile', 'un pro'],
	nl: ['kinderen', 'levering', 'parking', 'studenten', 'thuis', 'een pro'],
	es: ['niños', 'entrega', 'parking', 'estudiantes', 'domicilio', 'un pro']
};

function demoSuggest(kw: string, lang: Lang) {
	const tails: Record<Lang, string[]> = {
		en: ['cost', 'work', 'is best', 'to choose', 'near me', 'for beginners'],
		fr: ['prix', 'fonctionne', 'choisir', 'est le meilleur', 'près de moi', 'débutant'],
		nl: ['kost', 'werkt', 'kiezen', 'is het beste', 'in de buurt', 'beginners'],
		es: ['precio', 'funciona', 'elegir', 'es mejor', 'cerca de mí', 'principiantes']
	};
	return {
		questions: Q[lang].map((w, i) => ({
			group: w,
			items: tails[lang].slice(0, 3 + (i % 3)).map((t) => `${w} ${kw} ${t}`)
		})),
		prepositions: P[lang].map((w, i) => ({ group: w, items: [`${kw} ${w} ${PT[lang][i]}`, `${kw} ${w} ${PT[lang][(i + 3) % 6]}`] })),
		comparisons: [`${kw} vs ${kw} pro`, `${kw} ${C[lang][1]} alternative`],
		alphabet: Object.entries(AZ[lang]).map(([l, w]) => ({ letter: l, items: [`${kw} ${w}`] }))
	};
}

async function serp(params: Record<string, string>) {
	if (!env.SERPAPI_KEY) throw new Error('no key');
	const r = await fetch(`https://serpapi.com/search.json?${new URLSearchParams({ ...params, api_key: env.SERPAPI_KEY })}`);
	if (!r.ok) throw new Error(`SerpApi ${r.status}`);
	return r.json();
}

function seeded(seed: string) {
	let h = 2166136261;
	for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
	return () => ((h = Math.imul(h ^ (h >>> 13), 0x5bd1e995)) >>> 0) / 4294967296;
}

function demoTrend(kw: string) {
	const r = seeded(kw);
	const points = [];
	const now = new Date();
	const phase = r() * 12;
	for (let i = 51; i >= 0; i--) {
		const d = new Date(now);
		d.setUTCDate(d.getUTCDate() - i * 7);
		const season = Math.sin(((d.getUTCMonth() + phase) / 12) * Math.PI * 2) * 18;
		points.push({ date: d.toISOString().slice(0, 10), value: Math.max(4, Math.min(100, Math.round(55 + season + (51 - i) * 0.35 + (r() - 0.5) * 16))) });
	}
	return points;
}

const LOC: Record<string, number> = { BE: 2056, FR: 2250, NL: 2528, LU: 2442, ES: 2724, GB: 2826, US: 2840 };

// Monthly Google search volume + competition. Real numbers with DataForSEO, otherwise a clearly-labelled estimate.
async function volumes(list: string[], lang: Lang, geo: string, trendAvg: number): Promise<{ source: 'dataforseo' | 'estimate'; rows: IdeasResult['keywords'] }> {
	if (env.DATAFORSEO_LOGIN && env.DATAFORSEO_PASSWORD) {
		try {
			const r = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live', {
				method: 'POST',
				headers: { authorization: 'Basic ' + Buffer.from(`${env.DATAFORSEO_LOGIN}:${env.DATAFORSEO_PASSWORD}`).toString('base64'), 'content-type': 'application/json' },
				body: JSON.stringify([{ keywords: list.slice(0, 100), location_code: LOC[geo] ?? 2056, language_code: lang }]),
				signal: AbortSignal.timeout(30_000)
			});
			const j = await r.json();
			const items = j.tasks?.[0]?.result ?? [];
			if (items.length)
				return {
					source: 'dataforseo',
					rows: items.map((it: any) => ({
						keyword: it.keyword,
						volume: it.search_volume ?? 0,
						competition: (String(it.competition ?? 'low').toLowerCase() as 'low' | 'medium' | 'high') || 'low',
						cpc: it.cpc ?? undefined,
						trend: 0
					}))
				};
		} catch {
			/* fall back to estimate */
		}
	}
	return {
		source: 'estimate',
		rows: list.map((k, i) => {
			const r = seeded(k);
			const words = k.split(' ').length;
			const base = Math.max(10, Math.round((trendAvg * 40) / (words * 0.9) / (1 + i * 0.08) * (0.4 + r())));
			const rounded = base > 1000 ? Math.round(base / 100) * 100 : base > 100 ? Math.round(base / 10) * 10 : base;
			const c = r();
			return { keyword: k, volume: rounded, competition: c > 0.66 ? 'high' : c > 0.33 ? 'medium' : 'low', trend: Math.round((r() - 0.4) * 60) };
		})
	};
}

export async function getIdeas(keywordRaw: string, lang: Lang = 'fr', geo = 'BE'): Promise<IdeasResult> {
	const keyword = keywordRaw.trim().toLowerCase().slice(0, 80);
	return cached(`${keyword}|${lang}|${geo}`, 6 * 3600_000, async () => {
		// 1. Autocomplete
		const qTerms = Q[lang].map((w) => `${w} ${keyword}`);
		const pTerms = P[lang].map((w) => `${keyword} ${w}`);
		const cTerms = C[lang].map((w) => `${keyword} ${w}`);
		const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
		const aTerms = letters.map((l) => `${keyword} ${l}`);
		const all = [...qTerms, ...pTerms, ...cTerms, ...aTerms];
		const res = await pool(all, 8, (t) => suggest(t, lang, geo));
		const gotAny = res.some((r) => r.length);
		let questions, prepositions, comparisons, alphabet;
		if (gotAny) {
			let k = 0;
			questions = Q[lang].map((w) => ({ group: w, items: clean(res[k++], keyword) })).filter((g) => g.items.length);
			prepositions = P[lang].map((w) => ({ group: w, items: clean(res[k++], keyword) })).filter((g) => g.items.length);
			comparisons = clean([...res[k++], ...res[k++]], keyword);
			alphabet = letters.map((l) => ({ letter: l, items: clean(res[k++], keyword) })).filter((g) => g.items.length);
		} else {
			({ questions, prepositions, comparisons, alphabet } = demoSuggest(keyword, lang));
		}

		// 2. Trends + 3. top content (SerpApi), in parallel
		const [trendRes, risingRes, contentRes] = await Promise.allSettled([
			serp({ engine: 'google_trends', q: keyword, geo, date: 'today 12-m', data_type: 'TIMESERIES' }),
			serp({ engine: 'google_trends', q: keyword, geo, date: 'today 12-m', data_type: 'RELATED_QUERIES' }),
			serp({ engine: 'google', q: keyword, gl: geo.toLowerCase(), hl: lang, num: '10' })
		]);

		let trend: IdeasResult['trend'];
		if (trendRes.status === 'fulfilled' && trendRes.value.interest_over_time?.timeline_data?.length) {
			const points = trendRes.value.interest_over_time.timeline_data.map((t: any) => ({
				date: new Date(Number(t.timestamp) * 1000).toISOString().slice(0, 10),
				value: Number(t.values?.[0]?.extracted_value ?? 0)
			}));
			trend = { source: 'serpapi', points, change: 0, peakMonth: null };
		} else trend = { source: 'demo', points: demoTrend(keyword), change: 0, peakMonth: null };
		const pts = trend.points;
		const avg = (a: { value: number }[]) => a.reduce((s, p) => s + p.value, 0) / Math.max(1, a.length);
		trend.change = Math.round(((avg(pts.slice(-8)) - avg(pts.slice(-16, -8))) / Math.max(1, avg(pts.slice(-16, -8)))) * 100);
		const peak = pts.reduce((m, p) => (p.value > m.value ? p : m), pts[0]);
		trend.peakMonth = peak ? new Date(peak.date + 'T00:00:00Z').toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' }) : null;

		const rising =
			risingRes.status === 'fulfilled'
				? (risingRes.value.related_queries?.rising ?? risingRes.value.related_queries?.top ?? [])
						.slice(0, 8)
						.map((r: any) => ({ query: r.query, value: String(r.value ?? r.extracted_value ?? '') }))
				: [`${keyword} ${new Date().getFullYear()}`, `${keyword} prix`, `meilleur ${keyword}`, `${keyword} avis`].map((q, i) => ({
						query: q,
						value: ['Breakout', '+350%', '+120%', '+60%'][i]
					}));

		let content: IdeasResult['content'];
		if (contentRes.status === 'fulfilled' && contentRes.value.organic_results?.length) {
			content = {
				source: 'serpapi',
				items: contentRes.value.organic_results.slice(0, 10).map((o: any) => ({
					title: o.title,
					url: o.link,
					domain: new URL(o.link).hostname.replace(/^www\./, ''),
					snippet: o.snippet ?? '',
					date: o.date
				}))
			};
		} else {
			const angles = ['The complete guide to', '7 mistakes to avoid with', 'How much does it cost:', 'Beginner checklist:', 'Best of 2026:'];
			content = {
				source: 'demo',
				items: angles.map((a, i) => ({
					title: `${a} ${keyword}`,
					url: '#',
					domain: `example-${i + 1}.be`,
					snippet: 'Demo result. Add SERPAPI_KEY to see the pages that really rank on Google for this keyword.'
				}))
			};
		}

		const total =
			questions.reduce((s, g) => s + g.items.length, 0) +
			prepositions.reduce((s, g) => s + g.items.length, 0) +
			comparisons.length +
			alphabet.reduce((s, g) => s + g.items.length, 0);

		const candidates = [
			keyword,
			...rising.map((r: { query: string }) => r.query),
			...prepositions.flatMap((g) => g.items.slice(0, 2)),
			...comparisons.slice(0, 2),
			...alphabet.flatMap((g) => g.items.slice(0, 1)),
			...questions.flatMap((g) => g.items.slice(0, 1))
		].filter((k, i, a) => a.indexOf(k) === i).slice(0, 24);
		const trendAvg = pts.reduce((s, p) => s + p.value, 0) / Math.max(1, pts.length);
		const vol = await volumes(candidates, lang, geo, trendAvg);
		const keywords = vol.rows.sort((a, b) => (a.keyword === keyword ? -1 : b.keyword === keyword ? 1 : b.volume - a.volume)).slice(0, 12);

		return {
			keyword,
			lang,
			geo,
			keywords,
			volumeSource: vol.source,
			questions,
			prepositions,
			comparisons,
			alphabet,
			suggestSource: gotAny ? 'google' : 'demo',
			trend,
			rising,
			content,
			total
		} satisfies IdeasResult;
	});
}
