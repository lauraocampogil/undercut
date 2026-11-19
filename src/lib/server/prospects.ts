// Prospect engine: real local businesses that need what the agency sells.
// Data: OpenStreetMap (© OpenStreetMap contributors, ODbL) via Nominatim (geocoding) and Overpass (places).
// Each candidate is checked by Undercut: website present? https, mobile, speed, title/description, last update,
// Instagram presence… then scored and given a short audit + a message the agency reviews and sends itself.
import type { AgencyProfile, Service } from './agency-profile.ts';

const UA = 'UndercutBot/1.0 (+https://getundercut.app; prospects)';
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

export type Issue = { key: string; label: string; weight: number };
export type Prospect = {
	id: string; // osm type/id
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
	message: string;
	osmUrl: string;
};

// ---------- geocoding (Nominatim: 1 request/second, cached) ----------
const geoCache = new Map<string, { lat: number; lon: number; label: string } | null>();
let lastNominatim = 0;
export async function geocode(city: string, country = 'BE') {
	const key = `${city}|${country}`.toLowerCase();
	if (geoCache.has(key)) return geoCache.get(key)!;
	const wait = Math.max(0, lastNominatim + 1100 - Date.now());
	if (wait) await new Promise((r) => setTimeout(r, wait));
	lastNominatim = Date.now();
	try {
		const r = await fetch(`https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q: city, countrycodes: country.toLowerCase(), format: 'json', limit: '1' })}`, { headers: { 'user-agent': UA, 'accept-language': 'fr' }, signal: AbortSignal.timeout(8000) });
		const j = await r.json();
		const v = j[0] ? { lat: +j[0].lat, lon: +j[0].lon, label: String(j[0].display_name).split(',').slice(0, 2).join(',') } : null;
		geoCache.set(key, v);
		return v;
	} catch {
		return null;
	}
}

// ---------- which businesses fit which agency ----------
const TARGETS: Record<Service, string[]> = {
	web: ['amenity~"^(restaurant|cafe|dentist|doctors|clinic|veterinary|driving_school|language_school|childcare)$"', 'shop~"^(bakery|butcher|hairdresser|beauty|florist|clothes|shoes|optician|jewelry|furniture|bicycle|interior_decoration|deli|wine|chocolate|gift)$"', 'craft~"^(carpenter|electrician|plumber|painter|roofer|hvac|tiler|gardener|photographer)$"', 'office~"^(lawyer|accountant|estate_agent|architect|notary|insurance|therapist)$"', 'healthcare~"^(physiotherapist|psychotherapist|dentist|optometrist)$"', 'leisure~"^(fitness_centre|sports_centre|dance)$"'],
	app: ['leisure~"^(fitness_centre|sports_centre|dance|yoga)$"', 'amenity~"^(restaurant|driving_school|language_school|clinic|dentist)$"', 'shop~"^(hairdresser|beauty|bakery)$"', 'tourism~"^(hotel|guest_house)$"'],
	social: ['amenity~"^(restaurant|cafe|bar|pub|ice_cream)$"', 'shop~"^(beauty|hairdresser|clothes|florist|bakery|chocolate|jewelry|cosmetics|tattoo|boutique)$"', 'leisure~"^(fitness_centre|dance|yoga)$"', 'tourism~"^(hotel|guest_house)$"'],
	seo: ['office~"^(lawyer|accountant|estate_agent|architect|notary|insurance|therapist)$"', 'craft~"^(carpenter|electrician|plumber|painter|roofer|hvac|tiler)$"', 'amenity~"^(dentist|doctors|clinic|veterinary|driving_school)$"', 'healthcare~"^(physiotherapist|psychotherapist|dentist)$"'],
	branding: ['shop~"^(bakery|clothes|florist|chocolate|deli|wine|gift|cosmetics|boutique)$"', 'amenity~"^(restaurant|cafe|bar)$"'],
	ads: ['shop~"^(furniture|bicycle|optician|jewelry|interior_decoration)$"', 'office~"^(estate_agent|insurance)$"', 'leisure~"^(fitness_centre)$"']
};
const CAT_FR: Record<string, string> = { restaurant: 'Restaurant', cafe: 'Café', bar: 'Bar', pub: 'Bar', dentist: 'Dentiste', doctors: 'Médecin', clinic: 'Clinique', veterinary: 'Vétérinaire', driving_school: 'Auto-école', language_school: 'École de langues', childcare: 'Crèche', bakery: 'Boulangerie', butcher: 'Boucherie', hairdresser: 'Coiffeur', beauty: 'Institut de beauté', florist: 'Fleuriste', clothes: 'Boutique de vêtements', shoes: 'Chaussures', optician: 'Opticien', jewelry: 'Bijouterie', furniture: 'Meubles', bicycle: 'Vélos', interior_decoration: 'Décoration', deli: 'Épicerie fine', wine: 'Caviste', chocolate: 'Chocolatier', gift: 'Cadeaux', carpenter: 'Menuisier', electrician: 'Électricien', plumber: 'Plombier', painter: 'Peintre', roofer: 'Couvreur', hvac: 'Chauffagiste', tiler: 'Carreleur', gardener: 'Jardinier', photographer: 'Photographe', lawyer: 'Avocat', accountant: 'Comptable', estate_agent: 'Agence immobilière', architect: 'Architecte', notary: 'Notaire', insurance: 'Assurances', therapist: 'Thérapeute', physiotherapist: 'Kiné', psychotherapist: 'Psychologue', optometrist: 'Optométriste', fitness_centre: 'Salle de sport', sports_centre: 'Centre sportif', dance: 'École de danse', yoga: 'Yoga', hotel: 'Hôtel', guest_house: "Maison d'hôtes", ice_cream: 'Glacier', cosmetics: 'Cosmétiques', tattoo: 'Tatoueur', boutique: 'Boutique' };

async function overpass(query: string) {
	let lastErr: unknown;
	for (const ep of OVERPASS) {
		try {
			const r = await fetch(ep, { method: 'POST', headers: { 'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(query), signal: AbortSignal.timeout(30000) });
			if (r.ok) return (await r.json()).elements as any[];
			lastErr = new Error(`Overpass ${r.status}`);
		} catch (e) {
			lastErr = e;
		}
	}
	throw lastErr;
}

const placeCache = new Map<string, { at: number; v: any[] }>();
async function placesAround(lat: number, lon: number, services: Service[], radius = 4000) {
	const filters = [...new Set(services.flatMap((s) => TARGETS[s]))];
	const key = `${lat.toFixed(3)}|${lon.toFixed(3)}|${radius}|${filters.join(',')}`;
	const hit = placeCache.get(key);
	if (hit && Date.now() - hit.at < 24 * 3600_000) return hit.v;
	const q = `[out:json][timeout:25];(${filters.map((f) => `nwr[${f}][name][!brand](around:${radius},${lat},${lon});`).join('')});out center tags 400;`;
	const v = await overpass(q);
	placeCache.set(key, { at: Date.now(), v });
	return v;
}

// ---------- quick website check (no Chrome: a full Lighthouse audit is available on demand) ----------
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

const MSG: Record<'fr' | 'nl' | 'en', (p: { biz: string; agency: string; issues: string[] }) => string> = {
	fr: ({ biz, agency, issues }) => `Bonjour ${biz},\n\nEn regardant votre présence en ligne, j'ai remarqué : ${issues.join(' ; ')}.\nCe sont des points qui font perdre des clients qui vous cherchent sur Google ou Instagram.\n\nJe peux vous montrer en 15 minutes ce que je changerais concrètement — sans engagement.\n\n— ${agency}`,
	nl: ({ biz, agency, issues }) => `Hallo ${biz},\n\nBij het bekijken van jullie online aanwezigheid viel me op: ${issues.join('; ')}.\nDaardoor missen jullie klanten die jullie zoeken op Google of Instagram.\n\nIk toon graag in 15 minuten wat ik concreet zou verbeteren — vrijblijvend.\n\n— ${agency}`,
	en: ({ biz, agency, issues }) => `Hi ${biz},\n\nLooking at your online presence I noticed: ${issues.join('; ')}.\nThat costs you customers who look for you on Google or Instagram.\n\nI can show you in 15 minutes what I would change — no strings attached.\n\n— ${agency}`
};

function hash(s: string) {
	let h = 2166136261;
	for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
	return h >>> 0;
}

export type ProspectRun = { center: { lat: number; lon: number; label: string } | null; prospects: Prospect[]; scanned: number; error?: string };

/** Find up to `limit` prospects for this agency. `exclude` = ids already seen (pipeline), so each run brings new ones. */
export async function findProspects(profile: AgencyProfile, limit = 5, exclude: Set<string> = new Set()): Promise<ProspectRun> {
	const center = profile.city ? await geocode(profile.city, profile.country || 'BE') : null;
	if (!center) return { center: null, prospects: [], scanned: 0, error: profile.city ? `We could not find “${profile.city}” on the map.` : 'Pick your city first.' };
	let els: any[];
	try {
		els = await placesAround(center.lat, center.lon, profile.services.length ? profile.services : ['web']);
	} catch {
		return { center, prospects: [], scanned: 0, error: 'The map service (OpenStreetMap) is busy — try again in a minute.' };
	}
	const sells = new Set(profile.services);
	// candidates: deterministic shuffle per agency so two agencies don't get the same list
	const cands = els
		.filter((e) => e.tags?.name && !exclude.has(`${e.type}/${e.id}`))
		.map((e) => ({ e, r: hash(profile.url + e.id) }))
		.sort((a, b) => a.r - b.r)
		.map((x) => x.e)
		.slice(0, Math.max(limit * 5, 25));

	const out: Prospect[] = [];
	// check websites in small parallel batches
	for (let i = 0; i < cands.length && out.length < limit * 3; i += 6) {
		const batch = await Promise.all(
			cands.slice(i, i + 6).map(async (e) => {
				const t = e.tags;
				const website = (t.website || t['contact:website'] || t.url || '').trim();
				const lat = e.lat ?? e.center?.lat;
				const lon = e.lon ?? e.center?.lon;
				const kind = t.amenity || t.shop || t.craft || t.office || t.healthcare || t.leisure || t.tourism || 'business';
				const insta = t['contact:instagram'] || (/(instagram\.com\/[^\s"'?]+)/i.exec(Object.values(t).join(' '))?.[1] ?? '');
				const fb = t['contact:facebook'] || '';
				const issues: Issue[] = [];
				let checked: Prospect['checked'] = {};
				if (!website) {
					if (sells.has('web') || sells.has('seo')) issues.push({ key: 'no-site', label: 'pas de site web', weight: 45 });
				} else {
					const url = /^https?:/i.test(website) ? website : `https://${website}`;
					const c = await checkSite(url);
					checked = { https: c.https, mobile: c.mobile, ms: c.ms, title: c.title, year: c.year, builder: c.builder, status: c.status };
					if (!c.status || c.status >= 400) issues.push({ key: 'down', label: 'le site ne répond pas', weight: 40 });
					else {
						if (c.https === false) issues.push({ key: 'http', label: 'site non sécurisé (pas de https)', weight: 20 });
						if (c.mobile === false) issues.push({ key: 'mobile', label: 'site pas adapté au mobile', weight: 25 });
						if ((c.ms ?? 0) > 3500) issues.push({ key: 'slow', label: `site lent (${((c.ms ?? 0) / 1000).toFixed(1)} s)`, weight: 15 });
						if (c.year && c.year < new Date().getFullYear() - 3) issues.push({ key: 'old', label: `site pas mis à jour depuis ${c.year}`, weight: 15 });
						if (c.title !== undefined && c.title.length < 8) issues.push({ key: 'title', label: 'pas de titre Google', weight: 10 });
						if (c.builder && ['Wix', 'Jimdo'].includes(c.builder)) issues.push({ key: 'builder', label: `site fait avec ${c.builder}`, weight: 5 });
						if (sells.has('social') && c.html && !/instagram\.com/i.test(c.html) && !insta) issues.push({ key: 'no-insta', label: 'pas de lien Instagram', weight: 20 });
						if (sells.has('app') && c.html && !/(apps\.apple\.com|play\.google\.com)/i.test(c.html) && /fitness|sport|restaurant|clinic|school|hotel/.test(kind)) issues.push({ key: 'no-app', label: 'pas d’app ni de réservation mobile', weight: 10 });
					}
				}
				if (sells.has('social') && !website && !insta && !fb) issues.push({ key: 'no-social', label: 'aucun réseau social trouvé', weight: 25 });
				const score = Math.min(100, issues.reduce((s, x) => s + x.weight, 0));
				if (!score) return null;
				const addr = [t['addr:street'] && `${t['addr:street']} ${t['addr:housenumber'] ?? ''}`.trim(), t['addr:postcode'], t['addr:city']].filter(Boolean).join(', ');
				const top = [...issues].sort((a, b) => b.weight - a.weight).slice(0, 2).map((x) => x.label);
				const p: Prospect = {
					id: `${e.type}/${e.id}`,
					name: t.name,
					category: CAT_FR[kind] ?? kind,
					address: addr,
					city: t['addr:city'] ?? profile.city,
					lat,
					lon,
					website: website || undefined,
					phone: t.phone || t['contact:phone'] || undefined,
					email: t.email || t['contact:email'] || undefined,
					instagram: insta || undefined,
					facebook: fb || undefined,
					score,
					issues,
					checked,
					pitch: top.join(' · '),
					message: MSG[profile.lang]({ biz: t.name, agency: profile.name, issues: top }),
					osmUrl: `https://www.openstreetmap.org/${e.type}/${e.id}`
				};
				return p;
			})
		);
		out.push(...(batch.filter(Boolean) as Prospect[]));
	}
	out.sort((a, b) => b.score - a.score || (a.phone ? -1 : 1));
	return { center, prospects: out.slice(0, limit), scanned: els.length };
}
