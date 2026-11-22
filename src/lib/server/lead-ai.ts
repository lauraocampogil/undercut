// The AI reviewer + writer for prospects (like the agents in "Harvey").
// 1) It checks our claims on the web first: does the business really have no website, no Instagram, no TikTok?
// 2) It drops leads that don't fit (closed, chain, big company, doesn't need the service).
// 3) It writes the first message in the business's language, around one real detail, with an easy "yes" (no call required).
// Only runs when ANTHROPIC_API_KEY is set, and only on the few best candidates of a search.
import * as env from '$app/env/private';

export type Review = { keep: boolean; reason: string; detail: string; subject: string; message: string; found: { website?: string; instagram?: string; tiktok?: string } };
type Lang = 'fr' | 'nl' | 'en';

const clean = (html: string) =>
	html
		.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;|&#160;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 3000);

export const aiReady = () => Boolean(env.ANTHROPIC_API_KEY);

export async function reviewLead(p: { name: string; category: string; city: string; address?: string; website?: string; issues: string[]; complaints?: string[]; html: string; agency: string; services: string[]; lang: Lang; optOut: string }): Promise<Review | null> {
	if (!env.ANTHROPIC_API_KEY) return null;
	const language = { fr: 'French', nl: 'Dutch', en: 'English' }[p.lang];
	const prompt = `You qualify one sales lead for a small digital agency, then write the first email. Use web search to CHECK the facts before writing.

Agency: ${p.agency}. It sells: ${p.services.join(', ')}.
Business: ${p.name} (${p.category}), ${p.address || p.city}. Website we know: ${p.website || 'none found on the map'}.
What our automatic checks think is missing or weak: ${p.issues.join('; ') || 'nothing'}.
${p.complaints?.length ? `What their own customers wrote in 1–3 star Google reviews (real quotes): ${p.complaints.map((c) => `"${c}"`).join(' / ')}\n` : ''}Text from their website (may be empty): """${clean(p.html)}"""

Steps:
1. Search the web for "${p.name} ${p.city}". Find their real website, Instagram and TikTok if they exist. A claim like "no website" or "no TikTok" is FALSE if you find one: never repeat a false claim. Also look at what customers say in their reviews (Google, TripAdvisor, Facebook): a low review about something the agency can fix (opening hours wrong or missing, can't book online, nobody answers the phone, website broken, no menu or prices online, photos that don't match, hard to find) is the strongest hook.
2. keep=false if: it is closed, a chain/franchise or a big company, not a local business, or its online presence is already good for what the agency sells (nothing real to improve).
3. Write the email in ${language}, 90–130 words, warm and human, no hype, no emojis, no clichés. Structure: one specific thing you noticed that is TRUE (from your search or their site; if a customer review mentions a fixable problem, open with it: "in your Google reviews, a customer mentions…", short quote of max 15 words or a paraphrase) → what it costs them in customers → what the agency does, in one line → an easy yes: offer to send 3 concrete ideas for free if they reply "yes" (in ${language}). Say they can also call or have you drop by if they prefer. Do NOT ask for a video call or a meeting. Never invent numbers, reviews or names. Never mention complaints about staff, food, prices, cleanliness or service quality, and never blame or shame the owner: only problems a website, booking, Google profile or social media can fix. Sign with "${p.agency}".
4. End the email with this line exactly: "${p.optOut}"

Answer with JSON only:
{"keep": true|false, "reason": "short, in English", "found": {"website": "url or empty", "instagram": "url or empty", "tiktok": "url or empty"}, "detail": "the true specific thing you noticed (in ${language})", "subject": "email subject in ${language}, max 60 characters, mentions the business name", "message": "the email in ${language}"}`;
	try {
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
			signal: AbortSignal.timeout(60000),
			body: JSON.stringify({
				model: env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
				max_tokens: 1200,
				tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2 }],
				messages: [{ role: 'user', content: prompt }]
			})
		});
		if (!res.ok) return null;
		const blocks: { type: string; text?: string }[] = (await res.json()).content ?? [];
		const t = blocks.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n');
		const j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
		if (typeof j.keep !== 'boolean' || typeof j.message !== 'string') return null;
		const url = (u: unknown) => (typeof u === 'string' && /^https?:\/\//.test(u) ? u.slice(0, 300) : undefined);
		return {
			keep: j.keep,
			reason: String(j.reason ?? '').slice(0, 200),
			detail: String(j.detail ?? '').slice(0, 240),
			subject: String(j.subject ?? '').slice(0, 90),
			message: j.message.slice(0, 2000),
			found: { website: url(j.found?.website), instagram: url(j.found?.instagram), tiktok: url(j.found?.tiktok) }
		};
	} catch {
		return null;
	}
}
