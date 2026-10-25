// Test server: simulates Shopify stores and a search engine, no internet needed.
//   npm run fake-shopify            → http://localhost:4545
//   curl localhost:4545/__tick      → simulates one day of competitor changes
// Use it by setting FAKE_SHOPIFY_URL=http://localhost:4545 in .env
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT || 4545);

let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (a) => a[Math.floor(rnd() * a.length)];

const TEAMS = ['Belgium', 'Anderlecht', 'Club Brugge', 'Standard', 'Ajax', 'Feyenoord', 'Brazil', 'Italy', 'France', 'Argentina', 'Union SG', 'Napoli', 'Milan', 'Barcelona', 'Netherlands', 'England'];
const YEARS = [1978, 1982, 1986, 1990, 1994, 1998, 2002, 2006];

function football(n, base, words) {
	return Array.from({ length: n }, (_, i) => {
		const team = pick(TEAMS);
		const type = rnd() < 0.7 ? 'Football Shirt' : rnd() < 0.5 ? 'Scarf' : 'Track Jacket';
		const price = Math.round(base[type] * (0.8 + rnd() * 0.5));
		const title =
			type === 'Football Shirt' ? `${team} ${pick(YEARS)} ${pick(words)} football shirt` : type === 'Scarf' ? `${team} ${pick(words)} scarf` : `${team} ${pick(words)} track jacket`;
		return { title, type, price, compare: null, available: rnd() > 0.08, created: '2024-03-01T10:00:00Z' };
	});
}

function other(n, items) {
	return Array.from({ length: n }, () => {
		const [title, type, price] = pick(items);
		return { title: `${title} ${Math.floor(rnd() * 90 + 10)}`, type, price: Math.round(price * (0.8 + rnd() * 0.4)), compare: null, available: true, created: '2024-03-01T10:00:00Z' };
	});
}

const KIT = { 'Football Shirt': 75, Scarf: 22, 'Track Jacket': 90 };
const STORES = {
	'retrokits.be': { name: 'Retro Kits', currency: 'EUR', country: 'BE', lang: 'nl', items: football(140, KIT, ['retro', 'vintage', 'home', 'away']) },
	'vintagefoot.be': { name: 'Vintage Foot', currency: 'EUR', country: 'BE', lang: 'fr', items: football(220, KIT, ['vintage', 'retro', 'classic']) },
	'classicjerseys.eu': { name: 'Classic Jerseys', currency: 'EUR', country: 'NL', lang: 'en', items: football(400, { 'Football Shirt': 85, Scarf: 25, 'Track Jacket': 110 }, ['classic', 'retro', 'home']) },
	'kitstory.fr': { name: 'Kit Story', currency: 'EUR', country: 'FR', lang: 'fr', items: football(90, { 'Football Shirt': 65, Scarf: 18, 'Track Jacket': 80 }, ['retro', 'away', 'third']) },
	'goalhouse.nl': { name: 'Goal House', currency: 'EUR', country: 'NL', lang: 'nl', items: football(160, KIT, ['retro', 'vintage', 'away']) },
	'terracekits.be': { name: 'Terrace Kits', currency: 'EUR', country: 'BE', lang: 'nl', items: football(60, { 'Football Shirt': 95, Scarf: 30, 'Track Jacket': 120 }, ['terrace', 'casual', 'retro']) },
	'glowskin.be': { name: 'Glow Skin', currency: 'EUR', country: 'BE', lang: 'nl', items: other(80, [['Vitamin C serum', 'Skincare', 35], ['Night cream', 'Skincare', 42], ['Lip balm', 'Lips', 9]]) },
	'urbanplants.be': { name: 'Urban Plants', currency: 'EUR', country: 'BE', lang: 'nl', items: other(70, [['Monstera plant', 'Plants', 39], ['Ceramic pot', 'Pots', 25], ['Plant food', 'Care', 12]]) }
};
for (const [domain, s] of Object.entries(STORES)) s.items.forEach((p, i) => (p.id = Number(`${Object.keys(STORES).indexOf(domain) + 1}${String(i).padStart(5, '0')}`)));

const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const toShopify = (p) => ({
	id: p.id,
	title: p.title,
	handle: `${slug(p.title)}-${p.id}`,
	product_type: p.type,
	vendor: 'Original',
	tags: [p.type.toLowerCase()],
	created_at: p.created,
	images: [{ src: `https://placehold.co/600x600/f6f5f1/0f0f0e/png?text=${encodeURIComponent(p.type)}` }],
	variants: [
		{ price: p.price.toFixed(2), compare_at_price: p.compare ? p.compare.toFixed(2) : null, available: p.available },
		{ price: p.price.toFixed(2), compare_at_price: p.compare ? p.compare.toFixed(2) : null, available: p.available }
	]
});

/** One "day" of changes: sales, price drops and raises, sell-outs and new products. */
function tick() {
	const log = [];
	for (const [domain, s] of Object.entries(STORES)) {
		if (domain === 'retrokits.be') continue;
		const campaign = rnd() < 0.3;
		for (const p of s.items) {
			const r = rnd();
			if (campaign && !p.compare && r < 0.15) {
				p.compare = p.price;
				p.price = Math.round(p.price * 0.75);
				log.push(`${domain}: sale ${p.title}`);
			} else if (r < 0.02) {
				p.price = Math.round(p.price * (rnd() < 0.6 ? 0.9 : 1.1));
				log.push(`${domain}: price ${p.title}`);
			} else if (r < 0.03) {
				p.available = !p.available;
			} else if (p.compare && r > 0.97) {
				p.price = p.compare;
				p.compare = null;
			}
		}
		if (rnd() < 0.6) {
			const [n] = football(1, KIT, ['2026 edition', 'remake', 'limited']);
			n.id = Math.max(...s.items.map((x) => x.id)) + 1;
			n.created = new Date().toISOString();
			s.items.unshift(n);
			log.push(`${domain}: new ${n.title}`);
		}
	}
	return log;
}

createServer((req, res) => {
	const url = new URL(req.url, `http://localhost:${PORT}`);
	const json = (code, body) => {
		res.writeHead(code, { 'content-type': 'application/json' });
		res.end(JSON.stringify(body));
	};
	if (url.pathname === '/__search') {
		const all = Object.keys(STORES).sort(() => rnd() - 0.5);
		return json(200, ['amazon.com', 'notshopify-shop.com', ...all, 'zalando.be']);
	}
	if (url.pathname === '/__tick') return json(200, tick());

	const [, domain, ...rest] = url.pathname.split('/');
	const store = STORES[domain];
	if (!store) return json(404, { error: 'not found' });
	const path = '/' + rest.join('/');

	if (path === '/products.json') {
		const limit = Math.min(250, Number(url.searchParams.get('limit') || 30));
		const page = Number(url.searchParams.get('page') || 1);
		return json(200, { products: store.items.slice((page - 1) * limit, page * limit).map(toShopify) });
	}
	res.writeHead(200, { 'content-type': 'text/html' });
	res.end(
		`<!doctype html><html lang="${store.lang}"><head><title>${store.name} – Shop</title><meta property="og:site_name" content="${store.name}"><script>Shopify.currency = {"active":"${store.currency}","rate":"1.0"}; Shopify.country = "${store.country}";</script></head><body>${store.name}</body></html>`
	);
}).listen(PORT, () => console.log(`🛍  Test stores on http://localhost:${PORT}  (your store: retrokits.be)`));
