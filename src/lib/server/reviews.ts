// What a business's own customers complain about on Google, kept only when it is something an agency can fix
// (hours, booking, phone, website, menu & prices, photos, being found). Complaints about staff, food or service are never used.
// Source: Google Places API (New), only when GOOGLE_PLACES_API_KEY is set. One call per shortlisted lead.
import * as env from '$app/env/private';
import type { Service } from './agency-profile.ts';

export type Topic = 'hours' | 'booking' | 'phone' | 'website' | 'menu' | 'photos' | 'find';
export type Complaint = { topic: Topic; rating: number; quote: string; when?: string };
export type GooglePlace = { rating?: number; count?: number; url?: string; website?: string; phone?: string; complaints: Complaint[] };

export const placesReady = () => Boolean(env.GOOGLE_PLACES_API_KEY);

// words customers use, in French, Dutch and English
const TOPICS: [Topic, RegExp][] = [
	['hours', /horaire|heures d.ouverture|indiqu[ée] (comme )?ouvert|trouv[ée] (porte )?ferm|ferm[ée] alors|openingsuren|openingstijden|gesloten terwijl|stond open|opening hours|said (it was )?open|closed when|wrong hours/i],
	['booking', /r[ée]serv|r[ée]servation en ligne|prendre (un )?rendez-vous|rdv|boeken|reserveren|afspraak maken|book(ing)? online|make a booking|appointment/i],
	['phone', /t[ée]l[ée]phone|personne ne r[ée]pond|injoignable|ne d[ée]croche|messagerie|telefoon|neemt (de telefoon )?niet op|onbereikbaar|no one (answers|picks up)|never answer|unreachable|phone/i],
	['website', /site( web| internet)?\b|website|en ligne|webshop|online bestellen|commande en ligne|order online/i],
	['menu', /\bmenu|la carte\b|prix (affich|pas indiqu)|tarifs?\b|prijslijst|prijzen|price list|prices (weren.t|not) (shown|listed)/i],
	['photos', /photos? (ne correspond|trompeu)|pas comme sur les photos|foto.s (klopten|kloppen) niet|niet zoals op de foto|looks? nothing like (the )?(photos?|pictures?)|misleading (photos?|pictures?)/i],
	['find', /introuvable|difficile [àa] trouver|pas trouv[ée] l.adresse|mauvaise adresse|moeilijk te vinden|verkeerd adres|hard to find|couldn.t find|wrong address|gps/i]
];
// the agency services that fix each topic
const FIXES: Record<Topic, Service[]> = { hours: ['seo', 'web'], booking: ['app', 'web'], phone: ['web', 'app'], website: ['web', 'seo'], menu: ['web', 'social'], photos: ['video', 'social', 'web'], find: ['seo', 'web', 'ads'] };

/** The sentence of a review that talks about the topic, short enough to quote. */
function excerpt(text: string, re: RegExp) {
	const parts = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/);
	const s = (parts.find((p) => re.test(p)) ?? text).trim();
	return s.length > 140 ? s.slice(0, 137).replace(/\s\S*$/, '') + '…' : s;
}

/** Keep only 1–3 star reviews about something the agency can fix. Most recent first, one per topic. */
export function complaintsFrom(reviews: { rating?: number; text?: string; when?: string }[], sells: Set<string>): Complaint[] {
	const out: Complaint[] = [];
	for (const r of reviews) {
		if (!r.text || !r.rating || r.rating > 3) continue;
		const hit = TOPICS.find(([t, re]) => re.test(r.text!) && FIXES[t].some((s) => sells.has(s)) && !out.some((c) => c.topic === t));
		if (hit) out.push({ topic: hit[0], rating: r.rating, quote: excerpt(r.text, hit[1]), when: r.when });
	}
	return out.slice(0, 2);
}

type Api = {
	places?: {
		rating?: number;
		userRatingCount?: number;
		googleMapsUri?: string;
		websiteUri?: string;
		nationalPhoneNumber?: string;
		reviews?: { rating?: number; text?: { text?: string }; originalText?: { text?: string }; relativePublishTimeDescription?: string }[];
	}[];
};

/** The business on Google Maps (matched by name near its map position): rating, link, website, phone and fixable complaints. */
export async function googlePlace(p: { name: string; address?: string; city?: string; lat: number; lon: number }, sells: Set<string>): Promise<GooglePlace | null> {
	if (!env.GOOGLE_PLACES_API_KEY) return null;
	try {
		const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
			method: 'POST',
			signal: AbortSignal.timeout(10000),
			headers: {
				'content-type': 'application/json',
				'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
				'X-Goog-FieldMask': 'places.rating,places.userRatingCount,places.googleMapsUri,places.websiteUri,places.nationalPhoneNumber,places.reviews'
			},
			body: JSON.stringify({ textQuery: [p.name, p.address || p.city].filter(Boolean).join(' '), maxResultCount: 1, locationBias: { circle: { center: { latitude: p.lat, longitude: p.lon }, radius: 250 } } })
		});
		if (!res.ok) return null;
		const g = ((await res.json()) as Api).places?.[0];
		if (!g) return null;
		const reviews = (g.reviews ?? []).map((r) => ({ rating: r.rating, text: r.originalText?.text || r.text?.text, when: r.relativePublishTimeDescription }));
		return { rating: g.rating, count: g.userRatingCount, url: g.googleMapsUri, website: g.websiteUri, phone: g.nationalPhoneNumber, complaints: complaintsFrom(reviews, sells) };
	} catch {
		return null;
	}
}
