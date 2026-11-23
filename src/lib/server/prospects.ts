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
import { googlePlace, type Complaint, type Topic } from './reviews.ts';
import { textLang } from './text-lang.ts';
import { auditSite, pageSpeed } from './site-audit.ts';
import type { AgencyProfile, Service } from './agency-profile.ts';

const UA = 'UndercutBot/1.0 (+https://getundercut.app; prospects)';
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
type Lang = 'fr' | 'nl' | 'en';

export type Issue = { key: string; label: string; weight: number; x?: string /* detail (seconds, year…) to write it in any language */ };
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
	lang?: Lang; // the business's language: messages are written in it
	subject?: string; // email subject of the first message
	detail?: string; // the one real thing the AI noticed about this business
	reviewed?: boolean; // checked and written by the AI reviewer
	budget?: 'high' | 'medium' | 'low'; // can they afford an agency? from the kind of business and what they already invest
	proof?: { label: string; url: string }[]; // links the agency can open (and show the owner) to check the problem
	google?: { rating?: number; count?: number; url?: string }; // the business on Google Maps
	complaint?: Complaint; // what its own customers say on Google that the agency can fix
	v?: number; // analysis version (2 = inner pages, Google speed test, Google reviews)
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
	video: ['catering.restaurant', 'catering.cafe', 'catering.bar', 'accommodation.guest_house', 'accommodation.hotel', 'office.estate_agent', 'sport.fitness.fitness_centre', 'service.beauty', 'service.beauty.hairdresser', 'commercial.clothing', 'commercial.jewelry', 'commercial.furniture_and_interior'],
	ads: ['commercial.furniture_and_interior', 'commercial.outdoor_and_sport.bicycle', 'commercial.health_and_beauty.optician', 'commercial.jewelry', 'office.estate_agent', 'office.insurance', 'sport.fitness.fitness_centre']
};
const OSM: Record<Service, string[]> = {
	web: ['amenity~"^(restaurant|cafe|dentist|doctors|clinic|veterinary|driving_school|language_school)$"', 'shop~"^(bakery|butcher|hairdresser|beauty|florist|clothes|optician|jewelry|furniture|bicycle)$"', 'office~"^(lawyer|accountant|estate_agent|architect|notary)$"', 'craft~"^(carpenter|electrician|plumber|photographer)$"'],
	seo: ['office~"^(lawyer|accountant|estate_agent|architect|notary|insurance)$"', 'amenity~"^(dentist|doctors|clinic|veterinary|driving_school)$"', 'craft~"^(carpenter|electrician|plumber)$"'],
	social: ['amenity~"^(restaurant|cafe|bar|ice_cream)$"', 'shop~"^(beauty|hairdresser|clothes|florist|bakery|chocolate|jewelry|cosmetics|tattoo)$"', 'leisure~"^(fitness_centre)$"', 'tourism~"^(hotel|guest_house)$"'],
	app: ['leisure~"^(fitness_centre|sports_centre)$"', 'amenity~"^(restaurant|driving_school|language_school|clinic|dentist)$"', 'shop~"^(hairdresser|beauty)$"', 'tourism~"^(hotel|guest_house)$"'],
	branding: ['shop~"^(bakery|clothes|florist|chocolate|deli|wine|gift|cosmetics)$"', 'amenity~"^(restaurant|cafe|bar)$"'],
	video: ['amenity~"^(restaurant|cafe|bar)$"', 'tourism~"^(hotel|guest_house)$"', 'office~"^(estate_agent)$"', 'leisure~"^(fitness_centre)$"', 'shop~"^(beauty|hairdresser|clothes|jewelry|furniture)$"'],
	ads: ['shop~"^(furniture|bicycle|optician|jewelry)$"', 'office~"^(estate_agent|insurance)$"', 'leisure~"^(fitness_centre)$"']
};

// ---------- words in the agency's language ----------
const CAT: Record<Lang, Record<string, string>> = {
	en: { restaurant: 'Restaurant', cafe: 'Café', bar: 'Bar', pub: 'Pub', ice_cream: 'Ice cream', dentist: 'Dentist', doctors: 'Doctor', clinic: 'Clinic', clinic_or_praxis: 'Clinic', veterinary: 'Vet', driving_school: 'Driving school', language_school: 'Language school', bakery: 'Bakery', butcher: 'Butcher', hairdresser: 'Hair salon', beauty: 'Beauty salon', tattoo: 'Tattoo studio', florist: 'Florist', clothes: 'Clothing store', clothing: 'Clothing store', optician: 'Optician', jewelry: 'Jeweller', furniture: 'Furniture store', furniture_and_interior: 'Interior store', bicycle: 'Bike shop', deli: 'Deli', drinks: 'Wine & drinks', wine: 'Wine shop', chocolate: 'Chocolatier', gift: 'Gift shop', gift_and_souvenir: 'Gift shop', cosmetics: 'Cosmetics', carpenter: 'Carpenter', electrician: 'Electrician', plumber: 'Plumber', photographer: 'Photographer', lawyer: 'Law firm', accountant: 'Accountant', estate_agent: 'Estate agent', architect: 'Architect', notary: 'Notary', insurance: 'Insurance', fitness_centre: 'Gym', sports_centre: 'Sports centre', hotel: 'Hotel', guest_house: 'Guest house' },
	fr: { restaurant: 'Restaurant', cafe: 'Café', bar: 'Bar', pub: 'Bar', ice_cream: 'Glacier', dentist: 'Dentiste', doctors: 'Médecin', clinic: 'Clinique', clinic_or_praxis: 'Cabinet médical', veterinary: 'Vétérinaire', driving_school: 'Auto-école', language_school: 'École de langues', bakery: 'Boulangerie', butcher: 'Boucherie', hairdresser: 'Coiffeur', beauty: 'Institut de beauté', tattoo: 'Tatoueur', florist: 'Fleuriste', clothes: 'Boutique de vêtements', clothing: 'Boutique de vêtements', optician: 'Opticien', jewelry: 'Bijouterie', furniture: 'Meubles', furniture_and_interior: 'Décoration', bicycle: 'Vélos', deli: 'Épicerie fine', drinks: 'Caviste', wine: 'Caviste', chocolate: 'Chocolatier', gift: 'Cadeaux', gift_and_souvenir: 'Cadeaux', cosmetics: 'Cosmétiques', carpenter: 'Menuisier', electrician: 'Électricien', plumber: 'Plombier', photographer: 'Photographe', lawyer: 'Avocat', accountant: 'Comptable', estate_agent: 'Agence immobilière', architect: 'Architecte', notary: 'Notaire', insurance: 'Assurances', fitness_centre: 'Salle de sport', sports_centre: 'Centre sportif', hotel: 'Hôtel', guest_house: "Maison d'hôtes" },
	nl: { restaurant: 'Restaurant', cafe: 'Café', bar: 'Bar', pub: 'Café', ice_cream: 'IJssalon', dentist: 'Tandarts', doctors: 'Dokter', clinic: 'Kliniek', clinic_or_praxis: 'Praktijk', veterinary: 'Dierenarts', driving_school: 'Rijschool', language_school: 'Taalschool', bakery: 'Bakkerij', butcher: 'Slagerij', hairdresser: 'Kapper', beauty: 'Schoonheidssalon', tattoo: 'Tattooshop', florist: 'Bloemist', clothes: 'Kledingwinkel', clothing: 'Kledingwinkel', optician: 'Opticien', jewelry: 'Juwelier', furniture: 'Meubelwinkel', furniture_and_interior: 'Interieurwinkel', bicycle: 'Fietsenwinkel', deli: 'Delicatessen', drinks: 'Wijnhandel', wine: 'Wijnhandel', chocolate: 'Chocolatier', gift: 'Cadeauwinkel', gift_and_souvenir: 'Cadeauwinkel', cosmetics: 'Cosmetica', carpenter: 'Schrijnwerker', electrician: 'Elektricien', plumber: 'Loodgieter', photographer: 'Fotograaf', lawyer: 'Advocaat', accountant: 'Boekhouder', estate_agent: 'Immokantoor', architect: 'Architect', notary: 'Notaris', insurance: 'Verzekeringen', fitness_centre: 'Fitness', sports_centre: 'Sportcentrum', hotel: 'Hotel', guest_house: 'B&B' }
};
const L: Record<Lang, Record<string, (x?: string) => string>> = {
	en: { 'no-site': () => 'no website found', down: () => 'website not responding', http: () => 'not secure (no https)', mobile: () => 'not mobile-friendly', slow: (x) => `slow on mobile (${x} s)`, old: (x) => `not updated since ${x}`, title: () => 'no Google title', builder: (x) => `built with ${x}`, 'no-insta': () => 'no Instagram linked on the website', 'no-tiktok': () => 'no TikTok linked on the website', 'no-social': () => 'no social media linked on the website', 'no-app': () => 'no online booking found on the website', 'no-hours': () => 'opening hours not on the website', 'no-prices': () => 'no prices or menu on the website', 'no-tel': () => 'phone number not tappable on mobile', 'no-desc': () => 'no description for Google', psi: (x) => `Google’s mobile test: ${x?.split('|')[0]} s before the page shows (score ${x?.split('|')[1]}/100)`, 'no-video': () => 'no photos or videos that show the place', review: (x) => `a customer on Google: “${x}”` },
	fr: { 'no-site': () => 'pas de site web trouvé', down: () => 'le site ne répond pas', http: () => 'site non sécurisé (pas de https)', mobile: () => 'site pas adapté au mobile', slow: (x) => `site lent sur mobile (${x} s)`, old: (x) => `pas mis à jour depuis ${x}`, title: () => 'pas de titre Google', builder: (x) => `site fait avec ${x}`, 'no-insta': () => 'pas d’Instagram relié au site', 'no-tiktok': () => 'pas de TikTok relié au site', 'no-social': () => 'aucun réseau social relié au site', 'no-app': () => 'pas de réservation en ligne trouvée sur le site', 'no-hours': () => 'les horaires ne sont pas sur le site', 'no-prices': () => 'pas de prix ni de carte sur le site', 'no-tel': () => 'le numéro n’est pas cliquable sur mobile', 'no-desc': () => 'pas de description pour Google', psi: (x) => `test mobile de Google : ${x?.split('|')[0].replace('.', ',')} s avant que la page s’affiche (score ${x?.split('|')[1]}/100)`, 'no-video': () => 'pas de photos ni de vidéos qui montrent le lieu', review: (x) => `un client sur Google : « ${x} »` },
	nl: { 'no-site': () => 'geen website gevonden', down: () => 'website reageert niet', http: () => 'niet beveiligd (geen https)', mobile: () => 'niet mobielvriendelijk', slow: (x) => `traag op mobiel (${x} s)`, old: (x) => `niet bijgewerkt sinds ${x}`, title: () => 'geen Google-titel', builder: (x) => `gemaakt met ${x}`, 'no-insta': () => 'geen Instagram gelinkt op de website', 'no-tiktok': () => 'geen TikTok gelinkt op de website', 'no-social': () => 'geen sociale media gelinkt op de website', 'no-app': () => 'geen online boeking gevonden op de website', 'no-hours': () => 'openingsuren staan niet op de website', 'no-prices': () => 'geen prijzen of menukaart op de website', 'no-tel': () => 'telefoonnummer niet aanklikbaar op gsm', 'no-desc': () => 'geen beschrijving voor Google', psi: (x) => `mobiele test van Google: ${x?.split('|')[0].replace('.', ',')} s voor de pagina verschijnt (score ${x?.split('|')[1]}/100)`, 'no-video': () => 'geen foto’s of video’s die de zaak tonen', review: (x) => `een klant op Google: “${x}”` }
};

// first message, shaped by what the agency sells
// ---------- the first message: in the business's language, built to get a "yes" (no call required) ----------
type Main = 'web' | 'social' | 'app' | 'branding' | 'seo' | 'ads' | 'video';
const VALUE: Record<Lang, Record<Main, string>> = {
	fr: { web: 'des sites rapides, clairs sur mobile, qui transforment les visites en appels et en réservations', social: 'des comptes Instagram et TikTok qui donnent envie de venir, avec du contenu régulier et simple à gérer', app: 'une réservation en ligne ou une petite app pour que vos clients réservent en deux clics et reviennent', branding: 'une image claire et reconnaissable, du logo à la vitrine, pour qu’on se souvienne de vous', seo: 'faire remonter les commerces locaux sur Google et Google Maps, là où les clients cherchent', video: 'des photos et des vidéos courtes qui donnent envie de pousser la porte, pour votre site et vos réseaux', ads: 'des campagnes Google et Instagram ciblées sur votre quartier, avec un budget que vous maîtrisez' },
	nl: { web: 'snelle websites die op gsm duidelijk zijn en bezoekers omzetten in telefoontjes en reservaties', social: 'Instagram- en TikTok-accounts die zin geven om langs te komen, met regelmatige content die eenvoudig blijft', app: 'online reserveren of een kleine app, zodat klanten in twee klikken boeken en terugkomen', branding: 'een duidelijk en herkenbaar beeld, van logo tot etalage, zodat men u onthoudt', seo: 'lokale zaken hoger laten verschijnen in Google en Google Maps, waar klanten zoeken', video: 'foto’s en korte video’s die zin geven om binnen te stappen, voor uw website en sociale media', ads: 'Google- en Instagram-campagnes gericht op uw buurt, met een budget dat u zelf bepaalt' },
	en: { web: 'fast websites that are clear on mobile and turn visits into calls and bookings', social: 'Instagram and TikTok accounts that make people want to come by, with regular content that stays easy to run', app: 'online booking or a small app so customers book in two taps and come back', branding: 'a clear, recognisable look, from logo to shopfront, so people remember you', seo: 'getting local businesses higher on Google and Google Maps, where customers search', video: 'photos and short videos that make people want to walk in, for your website and socials', ads: 'Google and Instagram campaigns aimed at your neighbourhood, on a budget you control' }
};
const COST: Record<Lang, Record<Main, string>> = {
	fr: { web: 'Concrètement, une partie des personnes qui vous cherchent sur leur téléphone repartent sans vous contacter.', social: 'Aujourd’hui, beaucoup de clients regardent Instagram avant de choisir où aller : sans présence, ils choisissent quelqu’un d’autre.', app: 'Beaucoup de clients préfèrent réserver en ligne plutôt que d’appeler, surtout le soir.', branding: 'Quand l’image ne marque pas, les clients ont plus de mal à se souvenir de vous et à vous recommander.', seo: 'Quand on vous cherche sur Google, ce sont souvent vos concurrents qui apparaissent en premier.', video: 'Avant de venir, les clients veulent voir l’endroit : sans images, ils hésitent.', ads: 'Sans visibilité en ligne, les personnes du quartier qui cherchent ce que vous proposez ne vous voient pas.' },
	nl: { web: 'Concreet: een deel van de mensen die u op hun gsm zoeken, haakt af zonder contact op te nemen.', social: 'Veel klanten kijken eerst op Instagram voor ze kiezen waar ze heen gaan: zonder aanwezigheid kiezen ze iemand anders.', app: 'Veel klanten boeken liever online dan te bellen, zeker ’s avonds.', branding: 'Als het beeld niet blijft hangen, onthouden en aanbevelen klanten u minder snel.', seo: 'Wie u zoekt op Google, ziet vaak eerst uw concurrenten.', video: 'Klanten willen de zaak zien voor ze komen: zonder beelden twijfelen ze.', ads: 'Zonder online zichtbaarheid zien mensen uit de buurt die zoeken wat u aanbiedt, u niet.' },
	en: { web: 'In practice, some of the people looking for you on their phone leave without getting in touch.', social: 'Many customers check Instagram before choosing where to go: without a presence, they pick someone else.', app: 'Many customers would rather book online than call, especially in the evening.', branding: 'When a brand doesn’t stick, customers find it harder to remember and recommend you.', seo: 'When people search for you on Google, your competitors often show up first.', video: 'Before coming, customers want to see the place: without images, they hesitate.', ads: 'Without visibility online, people nearby looking for what you offer don’t see you.' }
};
// GDPR / good practice: every first message says how to stop receiving them
export const OPT_OUT: Record<Lang, string> = { en: 'If you’d rather not hear from me, just reply “no” and I won’t write again.', fr: 'Si vous préférez ne plus recevoir de message de ma part, répondez simplement « non ».', nl: 'Liever geen berichten meer van mij? Antwoord gewoon “nee”.' };
type MsgIn = { biz: string; agency: string; issues: string[]; main: Main; category: string; city: string; review?: string; site?: string };
export const SUBJECT: Record<Lang, (p: MsgIn) => string> = {
	fr: ({ biz, main }) => `${biz} : ${main === 'social' ? 'une idée pour attirer plus de clients via Instagram' : main === 'app' ? 'une idée pour remplir plus facilement votre agenda' : main === 'branding' ? 'une idée pour vous démarquer' : main === 'seo' ? 'une idée pour être mieux trouvé sur Google' : main === 'video' ? 'une idée pour montrer votre lieu' : main === 'ads' ? 'une idée pour attirer les clients du quartier' : 'une idée pour avoir plus de clients via votre site'}`,
	nl: ({ biz, main }) => `${biz}: ${main === 'social' ? 'een idee om meer klanten via Instagram te krijgen' : main === 'app' ? 'een idee om uw agenda makkelijker te vullen' : main === 'branding' ? 'een idee om op te vallen' : main === 'seo' ? 'een idee om beter gevonden te worden op Google' : main === 'video' ? 'een idee om uw zaak te tonen' : main === 'ads' ? 'een idee om klanten uit de buurt aan te trekken' : 'een idee voor meer klanten via uw website'}`,
	en: ({ biz, main }) => `${biz}: ${main === 'social' ? 'an idea to bring in more customers through Instagram' : main === 'app' ? 'an idea to fill your bookings more easily' : main === 'branding' ? 'an idea to stand out' : main === 'seo' ? 'an idea to be found more easily on Google' : main === 'video' ? 'an idea to show off your place' : main === 'ads' ? 'an idea to bring in customers from your area' : 'an idea to get more customers from your website'}`
};
const MSG: Record<Lang, (p: MsgIn) => string> = {
	fr: (p) => `Bonjour,\n\nEn cherchant « ${p.category.toLowerCase()} ${p.city} », j’ai découvert ${p.biz}${p.site ? ` et j’ai regardé votre site (${p.site})` : ''}. ${p.issues.length > 1 ? 'Deux choses m’ont frappé' : 'Une chose m’a frappé'} : ${p.issues.join(', et ')}.\n${p.review ? `Dans vos avis Google, un client écrit d’ailleurs : « ${p.review} ». C’est typiquement le genre de détail qui se règle en ligne.\n` : ''}${COST.fr[p.main]}\n\nC’est exactement ce que nous faisons chez ${p.agency} : ${VALUE.fr[p.main]}.\n\nJe vous propose quelque chose de simple : je vous envoie gratuitement 3 améliorations concrètes pour ${p.biz}, que vous pourrez appliquer avec ou sans nous. Répondez simplement « oui ».\nSi vous préférez un coup de fil ou que je passe vous voir, dites-moi ce qui vous arrange.\n\nBelle journée,\n${p.agency}\n\n${OPT_OUT.fr}`,
	nl: (p) => `Goeiedag,\n\nToen ik zocht op “${p.category.toLowerCase()} ${p.city}”, ontdekte ik ${p.biz}${p.site ? ` en bekeek ik uw website (${p.site})` : ''}. ${p.issues.length > 1 ? 'Twee dingen vielen me op' : 'Eén ding viel me op'}: ${p.issues.join(', en ')}.\n${p.review ? `In uw Google-reviews schrijft een klant trouwens: “${p.review}”. Precies zoiets los je online op.\n` : ''}${COST.nl[p.main]}\n\nDat is precies wat we bij ${p.agency} doen: ${VALUE.nl[p.main]}.\n\nMijn voorstel is eenvoudig: ik stuur u gratis 3 concrete verbeteringen voor ${p.biz}, die u met of zonder ons kunt toepassen. Antwoord gewoon “ja”.\nBelt u liever even, of kom ik eens langs? Zeg maar wat u het beste past.\n\nFijne dag,\n${p.agency}\n\n${OPT_OUT.nl}`,
	en: (p) => `Hi,\n\nSearching for “${p.category.toLowerCase()} ${p.city}”, I came across ${p.biz}${p.site ? ` and looked at your website (${p.site})` : ''}. ${p.issues.length > 1 ? 'Two things stood out' : 'One thing stood out'}: ${p.issues.join(', and ')}.\n${p.review ? `In your Google reviews, a customer also writes: “${p.review}”. That’s exactly the kind of thing that can be fixed online.\n` : ''}${COST.en[p.main]}\n\nThat’s exactly what we do at ${p.agency}: ${VALUE.en[p.main]}.\n\nHere’s a simple offer: I’ll send you 3 concrete improvements for ${p.biz}, free, that you can use with or without us. Just reply “yes”.\nIf you’d rather have a quick call or have me drop by, tell me what suits you.\n\nBest,\n${p.agency}\n\n${OPT_OUT.en}`
};

// The message talks about the agency's service that fixes this business's biggest problem
// (a web + social agency writes about Instagram to a shop whose problem is Instagram).
const ISSUE_SERVICE: Record<string, Main> = { 'no-site': 'web', down: 'web', http: 'web', mobile: 'web', slow: 'web', old: 'web', builder: 'branding', title: 'seo', 'no-social': 'social', 'no-insta': 'social', 'no-tiktok': 'social', 'no-app': 'app', 'no-video': 'video', 'no-hours': 'seo', 'no-prices': 'web', 'no-tel': 'web', 'no-desc': 'seo', psi: 'web' };
// a Google complaint about booking → the agency's booking/app offer, about hours → Google profile (SEO), etc.
const TOPIC_SERVICE: Record<Topic, Main[]> = { hours: ['seo', 'web'], booking: ['app', 'web'], phone: ['web', 'app'], website: ['web', 'seo'], menu: ['web', 'social'], photos: ['video', 'social', 'web'], find: ['seo', 'web', 'ads'] };
const topicService = (t: Topic, sells: Set<string>, fallback: Main): Main => TOPIC_SERVICE[t].find((m) => sells.has(m)) ?? fallback;
function mainFor(issues: Issue[], sells: Set<string>, fallback: Main): Main {
	for (const x of [...issues].sort((a, b) => b.weight - a.weight)) {
		const sv = ISSUE_SERVICE[x.key];
		if (sv && sells.has(sv)) return sv;
		// web problems are also SEO, ads or branding problems for agencies that sell those
		if (sv === 'web') for (const alt of ['seo', 'ads', 'branding'] as Main[]) if (sells.has(alt)) return alt;
	}
	return fallback;
}

// ---------- the business's language ----------
// What their site is actually written in (the words, not the <html lang> tag: many French sites keep a template's lang="en-US"),
// else the postcode (Brussels and Wallonia → French, Flanders → Dutch). In Belgium and France it is never English by default.
export function prospectLang(html: string, address: string, country: string, fallback: Lang): Lang {
	const t = html ? textLang(html) : null;
	if (t) return t;
	if (/\b(france|frankrijk)\b/i.test(address) || country === 'FR') return 'fr';
	if (country === 'NL') return 'nl';
	const pc = Number(/\b([1-9]\d{3})\b/.exec(address)?.[1] ?? 0);
	if (pc) {
		if ((pc >= 1000 && pc <= 1299) || (pc >= 1300 && pc <= 1499) || (pc >= 4000 && pc <= 7999)) return 'fr';
		if ((pc >= 1500 && pc <= 3999) || (pc >= 8000 && pc <= 9999)) return 'nl';
	}
	if (/brux|brussel|liège|namur|charleroi|mons\b/i.test(address)) return 'fr';
	if (/antwerp|gent|ghent|leuven|brugge|hasselt|mechelen/i.test(address)) return 'nl';
	const tag = /<html[^>]+lang=["']?([a-z]{2})/i.exec(html)?.[1]?.toLowerCase();
	if (tag === 'fr' || tag === 'nl') return tag;
	if (country === 'BE' || country === 'LU' || !country) return fallback === 'en' ? 'fr' : fallback;
	return fallback;
}

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

/** Try name.be / name.com / name.fr… and keep the first that answers and mentions the business. */
async function guessWebsite(name: string, country: string): Promise<string> {
	const base = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, 'et').replace(/[^a-z0-9]+/g, ' ').trim();
	if (!base || base.length < 3) return '';
	const words = base.split(' ').filter((w) => w.length > 2);
	const slugs = [...new Set([base.replace(/ /g, ''), base.replace(/ /g, '-')])].slice(0, 2);
	const tlds = country === 'FR' ? ['fr', 'com'] : country === 'NL' ? ['nl', 'com'] : ['be', 'com', 'brussels', 'fr'];
	for (const slug of slugs)
		for (const tld of tlds) {
			const url = `https://${slug}.${tld}`;
			try {
				const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(4000), headers: { 'user-agent': UA } });
				if (!r.ok) continue;
				const html = (await r.text()).slice(0, 200_000).toLowerCase();
				// parked domains and unrelated sites don't mention the business
				if (words.length && words.filter((w) => html.includes(w)).length >= Math.min(2, words.length) && !/domain (is )?for sale|buy this domain|parked/i.test(html)) return url;
			} catch {
				/* next */
			}
		}
	return '';
}

function hash(s: string) {
	let h = 2166136261;
	for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
	return h >>> 0;
}

// places where customers look for opening hours / prices before coming
const SHOP_KINDS = /restaurant|cafe|bar|pub|ice_cream|bakery|butcher|hairdresser|beauty|florist|clothes|clothing|optician|jewelry|furniture|bicycle|deli|wine|drinks|chocolate|gift|cosmetics|tattoo|fitness|sports_centre|dentist|doctors|clinic|veterinary/;
const PRICE_KINDS = /restaurant|cafe|bar|ice_cream|hairdresser|beauty|tattoo|fitness|sports_centre|driving_school|language_school|photographer|guest_house/;
const BOOKING_KINDS = /fitness|sports_centre|restaurant|clinic|dentist|driving_school|language_school|hairdresser|beauty|hotel|guest_house/;

/** Find up to `limit` prospects for this agency. `exclude` = ids already seen (pipeline), so each run brings new ones. */
// ---------- can they pay? ----------
// Kinds of business that usually have the margin for an agency retainer vs. very small shops.
const HIGH = /^(lawyer|notary|accountant|architect|estate_agent|insurance|dentist|clinic|clinic_or_praxis|doctors|veterinary|guest_house|optician|jewelry|furniture|furniture_and_interior|fitness_centre|sports_centre|driving_school|language_school)$/;
const LOW = /^(ice_cream|kiosk|convenience|takeaway|fast_food)$/;
function budgetOf(pl: Place, checked: Prospect['checked']): 'high' | 'medium' | 'low' {
	let pts = HIGH.test(pl.kind) ? 2 : LOW.test(pl.kind) ? -1 : 1;
	if (pl.website && checked.status && checked.status < 400) pts += 1; // they already pay for a site
	if (pl.hours) pts += 0.5;
	if (pl.insta || pl.fb) pts += 0.5;
	return pts >= 3 ? 'high' : pts >= 1.5 ? 'medium' : 'low';
}
const BUDGET_WEIGHT = { high: 1.05, medium: 1, low: 0.85 }; // a nudge only: small local shops stay first
const BUDGET_WEIGHT_BIG = { high: 1.3, medium: 1, low: 0.6 }; // agencies that want bigger clients

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
	const main: Main = sells.has('web') ? 'web' : sells.has('social') ? 'social' : sells.has('seo') ? 'seo' : sells.has('ads') ? 'ads' : sells.has('video') ? 'video' : sells.has('app') ? 'app' : 'branding';
	const T = L[lang];

	// candidates: no chains, not seen before, deterministic shuffle per agency so two agencies don't get the same list
	// a name seen 3+ times around here = a chain, even without a brand tag
	const seen = new Map<string, number>();
	for (const p of places) seen.set(p.name.toLowerCase(), (seen.get(p.name.toLowerCase()) ?? 0) + 1);
	// well-known chains that OpenStreetMap does not always tag with a brand
	const target = profile.target ?? 'small';
	// big organisations are not "small local businesses"
	const BIG = /\b(hotel|hôtel|group|groupe|international|holding|s\.?a\.?|n\.?v\.?|ltd|gmbh|university|université|hospital|hôpital|ziekenhuis|ministry|commission|european)\b/i;
	const CHAIN = /^(nh|ibis|novotel|mercure|radisson|hilton|marriott|sheraton|holiday inn|best western|motel one|b&b hotel|starbucks|mcdonald|burger king|quick|kfc|subway|exki|le pain quotidien|panos|delhaize|carrefour|colruyt|aldi|lidl|albert heijn|basic-fit|jims|kruidvat|di |hema|zara|h&m|o'tacos|pizza hut|domino)\b/i;
	const cands = places
		.filter((p) => !p.brand && !CHAIN.test(p.name) && (target !== 'small' || (!BIG.test(p.name) && p.kind !== 'hotel')) && (target !== 'big' || HIGH.test(p.kind) || BIG.test(p.name) || p.kind === 'hotel') && !p.closed && (seen.get(p.name.toLowerCase()) ?? 0) < 3 && !exclude.has(p.id))
		.map((p) => ({ p, r: hash(profile.url + p.id) }))
		.sort((a, b) => a.r - b.r)
		.map((x) => x.p)
		.slice(0, Math.max(limit * 6, 30));

	const out: Prospect[] = [];
	const pages = new Map<string, string>(); // site html per prospect, for the AI reviewer
	const msgs = new Map<string, MsgIn>(); // message inputs, to rewrite it once we know their Google reviews
	for (let i = 0; i < cands.length && out.length < limit * 3; i += 6) {
		const batch = await Promise.all(
			cands.slice(i, i + 6).map(async (pl): Promise<Prospect | null> => {
				const issues: Issue[] = [];
				const add = (key: string, weight: number, x?: string) => issues.push({ key, weight, label: T[key](x), x });
				let checked: Prospect['checked'] = {};
				let html = '';
				let audit: Awaited<ReturnType<typeof auditSite>> | null = null;
				// the map often lacks the website: try the obvious domains before saying there is none
				if (!pl.website) pl.website = await guessWebsite(pl.name, profile.country || '');
				if (!pl.website) {
					if (webish) add('no-site', 45);
				} else {
					const url = /^https?:/i.test(pl.website) ? pl.website : `https://${pl.website}`;
					const c = await checkSite(url);
					html = c.html ?? '';
					checked = { https: c.https, mobile: c.mobile, ms: c.ms, title: c.title, year: c.year, builder: c.builder, status: c.status };
					// read the contact / booking / menu pages too, not just the home page
					if (html && c.status && c.status < 400) {
						audit = await auditSite(url, html);
						html = audit.html;
					}
					if (!c.status || c.status >= 400) {
						if (webish) add('down', 30);
					} else if (webish) {
						if (c.https === false) add('http', 20);
						if (c.mobile === false) add('mobile', 25);
						if (c.year && c.year < new Date().getFullYear() - 3) add('old', 15, String(c.year));
						if (c.title !== undefined && c.title.length < 8) add('title', 10);
						if (c.builder && ['Wix', 'Jimdo'].includes(c.builder)) add('builder', 5, c.builder);
						// what a customer looks for on the site and can't find
						if (audit) {
							if (SHOP_KINDS.test(pl.kind) && !audit.hours && !pl.hours) add('no-hours', 15);
							if (PRICE_KINDS.test(pl.kind) && !audit.prices) add('no-prices', 12);
							if (!audit.tel) add('no-tel', 8);
							if (!audit.desc && (sells.has('seo') || sells.has('web'))) add('no-desc', 8);
						}
					}
				}
				// social claims only when we could read their own site (otherwise we simply don't know)
				if (sells.has('social') && html) {
					const hasInsta = Boolean(pl.insta) || /instagram\.com\//i.test(html);
					const hasTikTok = Boolean(pl.tiktok) || /tiktok\.com\/@/i.test(html);
					const hasFb = Boolean(pl.fb) || /facebook\.com\//i.test(html);
					if (!hasInsta && !hasTikTok && !hasFb) add('no-social', 40);
					else {
						if (!hasInsta) add('no-insta', 25);
						if (!hasTikTok) add('no-tiktok', 10);
					}
				}
				// photo & video agencies: a site with no video and almost no photos of the place
				if (sells.has('video') && html && !/(youtube\.com|youtu\.be|vimeo\.com|<video|tiktok\.com|instagram\.com\/reel)/i.test(html) && (html.match(/<img/gi)?.length ?? 0) < 6) add('no-video', 30);
				if ((sells.has('app') || sells.has('web')) && BOOKING_KINDS.test(pl.kind) && audit && audit.pages > 1 && !audit.booking) add('no-app', sells.has('app') ? 30 : 15);

				// contacts the map doesn't have, from their own site
				const email = pl.email || audit?.email || '';
				const phone = pl.phone || (/href=["']tel:([+\d][\d\s./-]{6,})["']/i.exec(html)?.[1]?.trim() ?? '');
				const instaUrl = pl.insta || (/((?:https?:\/\/)?(?:www\.)?instagram\.com\/(?!p\/|reel\/|explore\/)[A-Za-z0-9_.]+)/i.exec(html)?.[1] ?? '');
				// no way to reach them = not a lead; a dead site and no phone usually means the place closed
				if (!email && !phone && !instaUrl && !pl.fb) return null;
				if (pl.website && (!checked.status || checked.status >= 400) && !phone && !email) return null;

				pages.set(pl.id, html);
				// the message speaks the business's language (its site, else its postcode)
				const plang = prospectLang(html, `${pl.address} ${pl.city}`, profile.country || '', lang);
				const mi: MsgIn = { biz: pl.name, agency: profile.name, main: mainFor(issues, sells, main), category: CAT[plang][pl.kind] ?? CAT.en[pl.kind] ?? pl.kind.replace(/_/g, ' '), city: pl.city || profile.city, site: pl.website ? pl.website.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '') : undefined, issues: [...issues].sort((a, b) => b.weight - a.weight).slice(0, 2).map((x) => L[plang][x.key](x.x)) };
				msgs.set(pl.id, mi);
				const budget = budgetOf(pl, checked);
				const score = Math.min(100, Math.round(issues.reduce((s, x) => s + x.weight, 0) * (target === 'big' ? BUDGET_WEIGHT_BIG : BUDGET_WEIGHT)[budget]));
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
					lang: plang,
					subject: SUBJECT[plang](mi),
					message: MSG[plang](mi),
					osmUrl: pl.osmUrl,
					v: 2
				};
			})
		);
		out.push(...(batch.filter(Boolean) as Prospect[]));
	}
	// most in need (weighted by budget) first; those you can email before the rest
	out.sort((a, b) => b.score - a.score || (b.email ? 1 : 0) - (a.email ? 1 : 0) || (b.phone ? 1 : 0) - (a.phone ? 1 : 0));
	// AI reviewer + writer on the best few: drop what doesn't fit, personalise the first message
	// for the few we keep: Google's mobile speed test, and their Google Maps listing (rating, website/phone Google knows,
	// and what their own customers complain about). Then the message is rewritten with these real details.
	const short = (
		await Promise.all(
			out.slice(0, limit + 3).map(async (p): Promise<Prospect | null> => {
				const url = p.website ? (/^https?:/i.test(p.website) ? p.website : `https://${p.website}`) : '';
				const [g, speed] = await Promise.all([googlePlace(p, sells), url && webish && (!p.checked.status || p.checked.status < 400) && p.checked.status ? pageSpeed(url) : Promise.resolve(null)]);
				const pl = p.lang ?? lang;
				let issues = p.issues;
				// Google knows their website: never claim there is none
				if (g?.website && !p.website) issues = issues.filter((x) => x.key !== 'no-site');
				if (speed && speed.score < 50) issues = [...issues.filter((x) => x.key !== 'mobile' || p.checked.mobile === false), { key: 'psi', weight: speed.score < 30 ? 30 : 20, label: L[lang].psi(`${speed.lcp}|${speed.score}`), x: `${speed.lcp}|${speed.score}` }];
				const c = g?.complaints[0];
				if (c) issues = [...issues, { key: 'review', weight: 35, label: L[lang].review(c.quote), x: c.quote }];
				if (!issues.length) return null;
				const top = [...issues].sort((a, b) => b.weight - a.weight);
				const next: Prospect = {
					...p,
					issues,
					score: Math.min(100, p.score + (c ? 25 : 0) + (speed && speed.score < 50 ? 10 : 0)),
					pitch: top.slice(0, 2).map((x) => x.label).join(' · '),
					website: p.website || g?.website,
					phone: p.phone || g?.phone,
					google: g ? { rating: g.rating, count: g.count, url: g.url } : undefined,
					complaint: c,
					proof: [
						...(c && g?.url ? [{ label: lang === 'fr' ? 'Leurs avis Google' : lang === 'nl' ? 'Hun Google-reviews' : 'Their Google reviews', url: g.url }] : []),
						...(speed && url ? [{ label: lang === 'fr' ? `Test mobile Google (${speed.score}/100)` : lang === 'nl' ? `Mobiele test van Google (${speed.score}/100)` : `Google mobile test (${speed.score}/100)`, url: `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}&form_factor=mobile` }] : []),
						...(p.proof ?? []).filter((x) => !(speed && x.url.includes('pagespeed')))
					].slice(0, 3)
				};
				const mi = msgs.get(p.id);
				if (mi) {
					const m: MsgIn = { ...mi, main: c ? topicService(c.topic, sells, mi.main) : mainFor(issues, sells, mi.main), issues: top.filter((x) => x.key !== 'review').slice(0, 2).map((x) => L[pl][x.key](x.x)), review: c?.quote };
					if (!m.issues.length && c) m.issues = [L[pl].review(c.quote)];
					next.message = MSG[pl](m);
					next.subject = SUBJECT[pl](m);
				}
				return next;
			})
		)
	).filter((p): p is Prospect => Boolean(p));
	short.sort((a, b) => b.score - a.score);
	const reviews = await Promise.all(short.map((p) => reviewLead({ name: p.name, category: p.category, city: p.city, address: p.address, website: p.website, issues: p.issues.filter((x) => x.key !== 'review').map((x) => x.label), complaints: p.complaint ? [p.complaint.quote] : [], html: pages.get(p.id) ?? '', agency: profile.name, services, lang: p.lang ?? lang, optOut: OPT_OUT[p.lang ?? lang] })));
	const final: Prospect[] = [];
	short.forEach((p, i) => {
		const r = reviews.at(i);
		if (r && !r.keep) return;
		if (!r) return void final.push(p);
		// the web says otherwise: drop the claims that turned out false
		const wrong = new Set<string>();
		if (r.found.website) wrong.add('no-site');
		if (r.found.instagram) ['no-insta', 'no-social'].forEach((k) => wrong.add(k));
		if (r.found.tiktok) ['no-tiktok', 'no-social'].forEach((k) => wrong.add(k));
		const issues = p.issues.filter((x) => !wrong.has(x.key));
		if (!issues.length) return; // nothing real to improve
		final.push({ ...p, issues, pitch: [...issues].sort((a, b) => b.weight - a.weight).slice(0, 2).map((x) => x.label).join(' · '), website: p.website || r.found.website, instagram: p.instagram || r.found.instagram, email: p.email || r.found.email, message: r.message, subject: r.subject || p.subject, detail: r.detail || undefined, reviewed: true });
	});
	return { center, prospects: final.slice(0, limit), scanned: places.length, source };
}
