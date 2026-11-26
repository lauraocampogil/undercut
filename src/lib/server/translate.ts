// Show what users wrote in the dashboard's language. Translations are made once (fast model) and kept in the report.
import * as env from '$app/env/private';
import type { Analysis } from '#lib/review-types.ts';
import { messages, textOf } from './claude-api.ts';

const NAMES: Record<string, string> = { fr: 'French', es: 'Spanish' };
type Tr = { labels: Record<string, string>; texts: Record<string, { title: string; text: string }> };

/** Translate a list of short texts. Returns null when the AI is not available (the original texts are shown). */
export async function translateAll(items: string[], lang: string): Promise<string[] | null> {
	const language = NAMES[lang];
	if (!language || !items.length) return items;
	// chunks keep each answer small; they run at the same time
	const chunks: string[][] = [];
	for (let i = 0; i < items.length; i += 12) chunks.push(items.slice(i, i + 12));
	const parts = await Promise.all(chunks.map(async (chunk) => (await one(chunk, language)) ?? (await one(chunk, language))));
	return parts.some((p) => !p) ? null : parts.flat() as string[];
}

async function one(chunk: string[], language: string): Promise<string[] | null> {
	{
		const prompt = `Translate each string of this JSON array into ${language}. Natural, plain ${language}, same meaning and tone, keep product names. If a string is already in ${language}, return it unchanged. Answer ONLY with a JSON array of exactly ${chunk.length} strings, in the same order.\n\n${JSON.stringify(chunk)}`;
		try {
			const res = await messages(env.IDEAS_MODEL || 'claude-haiku-5-5', prompt, 6000, 60000);
			if (!res.ok) return null;
			const text = textOf(await res.json());
			const arr = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
			if (!Array.isArray(arr) || arr.length !== chunk.length) return null;
			return arr.map((s, k) => (typeof s === 'string' && s.trim() ? s : chunk[k]));
		} catch {
			return null;
		}
	}
}

const trOf = (a: Analysis, lang: string): Tr => {
	a.tr ??= {};
	return (a.tr[lang] ??= { labels: {}, texts: {} });
};

/** The labels of every topic in this language (translated once, then kept). */
export async function labelsFor(a: Analysis, lang: string, save: () => unknown): Promise<Record<string, string>> {
	if (!NAMES[lang]) return {};
	const tr = trOf(a, lang);
	const missing = a.themes.filter((t) => !tr.labels[t.id]);
	if (missing.length) {
		const done = await translateAll(missing.map((t) => t.label), lang);
		if (done) {
			missing.forEach((t, i) => (tr.labels[t.id] = done[i]));
			await save();
		}
	}
	return tr.labels;
}

/** Translate these reviews (title + text) if they are not yet. */
export async function translateReviews(a: Analysis, ids: string[], lang: string, save: () => unknown) {
	if (!NAMES[lang]) return true;
	const tr = trOf(a, lang);
	const all = [a.main, ...a.competitors].flatMap((p) => p.reviews);
	const todo = ids.filter((id) => !tr.texts[id]).map((id) => all.find((r) => r.id === id)).filter((r) => r != null);
	if (!todo.length) return true;
	const flat = todo.flatMap((r) => [r.title || '', r.text]);
	const done = await translateAll(flat, lang);
	if (!done) return false;
	todo.forEach((r, i) => (tr.texts[r.id] = { title: done[i * 2], text: done[i * 2 + 1] }));
	await save();
	return true;
}

/** The ranked list in this language: translated labels, and the short quote when its review was translated. */
export function localWants<W extends { list: { id: string; label: string; quote: string; quoteId: string }[] }>(w: W, a: Analysis, lang: string): W {
	if (!NAMES[lang]) return w;
	const labels = cachedLabels(a, lang);
	const texts = cachedTexts(a, lang);
	return { ...w, list: w.list.map((x) => ({ ...x, label: labels[x.id] ?? x.label, quote: labels[`q:${x.quoteId}`] ?? texts[x.quoteId]?.text.slice(0, 140) ?? x.quote })) };
}

/** Labels and list quotes of a report, translated (one short AI call the first time). */
export async function localize<W extends { list: { id: string; label: string; quote: string; quoteId: string }[] }>(w: W, a: Analysis, lang: string, save: () => unknown): Promise<W> {
	if (!NAMES[lang]) return w;
	const tr = trOf(a, lang);
	const want = [...a.themes.map((t) => [t.id, t.label]), ...w.list.filter((x) => x.quoteId && x.quote).map((x) => [`q:${x.quoteId}`, x.quote])].filter(([k]) => !tr.labels[k]);
	if (want.length) {
		const done = await translateAll(want.map(([, v]) => v), lang);
		if (done) {
			want.forEach(([k], i) => (tr.labels[k] = done[i]));
			await save();
		}
	}
	return localWants(w, a, lang);
}

/** Kept translations only (no AI call): for pages that list many reports. */
export const cachedLabels = (a: Analysis, lang: string) => a.tr?.[lang]?.labels ?? {};
export const cachedTexts = (a: Analysis, lang: string) => a.tr?.[lang]?.texts ?? {};

// short labels shown in lists (database table): translated once per server, kept in memory
const memo = new Map<string, string>();
export async function translateLabels(labels: string[], lang: string): Promise<Record<string, string>> {
	if (!NAMES[lang]) return {};
	const todo = [...new Set(labels)].filter((l) => l && !memo.has(`${lang}|${l}`));
	if (todo.length) {
		const done = await translateAll(todo, lang);
		if (done) todo.forEach((l, i) => memo.set(`${lang}|${l}`, done[i]));
	}
	return Object.fromEntries(labels.map((l) => [l, memo.get(`${lang}|${l}`) ?? l]));
}
