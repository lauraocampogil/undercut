// Free public tool: paste your agency URL → 5 real local businesses that need what you sell.
// Rate-limited per IP (in memory) so the map services stay friendly.
import { fail } from '@sveltejs/kit';
import { profileFromUrl, type AgencyProfile, type Service } from '#lib/server/agency-profile.ts';
import { findProspects } from '#lib/server/prospects.ts';

const PER_DAY = 5;
const hits = new Map<string, number[]>();
function allow(ip: string) {
	const now = Date.now();
	const list = (hits.get(ip) ?? []).filter((t) => now - t < 864e5);
	if (list.length >= PER_DAY) return false;
	list.push(now);
	hits.set(ip, list);
	if (hits.size > 5000) hits.clear();
	return true;
}
const SERVICES: Service[] = ['web', 'app', 'social', 'seo', 'branding', 'ads', 'video'];

export const load = ({ url }) => ({ url: url.searchParams.get('url') ?? '' });

export const actions = {
	default: async ({ request, getClientAddress }) => {
		const f = await request.formData();
		const raw = String(f.get('url') ?? '').trim();
		const city = String(f.get('city') ?? '').trim().slice(0, 60);
		const picked = f.getAll('services').map(String).filter((s): s is Service => SERVICES.includes(s as Service));
		if (!raw) return fail(400, { error: 'Paste your agency’s website, Instagram, TikTok or LinkedIn.', url: raw });
		if (!allow(getClientAddress())) return fail(429, { error: `That’s ${PER_DAY} searches today. Create a free account to keep going.`, url: raw, limit: true });

		let profile: AgencyProfile;
		try {
			profile = await profileFromUrl(raw);
		} catch {
			return fail(400, { error: 'That doesn’t look like a web address.', url: raw });
		}
		// the visitor corrected or completed what we found
		if (city) profile = { ...profile, city, needs: undefined };
		if (picked.length) profile = { ...profile, services: picked };
		if (!profile.city) return { url: raw, profile, ask: profile.needs ?? 'Which city do you work in?' };

		const run = await findProspects(profile, 5);
		return { url: raw, profile, run };
	}
};
