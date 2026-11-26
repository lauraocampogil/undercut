// Ideas from bad reviews: what is going wrong in a product (with the real reviews as proof), and what a founder
// could build or do about it, plus content/SEO angles. The proof (counts, quotes, links) comes from the data;
// only the ideas are written by AI.
import * as env from '$app/env/private';
import { messages } from './claude-api.ts';
import type { Analysis, Idea, ProductData, Review } from '#lib/review-types.ts';
import { count } from './reviewdb.ts';

let lastError = '';
export const ideasError = () => lastError;

async function ask(prompt: string): Promise<any | null> {
	if (!env.ANTHROPIC_API_KEY) return (lastError = 'ANTHROPIC_API_KEY is not set'), null;
	try {
		// the fast model first; the main model if this account doesn't have it
		let res = await messages(env.IDEAS_MODEL || 'claude-haiku-5-5', prompt, 3000, 60000);
		if (res.status === 404) res = await messages(env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', prompt, 3000, 60000);
		if (!res.ok) return (lastError = `Claude API ${res.status}: ${(await res.text()).slice(0, 200)}`), null;
		const j = await res.json();
		const t: string = (j.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
		if (!t) return (lastError = `no text (stop: ${j.stop_reason ?? '?'})`), null;
		const s = t.indexOf('[');
		const e = t.lastIndexOf(']');
		return JSON.parse(t.slice(s, e + 1));
	} catch (e) {
		lastError = (e as Error).message;
		return null;
	}
}

const share = (p: ProductData, themeId: string) => (p.reviews.length ? count(p, themeId) / p.reviews.length : 0);
const proof = (p: ProductData, themeId: string, n = 3): Idea['quotes'] =>
	p.reviews
		.filter((r: Review) => r.theme === themeId && r.text.length > 40 && (!r.stars || r.stars <= 3))
		.sort((x, y) => (x.stars || 3) - (y.stars || 3) || y.date.localeCompare(x.date))
		.slice(0, n)
		.map((r) => ({ text: r.text.slice(0, 280), stars: r.stars, source: r.source ?? 'appstore', url: r.url ?? '', date: r.date.slice(0, 10) }));

/** 3 to 5 ideas for the main product of an analysis. Returns null when the AI did not answer. */
export async function makeIdeas(a: Analysis, lang = 'English'): Promise<Idea[] | null> {
	const all = [a.main, ...a.competitors];
	const complaints = a.themes
		.filter((t) => t.type === 'complaint' && t.id !== 'complaints')
		.map((t) => ({ t, n: count(a.main, t.id), comp: a.competitors.map((c) => ({ name: c.app.name, share: Math.round(share(c, t.id) * 100) })) }))
		.filter((x) => x.n >= 2)
		.sort((x, y) => y.n - x.n)
		.slice(0, 6);
	if (!complaints.length) return (lastError = 'Not enough complaints to find ideas yet'), null;
	// numbered candidate reviews per topic, so the AI can point at the ones that really prove each idea
	const cands = new Map<string, Idea['quotes']>();
	const brief = complaints
		.map(({ t, n, comp }) => {
			const qs = proof(a.main, t.id, 6);
			cands.set(t.id, qs);
			const samples = qs.map((q, i) => `  [${i}] "${q.text.replace(/\s+/g, ' ').slice(0, 220)}"`).join('\n');
			return `TOPIC id=${t.id} "${t.label}": ${n} of ${a.main.reviews.length} reviews (${Math.round(share(a.main, t.id) * 100)}%). Competitors on the same topic: ${comp.map((c) => `${c.name} ${c.share}%`).join(', ')}\n${samples}`;
		})
		.join('\n\n');
	const prompt = `You help founders find product ideas in bad reviews. Product: ${a.main.app.name} (${a.main.app.genre}). Competitors: ${a.competitors.map((c) => c.app.name).join(', ')}.

Complaint topics from real public reviews, with sample reviews:

${brief}

Write 3 to 5 opportunities, the strongest first. Skip any topic whose sample reviews don't show a real problem. Each must come from one topic above (use its id) and be concrete and honest: don't invent numbers or facts that are not in the data. Write in ${lang}, plain and short.

Answer ONLY a JSON array, no other text:
[{"topic":"<topic id>","title":"<the opportunity in max 8 words>","problem":"<what users are suffering, 1-2 sentences, based on the reviews>","build":"<a product or feature a founder could build to solve it, 2 sentences>","improve":"<what ${a.main.app.name}'s own team could change, 1 sentence>","audience":"<who exactly has this problem>","seo":["<blog post or landing page title people would search>","<another>","<another>"],"keywords":["<search keyword>","<another>","<another>"],"strength":<1-5, how big and painful the problem looks in the data>,"proof":[<up to 3 numbers of the reviews above, from the same topic, that clearly show this exact problem>]}]`;
	const out = await ask(prompt);
	if (!Array.isArray(out)) return null;
	const byId = new Map(complaints.map((c) => [c.t.id, c]));
	const allComplaints = a.themes.filter((t) => t.type === 'complaint').reduce((sum, t) => sum + count(a.main, t.id), 0);
	return out
		.filter((x) => byId.has(x?.topic))
		.slice(0, 5)
		.map((x, i) => {
			const c = byId.get(x.topic)!;
			const mainShare = Math.round(share(a.main, c.t.id) * 100);
			// the competitor that does best on this topic, only when it really does better
			const comp = [...c.comp].sort((p, q) => p.share - q.share).filter((k) => k.share < mainShare);
			return {
				id: `${c.t.id}-${i}`,
				topic: c.t.id,
				topicLabel: c.t.label,
				product: a.main.app.name,
				title: String(x.title ?? '').slice(0, 90),
				problem: String(x.problem ?? '').slice(0, 400),
				build: String(x.build ?? '').slice(0, 500),
				improve: String(x.improve ?? '').slice(0, 300),
				audience: String(x.audience ?? '').slice(0, 200),
				seo: (Array.isArray(x.seo) ? x.seo : []).map(String).slice(0, 3),
				keywords: (Array.isArray(x.keywords) ? x.keywords : []).map(String).slice(0, 5),
				strength: Math.max(1, Math.min(5, Number(x.strength) || 3)),
				count: c.n,
				total: allComplaints,
				share: Math.round((c.n / Math.max(1, allComplaints)) * 100), // share of all complaints about the product,
				best: comp[0] ? { name: comp[0].name, share: comp[0].share, mine: mainShare } : null,
				quotes: (() => {
					const pool = cands.get(c.t.id) ?? [];
					const picked = (Array.isArray(x.proof) ? x.proof : []).map(Number).filter((k: number) => pool[k]).slice(0, 3).map((k: number) => pool[k]);
					return picked.length ? picked : pool.slice(0, 3);
				})()
			} satisfies Idea;
		});
}

// ---------- ideas for the whole database ----------
let dailyRun = '';
/** Once a day: find ideas for a few database products that don't have any yet (biggest complaint share first). */
export async function dailyIdeas(perDay = 5) {
	const day = new Date().toISOString().slice(0, 10);
	if (dailyRun === day || !env.ANTHROPIC_API_KEY) return;
	dailyRun = day;
	const { listProducts, productsWithIdeas, getProduct, saveIdeas } = await import('./public.ts');
	const have = new Set((await productsWithIdeas().catch(() => [])).map((p) => p.slug));
	const todo = (await listProducts())
		.filter((r) => !have.has(r.slug) && r.stats.reviews >= 30)
		.sort((a, b) => (b.stats.complaintRate ?? 0) - (a.stats.complaintRate ?? 0))
		.slice(0, perDay);
	for (const r of todo) {
		try {
			const p = await getProduct(r.slug);
			if (!p || p.analysis.themeNote) continue;
			const ideas = await makeIdeas(p.analysis);
			if (ideas?.length) await saveIdeas(r.slug, ideas);
		} catch (e) {
			console.warn('[ideas]', r.slug, (e as Error).message);
		}
	}
}

// ---------- the full analysis of one thing users want (made on first open, then cached on the report) ----------
import type { Insight } from '#lib/review-types.ts';
export async function makeInsight(a: Analysis, themeId: string, lang = 'en'): Promise<Insight | null> {
	const language = ({ en: 'English', fr: 'French', es: 'Spanish' } as Record<string, string>)[lang] ?? 'English';
	const t = a.themes.find((x) => x.id === themeId);
	if (!t) return null;
	const mine = a.main.reviews.filter((r) => r.theme === themeId);
	const others = a.competitors.map((c) => ({ name: c.app.name, n: count(c, themeId) }));
	const samples = [...mine, ...a.competitors.flatMap((c) => c.reviews.filter((r) => r.theme === themeId))].slice(0, 25);
	if (!samples.length) return (lastError = 'No reviews on this topic'), null;
	const prompt = `Product: ${a.main.app.name} (${a.main.app.genre}). What users ask for: "${t.label}". ${mine.length} reviews of ${a.main.app.name} ask for it; similar products: ${others.map((o) => `${o.name} ${o.n}`).join(', ')}.
Reviews:
${samples.map((r) => `- ${r.stars ? r.stars + '★ ' : ''}${r.date.slice(0, 7)} "${(r.title + ' ' + r.text).replace(/\s+/g, ' ').slice(0, 260)}"`).join('\n')}

Write a short, concrete analysis for a founder deciding what to improve in their own product. Write it in ${language}. Plain words, no hype, no invented numbers (use only the counts above). Answer ONLY JSON:
{"mean":["<what users concretely mean, 3 short bullets, max 18 words each>"],"todo":"<what to do in your product, 1-2 sentences>","why":"<why it matters (impact on churn, reviews, conversion), 1 sentence>","whyNow":"<why now, based on the review dates and counts, 1 sentence>","who":"<who exactly has this problem, 1 sentence>","pitch":"<a one-line marketing message a product that solves it could use>"}`;
	let res = await messages(env.IDEAS_MODEL || 'claude-haiku-5-5', prompt, 900, 45000);
	if (res.status === 404) res = await messages(env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', prompt, 900, 45000);
	if (!res.ok) return (lastError = `Claude API ${res.status}`), null;
	try {
		const txt: string = ((await res.json()).content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
		const j = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
		const s = (v: unknown, n = 300) => String(v ?? '').slice(0, n);
		return { mean: (Array.isArray(j.mean) ? j.mean : []).slice(0, 3).map((m: unknown) => s(m, 160)), todo: s(j.todo), why: s(j.why), whyNow: s(j.whyNow), who: s(j.who), pitch: s(j.pitch, 160), at: new Date().toISOString() };
	} catch {
		return (lastError = 'Claude answered something that is not valid JSON'), null;
	}
}

// ---------- how the similar product with fewer complaints does it (from its store page and its users' reviews) ----------
import type { How } from '#lib/review-types.ts';
import { storeDescription } from './reviewdb.ts';
export async function makeHow(a: Analysis, themeId: string, rivalName: string, lang = 'en'): Promise<How | null> {
	const language = ({ en: 'English', fr: 'French', es: 'Spanish' } as Record<string, string>)[lang] ?? 'English';
	const t = a.themes.find((x) => x.id === themeId);
	const rival = a.competitors.find((c) => c.app.name === rivalName);
	if (!t || !rival) return null;
	const desc = await storeDescription(rival.app);
	const good = rival.reviews.filter((r) => r.stars >= 4).slice(0, 60);
	const bad = rival.reviews.filter((r) => r.theme === themeId).slice(0, 15);
	const list = [...good, ...bad];
	const prompt = `Users of ${a.main.app.name} ask: "${t.label}" (${count(a.main, themeId)} reviews). ${rival.app.name} is a similar product with only ${count(rival, themeId)} complaints about it.

${rival.app.name}'s own store description:
"""${desc || '(none)'}"""

Reviews of ${rival.app.name} (id, stars, text):
${list.map((r) => `[${r.id}] ${r.stars}★ ${(r.title + ' ' + r.text).replace(/\s+/g, ' ').slice(0, 280)}`).join('\n')}

Explain to the founder of ${a.main.app.name} how ${rival.app.name} handles this, using ONLY the description and reviews above. Concrete (features, plan, price, design choices), no guessing. If the material says little about it, say so plainly and set "thin": true. Write in ${language}. Answer ONLY JSON:
{"points":["<2-4 short bullets, max 22 words each>"],"proof":["<ids of up to 3 reviews above that show it>"],"thin":false}`;
	let res = await messages(env.IDEAS_MODEL || 'claude-haiku-5-5', prompt, 700, 45000); // the fast, cheaper model
	if (res.status === 404) res = await messages(env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', prompt, 700, 60000);
	if (!res.ok) return (lastError = `Claude API ${res.status}`), null;
	try {
		const txt: string = ((await res.json()).content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
		const j = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
		const ids = new Set(list.map((r) => r.id));
		return {
			name: rival.app.name,
			points: (Array.isArray(j.points) ? j.points : []).slice(0, 4).map((p: unknown) => String(p).slice(0, 200)),
			proof: (Array.isArray(j.proof) ? j.proof : []).map(String).filter((id: string) => ids.has(id)).slice(0, 3),
			thin: Boolean(j.thin),
			at: new Date().toISOString()
		};
	} catch {
		return (lastError = 'Claude answered something that is not valid JSON'), null;
	}
}
