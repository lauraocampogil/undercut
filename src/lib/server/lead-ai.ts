// The AI reviewer + writer for prospects (like the agents in "Harvey"): it reads what we found on each business,
// drops the ones that don't fit, and writes a first message around one real detail of that business.
// Only runs when ANTHROPIC_API_KEY is set, and only on the few best candidates of a search (cost stays at a few cents).
import * as env from '$app/env/private';

export type Review = { keep: boolean; reason: string; detail: string; message: string };
type Lang = 'fr' | 'nl' | 'en';

const clean = (html: string) =>
	html
		.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;|&#160;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 3500);

export const aiReady = () => Boolean(env.ANTHROPIC_API_KEY);

export async function reviewLead(p: { name: string; category: string; city: string; website?: string; issues: string[]; html: string; agency: string; services: string[]; lang: Lang; optOut: string }): Promise<Review | null> {
	if (!env.ANTHROPIC_API_KEY) return null;
	const language = { fr: 'French', nl: 'Dutch', en: 'English' }[p.lang];
	const prompt = `You review one sales lead for a small digital agency and write the first message. Answer with JSON only:
{"keep": true|false, "reason": "one short sentence in English", "detail": "the one specific, real thing you noticed (in ${language})", "message": "the email in ${language}"}

Agency: ${p.agency}. It sells: ${p.services.join(', ')}.
Business: ${p.name} (${p.category}) in ${p.city}. Website: ${p.website || 'none'}.
Problems our checks found: ${p.issues.join('; ') || 'none'}.
Text from their website (may be empty): """${clean(p.html)}"""

Rules:
- keep=false if it looks closed, is a chain/franchise or a big company, is not a local business, or clearly does not need what the agency sells.
- The message: 70–110 words, plain and human, no hype, no emojis, no "I hope this finds you well". Start with "Bonjour"/"Hallo"/"Hi" and the business name.
- Mention ONE concrete detail that only this business would recognise (from their site text or the problems above). Never invent facts, numbers, reviews or names not given here.
- Offer a short call or to show what you would change. Sign with the agency name.
- End with this line exactly: "${p.optOut}"`;
	try {
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
			signal: AbortSignal.timeout(25000),
			body: JSON.stringify({ model: env.ANTHROPIC_MODEL || 'claude-sonnet-4-5', max_tokens: 500, messages: [{ role: 'user', content: prompt }] })
		});
		if (!res.ok) return null;
		const t: string = (await res.json()).content?.[0]?.text ?? '';
		const j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
		if (typeof j.keep !== 'boolean' || typeof j.message !== 'string') return null;
		return { keep: j.keep, reason: String(j.reason ?? '').slice(0, 200), detail: String(j.detail ?? '').slice(0, 200), message: j.message.slice(0, 1500) };
	} catch {
		return null;
	}
}
