// Prospect engine: real local businesses that need what the agency sells.
// Data: Geoapify Places (OpenStreetMap data, reliable, commercial use OK) when GEOAPIFY_API_KEY is set,
// otherwise the public Overpass API as a fallback (free but often busy).
// Each candidate is checked by Undercut — what we check depends on what the agency sells:
//   web / seo / branding → website (missing, down, https, mobile, speed, last update, Google title)
//   social               → socials (no Instagram / TikTok / Facebook linked anywhere)
//   app                  → no app and no online booking for businesses where it matters
// Chains (brand) are skipped. The agency reviews and sends every message itself.
import * as env from '$app/env/private';
import { reviewLead } from './lead-ai.ts';
import type { AgencyProfile, Service } from './agency-profile.ts';

const UA = 'UndercutBot/1.0 (+https://getundercut.app; prospects)';
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
type Lang = 'fr' | 'nl' | 'en';

export type Issue = { key: string; label: string; weight: number };
export type Prospect = {
	id: string;
	name: string;
	category: string;
	address: string;
	city: string;
	lat: number;
	lon: number;
	website?: string;
	phone?: string;
	email?: string;
	instagram?: string;
	facebook?: string;
	score: number; // 0–100: how much they need the agency
	issues: Issue[];
	checked: { https?: boolean; mobile?: boolean; ms?: number; title?: string; year?: number; builder?: string; status?: number };
	pitch: string; // one-line reason
	detail?: string; // the one real thing the AI noticed about this business
	reviewed?: boolean; // checked and written by the AI reviewer
	budget?: 'high' | 'medium' | 'low'; // can they afford an agency? from the kind of business and what they already invest
	proof?: { label: string; url: string }[]; // links the agency can open (and show the owner) to check the problem
	message: string;
	osmUrl: string;
};
export type ProspectRun = { center: { lat: number; lon: number; label: string } | null; prospects: Prospect[]; scanned: number; error?: string; source?: 'geoapify' | 'overpass' };

// A place from any source, normalised
type Place = { id: string; name: string; kind: string; lat: number; lon: number; website: string; phone: string; email: string; insta: string; fb: string; tiktok: string; brand: string; address: string; city: string; osmUrl: string; closed?: boolean; hours?: boolean };

// ---------- categories per service ----------
// Geoapify category ids (verified against their API enum) and the equivalent OSM tags for Overpass.
const GEO: Record<Service, string[]> = {
	web: ['catering.restaurant', 'catering.cafe', 'healthcare.dentist', 'healthcare.clinic_or_praxis', 'pet.veterinary', 'education.driving_school', 'education.language_school', 'commercial.food_and_drink.bakery', 'commercial.food_and_drink.butcher', 'service.beauty.hairdresser', 'service.beauty', 'commercial.florist', 'commercial.clothing', 'commercial.health_and_beauty.optician', 'commercial.jewelry', 'commercial.furniture_and_interior', 'commercial.outdoor_and_sport.bicycle', 'service.electrician', 'service.carpenter', 'service.photographer', 'office.lawyer', 'office.accountant', 'office.estate_agent', 'office.architect', 'office.notary', 'sport.fitness.fitness_centre'],
	seo: ['office.lawyer', 'office.accountant', 'office.estate_agent', 'office.architect', 'office.notary', 'office.insurance', 'healthcare.dentist', 'healthcare.clinic_or_praxis', 'pet.veterinary', 'education.driving_school', 'service.electrician', 'service.carpenter'],
	social: ['catering.restaurant', 'catering.cafe', 'catering.bar', 'catering.ice_cream', 'service.beauty', 'service.beauty.hairdresser', 'service.beauty.tattoo', 'commercial.clothing', 'commercial.florist', 'commercial.food_and_drink.bakery', 'commercial.food_and_drink.chocolate', 'commercial.jewelry', 'commercial.health_and_beauty.cosmetics', 'sport.fitness.fitness_centre', 'accommodation.hotel', 'accommodation.guest_house'],
	app: ['sport.fitness.fitness_centre', 'sport.sports_centre', 'catering.restaurant', 'education.driving_school', 'education.language_school', 'healthcare.dentist', 'healthcare.clinic_or_praxis', 'service.beauty.hairdresser', 'service.beauty', 'accommodation.hotel', 'accommodation.guest_house'],
	branding: ['commercial.food_and_drink.bakery', 'commercial.food_and_drink.chocolate', 'commercial.food_and_drink.deli', 'commercial.food_and_drink.drinks', 'commercial.clothing', 'commercial.florist', 'commercial.gift_and_souvenir', 'commercial.health_and_beauty.cosmetics', 'catering.restaurant', 'catering.cafe', 'catering.bar'],
	ads: ['commercial.furniture_and_interior', 'commercial.outdoor_and_sport.bicycle', 'commercial.health_and_beauty.optician', 'commercial.jewelry', 'office.estate_agent', 'office.insurance', 'sport.fitness.fitness_centre']
};
const OSM: Record<Service, string[]> = {
	web: ['amenity~"^(restaurant|cafe|dentist|doctors|clinic|veterinary|driving_school|language_school)$"', 'shop~"^(bakery|butcher|hairdresser|beauty|florist|clothes|optician|jewelry|furniture|bicycle)$"', 'office~"^(lawyer|accountant|estate_agent|architect|notary)$"', 'craft~"^(carpenter|electrician|plumber|photographer)$"'],
	seo: ['office~"^(lawyer|accountant|estate_agent|architect|notary|insurance)$"', 'amenity~"^(dentist|doctors|clinic|veterinary|driving_school)$"', 'craft~"^(carpenter|electrician|plumber)$"'],
	social: ['amenity~"^(restaurant|cafe|bar|ice_cream)$"', 'shop~"^(beauty|hairdresser|clothes|florist|bakery|chocolate|jewelry|cosmetics|tattoo)$"', 'leisure~"^(fitness_centre)$"', 'tourism~"^(hotel|guest_house)$"'],
	app: ['leisure~"^(fitness_centre|sports_centre)$"', 'amenity~"^(restaurant|driving_school|language_school|clinic|dentist)$"', 'shop~"^(hairdresser|beauty)$"', 'tourism~"^(hotel|guest_house)$"'],
	branding: ['shop~"^(bakery|clothes|florist|chocolate|deli|wine|gift|cosmetics)$"', 'amenity~"^(restaurant|cafe|bar)$"'],
	ads: ['shop~"^(furniture|bicycle|optician|jewelry)$"', 'office~"^(estate_agent|insurance)$"', 'leisure~"^(fitness_centre)$"']
};

// ---------- words in the agency's language ----------
const CAT: Record<Lang, Record<string, string>> = {
	en: { restaurant: 'Restaurant', cafe: 'Café', bar: 'Bar', pub: 'Pub', ice_cream: 'Ice cream', dentist: 'Dentist', doctors: 'Doctor', clinic: 'Clinic', clinic_or_praxis: 'Clinic', veterinary: 'Vet', driving_school: 'Driving school', language_school: 'Language school', bakery: 'Bakery', butcher: 'Butcher', hairdresser: 'Hair salon', beauty: 'Beauty salon', tattoo: 'Tattoo studio', florist: 'Florist', clothes: 'Clothing store', clothing: 'Clothing store', optician: 'Optician', jewelry: 'Jeweller', furniture: 'Furniture store', furniture_and_interior: 'Interior store', bicycle: 'Bike shop', deli: 'Deli', drinks: 'Wine & drinks', wine: 'Wine shop', chocolate: 'Chocolatier', gift: 'Gift shop', gift_and_souvenir: 'Gift shop', cosmetics: 'Cosmetics', carpenter: 'Carpenter', electrician: 'Electrician', plumber: 'Plumber', photographer: 'Photographer', lawyer: 'Law firm', accountant: 'Accountant', estate_agent: 'Estate agent', architect: 'Architect', notary: 'Notary', insurance: 'Insurance', fitness_centre: 'Gym', sports_centre: 'Sports centre', hotel: 'Hotel', guest_house: 'Guest house' },
	fr: { restaurant: 'Restaurant', cafe: 'Café', bar: 'Bar', pub: 'Bar', ice_cream: 'Glacier', dentist: 'Dentiste', doctors: 'Médecin', clinic: 'Clinique', clinic_or_praxis: 'Cabinet médical', veterinary: 'Vétérinaire', driving_school: 'Auto-école', language_school: 'École de langues', bakery: 'Boulangerie', butcher: 'Boucherie', hairdresser: 'Coiffeur', beauty: 'Institut de beauté', tattoo: 'Tatoueur', florist: 'Fleuriste', clothes: 'Boutique de vêtements', clothing: 'Boutique de vêtements', optician: 'Opticien', jewelry: 'Bijouterie', furniture: 'Meubles', furniture_and_interior: 'Décoration', bicycle: 'Vélos', deli: 'Épicerie fine', drinks: 'Caviste', wine: 'Caviste', chocolate: 'Chocolatier', gift: 'Cadeaux', gift_and_souvenir: 'Cadeaux', cosmetics: 'Cosmétiques', carpenter: 'Menuisier', electrician: 'Électricien', plumber: 'Plombier', photographer: 'Photographe', lawyer: 'Avocat', accountant: 'Comptable', estate_agent: 'Agence immobilière', architect: 'Architecte', notary: 'Notaire', insurance: 'Assurances', fitness_centre: 'Salle de sport', sports_centre: 'Centre sportif', hotel: 'Hôtel', guest_house: "Maison d'hôtes" },
	nl: { restaurant: 'Restaurant', cafe: 'Café', bar: 'Bar', pub: 'Café', ice_cream: 'IJssalon', dentist: 'Tandarts', doctors: 'Dokter', clinic: 'Kliniek', clinic_or_praxis: 'Praktijk', veterinary: 'Dierenarts', driving_school: 'Rijschool', language_school: 'Taalschool', bakery: 'Bakkerij', butcher: 'Slagerij', hairdresser: 'Kapper', beauty: 'Schoonheidssalon', tattoo: 'Tattooshop', florist: 'Bloemist', clothes: 'Kledingwinkel', clothing: 'Kledingwinkel', optician: 'Opticien', jewelry: 'Juwelier', furniture: 'Meubelwinkel', furniture_and_interior: 'Interieurwinkel', bicycle: 'Fietsenwinkel', deli: 'Delicatessen', drinks: 'Wijnhandel', wine: 'Wijnhandel', chocolate: 'Chocolatier', gift: 'Cadeauwinkel', gift_and_souvenir: 'Cadeauwinkel', cosmetics: 'Cosmetica', carpenter: 'Schrijnwerker', electrician: 'Elektricien', plumber: 'Loodgieter', photographer: 'Fotograaf', lawyer: 'Advocaat', accountant: 'Boekhouder', estate_agent: 'Immokantoor', architect: 'Architect', notary: 'Notaris', insurance: 'Verzekeringen', fitness_centre: 'Fitness', sports_centre: 'Sportcentrum', hotel: 'Hotel', guest_house: 'B&B' }
};
const L: Record<Lang, Record<string, (x?: string) => string>> = {
	en: { 'no-site': () => 'no website', down: () => 'website not responding', http: () => 'not secure (no https)', mobile: () => 'not mobile-friendly', slow: (x) => `slow on mobile (${x} s)`, old: (x) => `not updated since ${x}`, title: () => 'no Google title', builder: (x) => `built with ${x}`, 'no-insta': () => 'no Instagram linked', 'no-tiktok': () => 'no TikTok', 'no-social': () => 'no social media found', 'no-app': () => 'no app or online booking' },
	fr: { 'no-site': () => 'pas de site web', down: () => 'le site ne répond pas', http: () => 'site non sécurisé (pas de https)', mobile: () => 'site pas adapté au mobile', slow: (x) => `site lent sur mobile (${x} s)`, old: (x) => `pas mis à jour depuis ${x}`, title: () => 'pas de titre Google', builder: (x) => `site fait avec ${x}`, 'no-insta': () => 'pas d’Instagram relié', 'no-tiktok': () => 'pas de TikTok', 'no-social': () => 'aucun réseau social trouvé', 'no-app': () => 'pas d’app ni de réservation en ligne' },
	nl: { 'no-site': () => 'geen website', down: () => 'website reageert niet', http: () => 'niet beveiligd (geen https)', mobile: () => 'niet mobielvriendelijk', slow: (x) => `traag op mobiel (${x} s)`, old: (x) => `niet bijgewerkt sinds ${x}`, title: () => 'geen Google-titel', builder: (x) => `gemaakt met ${x}`, 'no-insta': () => 'geen Instagram gelinkt', 'no-tiktok': () => 'geen TikTok', 'no-social': () => 'geen sociale media gevonden', 'no-app': () => 'geen app of online boeking' }
};

// first message, shaped by what the agency sells
const OFFER: Record<Lang, Record<'web' | 'social' | 'app' | 'branding', string>> = {
	en: { web: 'I can show you in 15 minutes what I would change on your website — no strings attached.', social: 'I can show you in 15 minutes how I would bring more people to you through Instagram and TikTok — no strings attached.', app: 'I can show you in 15 minutes how your customers could book and come back through a simple app — no strings attached.', branding: 'I can show you in 15 minutes how a sharper brand would make you stand out — no strings attached.' },
	fr: { web: 'Je peux vous montrer en 15 minutes ce que je changerais concrètement sur votre site — sans engagement.', social: 'Je peux vous montrer en 15 minutes comment attirer plus de clients via Instagram et TikTok — sans engagement.', app: 'Je peux vous montrer en 15 minutes comment vos clients pourraient réserver et revenir grâce à une app simple — sans engagement.', branding: 'Je peux vous montrer en 15 minutes comment une image plus forte vous démarquerait — sans engagement.' },
	nl: { web: 'Ik toon u graag in 15 minuten wat ik concreet aan uw website zou verbeteren — vrijblijvend.', social: 'Ik toon u graag in 15 minuten hoe u via Instagram en TikTok meer klanten aantrekt — vrijblijvend.', app: 'Ik toon u graag in 15 minuten hoe uw klanten via een eenvoudige app kunnen boeken en terugkomen — vrijblijvend.', branding: 'Ik toon u graag in 15 minuten hoe een sterker merk u laat opvallen — vrijblijvend.' }
};
// GDPR / good practice: every first message says how to stop receiving them
export const OPT_OUT: Record<Lang, string> = { en: 'If you’d rather not hear from me, just reply “no” and I won’t write again.', fr: 'Si vous préférez ne plus recevoir de message de ma part, répondez simplement « non ».', nl: 'Liever geen berichten meer van mij? Antwoord gewoon “nee”.' };
const MSG: Record<Lang, (p: { biz: string; agency: string; issues: string[]; offer: string }) => string> = {
	en: ({ biz, agency, issues, offer }) => `Hi ${biz},\n\nI was looking at your business online and noticed: ${issues.join('; ')}.\nThat can cost you customers who are looking for you right now.\n\n${offer}\n\n— ${agency}\n\n${OPT_OUT.en}`,
	fr: ({ biz, agency, issues, offer }) => `Bonjour ${biz},\n\nEn regardant votre présence en ligne, j'ai remarqué : ${issues.join(' ; ')}.\nCe sont des points qui peuvent vous faire perdre des clients qui vous cherchent en ce moment.\n\n${offer}\n\n— ${agency}\n\n${OPT_OUT.fr}`,
	nl: ({ biz, agency, issues, offer }) => `Hallo ${biz},\n\nBij het bekijken van jullie online aanwezigheid viel me op: ${issues.join('; ')}.\nDaardoor kunnen jullie klanten mislopen die jullie nu zoeken.\n\n${offer}\n\n— ${agency}\n\n${OPT_OUT.nl}`
};

// ---------- geocoding ----------
const geoCache = new Map<string, { lat: number; lon: number; label: string } | null>();
let lastNominatim = 0;
export async function geocode(city: string, country = '') {
	const key = `${city}|${country}`.toLowerCase();
	if (geoCache.has(key)) return geoCache.get(key)!;
	let v: { lat: number; lon: number; label: string } | null = null;
	try {
		if (env.GEOAPIFY_API_KEY) {
			const p = new URLSearchParams({ text: city, limit: '1', format: 'json', apiKey: env.GEOAPIFY_API_KEY });
			if (country) p.set('filter', `countrycode:${country.toLowerCase()}`);
			const j = await (await fetch(`https://api.geoapify.com/v1/geocode/search?${p}`, { signal: AbortSignal.timeout(8000) })).json();
			const r = j.results?.[0];
			if (r) v = { lat: r.lat, lon: r.lon, label: [r.city || r.name, r.country].filter(Boolean).join(', ') };
		} else {
			const wait = Math.max(0, lastNominatim + 1100 - Date.now());
			if (wait) await new Promise((r) => setTimeout(r, wait));
			lastNominatim = Date.now();
			const p = new URLSearchParams({ q: city, format: 'json', limit: '1' });
			if (country) p.set('countrycodes', country.toLowerCase());
			const j = await (await fetch(`https://nominatim.openstreetmap.org/search?${p}`, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(8000) })).json();
			if (j[0]) v = { lat: +j[0].lat, lon: +j[0].lon, label: String(j[0].display_name).split(',').slice(0, 2).join(',') };
		}
	} catch {
		return null; // not cached: try again next time
	}
	geoCache.set(key, v);
	return v;
}

// ---------- places ----------
const insta = (t: Record<string, string>) => t['contact:instagram'] || t.instagram || (/(instagram\.com\/[^\s"'?]+)/i.exec(Object.values(t).join(' '))?.[1] ?? '');
const kindOf = (t: Record<string, string>) => t.amenity || t.shop || t.craft || t.office || t.healthcare || t.leisure || t.tourism || 'business';
// signs in OpenStreetMap that a place no longer trades
const closedOf = (t: Record<string, string>, name: string) => Object.keys(t).some((k) => /^(disused|was|abandoned|demolished|removed):/.test(k)) || /^(closed|off)$/i.test(t.opening_hours ?? '') || /\b(ferm[ée]|closed|gesloten|cessation)\b/i.test(name);
const addrOf = (t: Record<string, string>) => [t['addr:street'] && `${t['addr:street']} ${t['addr:housenumber'] ?? ''}`.trim(), t['addr:postcode'], t['addr:city']].filter(Boolean).join(', ');

async function fromGeoapify(lat: number, lon: number, services: Service[], radius: number): Promise<Place[]> {
	const cats = [...new Set(services.flatMap((s) => GEO[s]))];
	const p = new URLSearchParams({ categories: cats.join(','), filter: `circle:${lon},${lat},${radius}`, bias: `proximity:${lon},${lat}`, limit: '300', apiKey: env.GEOAPIFY_API_KEY! });
	const r = await fetch(`https://api.geoapify.com/v2/places?${p}`, { signal: AbortSignal.timeout(20000) });
	if (!r.ok) throw new Error(`Geoapify ${r.status}`);
	const j = await r.json();
	return (j.features ?? [])
		.map((f: any): Place | null => {
			const pr = f.properties ?? {};
			const t: Record<string, string> = pr.datasource?.raw ?? {};
			const name = pr.name || t.name;
			if (!name) return null;
			const osmType = t.osm_type === 'w' ? 'way' : t.osm_type === 'r' ? 'relation' : 'node';
			const leaf = (pr.categories ?? []).filter((c: string) => c.split('.').length > 1).sort((a: string, b: string) => b.split('.').length - a.split('.').length)[0] ?? '';
			return {
				id: t.osm_id ? `${osmType}/${t.osm_id}` : `geo/${pr.place_id}`,
				name,
				kind: kindOf(t) !== 'business' ? kindOf(t) : leaf.split('.').pop() || 'business',
				lat: pr.lat,
				lon: pr.lon,
				website: (pr.website || t.website || t['contact:website'] || '').trim(),
				phone: pr.contact?.phone || t.phone || t['contact:phone'] || '',
				email: pr.contact?.email || t.email || t['contact:email'] || '',
				insta: insta(t),
				fb: t['contact:facebook'] || '',
				tiktok: t['contact:tiktok'] || '',
				brand: pr.brand || t.brand || '',
				address: pr.address_line2 || addrOf(t),
				city: pr.city || t['addr:city'] || '',
				osmUrl: t.osm_id ? `https://www.openstreetmap.org/${osmType}/${t.osm_id}` : '',
				closed: closedOf(t, name),
				hours: Boolean(pr.opening_hours || t.opening_hours)
			};
		})
		.filter(Boolean) as Place[];
}

async function fromOverpass(lat: number, lon: number, services: Service[], radius: number): Promise<Place[]> {
	const filters = [...new Set(services.flatMap((s) => OSM[s]))];
	const q = `[out:json][timeout:25];(${filters.map((f) => `nwr[${f}][name][!brand](around:${radius},${lat},${lon});`).join('')});out center tags 300;`;
	let lastErr: unknown;
	for (const ep of OVERPASS) {
		try {
			const r = await fetch(ep, { method: 'POST', headers: { 'user-agent': UA, accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(q), signal: AbortSignal.timeout(25000) });
			if (!r.ok) {
				lastErr = new Error(`Overpass ${r.status}`);
				continue;
			}
			const els = (await r.json()).elements as any[];
			return els
				.filter((e) => e.tags?.name)
				.map((e): Place => {
					const t = e.tags;
					return { id: `${e.type}/${e.id}`, name: t.name, kind: kindOf(t), lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon, website: (t.website || t['contact:website'] || t.url || '').trim(), phone: t.phone || t['contact:phone'] || '', email: t.email || t['contact:email'] || '', insta: insta(t), fb: t['contact:facebook'] || '', tiktok: t['contact:tiktok'] || '', brand: t.brand || '', address: addrOf(t), city: t['addr:city'] || '', osmUrl: `https://www.openstreetmap.org/${e.type}/${e.id}`, closed: closedOf(t, t.name), hours: Boolean(t.opening_hours) };
				});
		} catch (e) {
			lastErr = e;
		}
	}
	throw lastErr;
}

const placeCache = new Map<string, { at: number; v: Place[]; src: 'geoapify' | 'overpass' }>();
async function placesAround(lat: number, lon: number, services: Service[], radius = 3000) {
	const key = `${lat.toFixed(3)}|${lon.toFixed(3)}|${radius}|${[...services].sort().join(',')}`;
	const hit = placeCache.get(key);
	if (hit && Date.now() - hit.at < 24 * 3600_000) return hit;
	let v: Place[] = [];
	let src: 'geoapify' | 'overpass' = 'overpass';
	if (env.GEOAPIFY_API_KEY) {
		try {
			v = await fromGeoapify(lat, lon, services, radius);
			src = 'geoapify';
		} catch {
			v = [];
		}
	}
	if (!v.length) v = await fromOverpass(lat, lon, services, radius);
	const out = { at: Date.now(), v, src };
	placeCache.set(key, out);
	return out;
}

// ---------- quick website check ----------
async function checkSite(url: string): Promise<Prospect['checked'] & { html?: string }> {
	const t0 = Date.now();
	try {
		const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36' } });
		const html = (await r.text()).slice(0, 400_000);
		const ms = Date.now() - t0;
		const years = [...html.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(20\d{2}|19\d{2})/gi)].map((m) => +m[1]);
		const builder = /wix\.com|wixstatic/i.test(html) ? 'Wix' : /jimdo/i.test(html) ? 'Jimdo' : /squarespace/i.test(html) ? 'Squarespace' : /wp-content/i.test(html) ? 'WordPress' : /webflow/i.test(html) ? 'Webflow' : /shopify/i.test(html) ? 'Shopify' : undefined;
		return { status: r.status, https: r.url.startsWith('https://'), mobile: /<meta[^>]+name=["']viewport["']/i.test(html), ms, title: (html.match(/<title[^>]*>([^<]*)/i)?.[1] ?? '').trim().slice(0, 90), year: years.length ? Math.max(...years) : undefined, builder, html };
	} catch {
		return { status: 0, ms: Date.now() - t0 };
	}
}

function hash(s: string) {
	let h = 2166136261;
	for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
	return h >>> 0;
}

const BOOKING_KINDS = /fitness|sports_centre|restaurant|clinic|dentist|driving_school|language_school|hairdresser|beauty|hotel|guest_house/;

/** Find up to `limit` prospects for this agency. `exclude` = ids already seen (pipeline), so each run brings new ones. */
// ---------- can they pay? ----------
// Kinds of business that usually have the margin for an agency retainer vs. very small shops.
const HIGH = /^(lawyer|notary|accountant|architect|estate_agent|insurance|dentist|clinic|clinic_or_praxis|doctors|veterinary|hotel|guest_house|optician|jewelry|furniture|furniture_and_interior|fitness_centre|sports_centre|driving_school|language_school)$/;
const LOW = /^(ice_cream|kiosk|convenience|takeaway|fast_food)$/;
function budgetOf(pl: Place, checked: Prospect['checked']): 'high' | 'medium' | 'low' {
	let pts = HIGH.test(pl.kind) ? 2 : LOW.test(pl.kind) ? -1 : 1;
	if (pl.website && checked.status && checked.status < 400) pts += 1; // they already pay for a site
	if (pl.hours) pts += 0.5;
	if (pl.insta || pl.fb) pts += 0.5;
	return pts >= 3 ? 'high' : pts >= 1.5 ? 'medium' : 'low';
}
const BUDGET_WEIGHT = { high: 1.15, medium: 1, low: 0.75 };

/** Proof links the agency can open itself and show the owner. */
function proofOf(pl: Place, checked: Prospect['checked'], issues: Issue[]): { label: string; url: string }[] {
	const out: { label: string; url: string }[] = [];
	const site = pl.website ? (/^https?:/i.test(pl.website) ? pl.website : `https://${pl.website}`) : '';
	const has = (k: string) => issues.some((x) => x.key === k);
	if (site && (has('slow') || has('mobile') || has('title'))) out.push({ label: 'Google PageSpeed test (mobile)', url: `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(site)}&form_factor=mobile` });
	if (site && has('http')) out.push({ label: 'Open the site: Chrome shows “Not secure”', url: site.replace(/^https:/i, 'http:') });
	if (site && (has('down') || has('old') || has('builder'))) out.push({ label: 'Open their website', url: site });
	if (!site || has('no-site')) out.push({ label: 'Search them on Google: no website comes up', url: `https://www.google.com/search?q=${encodeURIComponent(`${pl.name} ${pl.city}`)}` });
	if (has('no-social') || has('no-insta')) out.push({ label: 'Search them on Instagram', url: `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(pl.name)}` });
	return out.slice(0, 3);
}

export async function findProspects(profile: AgencyProfile, limit = 5, exclude: Set<string> = new Set()): Promise<ProspectRun> {
	const lang: Lang = profile.lang ?? 'en';
	const center = profile.city ? await geocode(profile.city, profile.country || '') : null;
	if (!center) return { center: null, prospects: [], scanned: 0, error: profile.city ? `We could not find “${profile.city}” on the map — check the spelling or try a nearby city.` : 'Pick your city first.' };
	const services: Service[] = profile.services.length ? profile.services : ['web'];
	let places: Place[];
	let source: 'geoapify' | 'overpass';
	try {
		const r = await placesAround(center.lat, center.lon, services);
		places = r.v;
		source = r.src;
	} catch {
		return { center, prospects: [], scanned: 0, error: 'The map service is busy right now — try again in a minute.' };
	}
	const sells = new Set(services);
	const webish = sells.has('web') || sells.has('seo') || sells.has('branding') || sells.has('ads');
	const main: 'web' | 'social' | 'app' | 'branding' = sells.has('web') || sells.has('seo') || sells.has('ads') ? 'web' : sells.has('social') ? 'social' : sells.has('app') ? 'app' : 'branding';
	const T = L[lang];

	// candidates: no chains, not seen before, deterministic shuffle per agency so two agencies don't get the same list
	// a name seen 3+ times around here = a chain, even without a brand tag
	const seen = new Map<string, number>();
	for (const p of places) seen.set(p.name.toLowerCase(), (seen.get(p.name.toLowerCase()) ?? 0) + 1);
	const cands = places
		.filter((p) => !p.brand && !p.closed && (seen.get(p.name.toLowerCase()) ?? 0) < 3 && !exclude.has(p.id))
		.map((p) => ({ p, r: hash(profile.url + p.id) }))
		.sort((a, b) => a.r - b.r)
		.map((x) => x.p)
		.slice(0, Math.max(limit * 6, 30));

	const out: Prospect[] = [];
	const pages = new Map<string, string>(); // site html per prospect, for the AI reviewer
	for (let i = 0; i < cands.length && out.length < limit * 3; i += 6) {
		const batch = await Promise.all(
			cands.slice(i, i + 6).map(async (pl): Promise<Prospect | null> => {
				const issues: Issue[] = [];
				const add = (key: string, weight: number, x?: string) => issues.push({ key, weight, label: T[key](x) });
				let checked: Prospect['checked'] = {};
				let html = '';
				if (!pl.website) {
					if (webish) add('no-site', 45);
				} else {
					const url = /^https?:/i.test(pl.website) ? pl.website : `https://${pl.website}`;
					const c = await checkSite(url);
					html = c.html ?? '';
					checked = { https: c.https, mobile: c.mobile, ms: c.ms, title: c.title, year: c.year, builder: c.builder, status: c.status };
					if (!c.status || c.status >= 400) {
						if (webish) add('down', 30);
					} else if (webish) {
						if (c.https === false) add('http', 20);
						if (c.mobile === false) add('mobile', 25);
						if ((c.ms ?? 0) > 3500) add('slow', 15, ((c.ms ?? 0) / 1000).toFixed(1));
						if (c.year && c.year < new Date().getFullYear() - 3) add('old', 15, String(c.year));
						if (c.title !== undefined && c.title.length < 8) add('title', 10);
						if (c.builder && ['Wix', 'Jimdo'].includes(c.builder)) add('builder', 5, c.builder);
					}
				}
				if (sells.has('social')) {
					const hasInsta = Boolean(pl.insta) || /instagram\.com\//i.test(html);
					const hasTikTok = Boolean(pl.tiktok) || /tiktok\.com\/@/i.test(html);
					const hasFb = Boolean(pl.fb) || /facebook\.com\//i.test(html);
					if (!hasInsta && !hasTikTok && !hasFb) add('no-social', 40);
					else {
						if (!hasInsta) add('no-insta', 25);
						if (!hasTikTok) add('no-tiktok', 10);
					}
				}
				if (sells.has('app') && BOOKING_KINDS.test(pl.kind) && !/(apps\.apple\.com|play\.google\.com|calendly|planity|treatwell|resengo|booksy|fresha|zenchef|thefork|opentable|booking\.com|reserv|book now|rendez-vous|boeken)/i.test(html)) add('no-app', 30);

				// contacts the map doesn't have, from their own site
				const email = pl.email || (/mailto:([^"'?\s>]+@[^"'?\s>]+\.[a-z]{2,})/i.exec(html)?.[1] ?? '');
				const phone = pl.phone || (/href=["']tel:([+\d][\d\s./-]{6,})["']/i.exec(html)?.[1]?.trim() ?? '');
				const instaUrl = pl.insta || (/((?:https?:\/\/)?(?:www\.)?instagram\.com\/(?!p\/|reel\/|explore\/)[A-Za-z0-9_.]+)/i.exec(html)?.[1] ?? '');
				// no way to reach them = not a lead; a dead site and no phone usually means the place closed
				if (!email && !phone && !instaUrl && !pl.fb) return null;
				if (pl.website && (!checked.status || checked.status >= 400) && !phone && !email) return null;

				pages.set(pl.id, html);
				const budget = budgetOf(pl, checked);
				const score = Math.min(100, Math.round(issues.reduce((s, x) => s + x.weight, 0) * BUDGET_WEIGHT[budget]));
				if (score < 15) return null;
				const top = [...issues].sort((a, b) => b.weight - a.weight).slice(0, 2).map((x) => x.label);
				return {
					id: pl.id,
					name: pl.name,
					category: CAT[lang][pl.kind] ?? CAT.en[pl.kind] ?? pl.kind.replace(/_/g, ' '),
					address: pl.address,
					city: pl.city || profile.city,
					lat: pl.lat,
					lon: pl.lon,
					website: pl.website || undefined,
					phone: phone || undefined,
					email: email || undefined,
					instagram: instaUrl || undefined,
					budget,
					proof: proofOf(pl, checked, issues),
					facebook: pl.fb || undefined,
					score,
					issues,
					checked,
					pitch: top.join(' · '),
					message: MSG[lang]({ biz: pl.name, agency: profile.name, issues: top, offer: OFFER[lang][main] }),
					osmUrl: pl.osmUrl
				};
			})
		);
		out.push(...(batch.filter(Boolean) as Prospect[]));
	}
	// most in need (weighted by budget) first; those you can email before the rest
	out.sort((a, b) => b.score - a.score || (b.email ? 1 : 0) - (a.email ? 1 : 0) || (b.phone ? 1 : 0) - (a.phone ? 1 : 0));
	// AI reviewer + writer on the best few: drop what doesn't fit, personalise the first message
	const short = out.slice(0, limit + 3);
	const reviews = await Promise.all(short.map((p) => reviewLead({ name: p.name, category: p.category, city: p.city, website: p.website, issues: p.issues.map((x) => x.label), html: pages.get(p.id) ?? '', agency: profile.name, services, lang, optOut: OPT_OUT[lang] })));
	const final: Prospect[] = [];
	short.forEach((p, i) => {
		const r = reviews.at(i);
		if (r && !r.keep) return;
		final.push(r ? { ...p, message: r.message, detail: r.detail || undefined, reviewed: true } : p);
	});
	return { center, prospects: final.slice(0, limit), scanned: places.length, source };
}
