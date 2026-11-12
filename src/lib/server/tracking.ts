// Undercut tracking: a tiny cookieless script on the client's site that records
// page views, clicks (for heatmaps), scroll depth and rage clicks, plus one DOM
// snapshot per page & device so the heatmap can be drawn on top of the real page.
// MVP storage: .data/events/<site>/<day>.jsonl and .data/snapshots/<site>/<key>.html
import { mkdirSync, appendFileSync, readFileSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { Client } from '#lib/types.ts';
import type { Draft } from './insights.ts';
import { track } from './usage.ts';

const DIR = join(process.cwd(), '.data');
export type Device = 'desktop' | 'mobile';

export type TrackEvent =
	| { t: 'pv'; v?: string; p: string; d: Device; r?: string; w: number; h: number; ts: number }
	| { t: 'c'; p: string; d: Device; x: number; y: number; w: number; s?: string; txt?: string; i?: boolean; rage?: boolean; ts: number }
	| { t: 's'; v?: string; p: string; d: Device; depth: number; h: number; ts: number };

const day = (ts = Date.now()) => new Date(ts).toISOString().slice(0, 10);
const safe = (s: string) => s.replace(/[^a-z0-9-]/gi, '').slice(0, 60);
const snapKey = (path: string, device: Device) => createHash('sha1').update(path + '|' + device).digest('hex').slice(0, 16);

export function record(site: string, events: TrackEvent[]) {
	const dir = join(DIR, 'events', safe(site));
	mkdirSync(dir, { recursive: true });
	const lines = events
		.filter((e) => e && typeof e.p === 'string' && ['pv', 'c', 's'].includes(e.t))
		.slice(0, 200)
		.map((e) => JSON.stringify({ ...e, p: e.p.slice(0, 300), ts: Date.now() }))
		.join('\n');
	if (lines) {
		appendFileSync(join(dir, `${day()}.jsonl`), lines + '\n');
		track('events', lines.split('\n').length);
	}
}

export function needSnapshot(site: string, path: string, device: Device) {
	const f = join(DIR, 'snapshots', safe(site), snapKey(path, device) + '.json');
	if (!existsSync(f)) return true;
	try {
		return Date.now() - JSON.parse(readFileSync(f, 'utf8')).at > 7 * 864e5; // refresh weekly
	} catch {
		return true;
	}
}

export function saveSnapshot(site: string, path: string, device: Device, html: string, height: number) {
	const dir = join(DIR, 'snapshots', safe(site));
	mkdirSync(dir, { recursive: true });
	const k = snapKey(path, device);
	writeFileSync(join(dir, k + '.html'), html.slice(0, 2_000_000));
	writeFileSync(join(dir, k + '.json'), JSON.stringify({ path, device, height, at: Date.now() }));
}

export function readSnapshot(site: string, path: string, device: Device): { html: string; height: number } | null {
	const dir = join(DIR, 'snapshots', safe(site));
	const k = snapKey(path, device);
	if (!existsSync(join(dir, k + '.html'))) return null;
	const meta = JSON.parse(readFileSync(join(dir, k + '.json'), 'utf8'));
	return { html: readFileSync(join(dir, k + '.html'), 'utf8'), height: meta.height };
}

function readEvents(site: string, days: number): TrackEvent[] {
	const dir = join(DIR, 'events', safe(site));
	if (!existsSync(dir)) return [];
	const from = day(Date.now() - days * 864e5);
	const out: TrackEvent[] = [];
	for (const f of readdirSync(dir).filter((f) => f.endsWith('.jsonl') && f.slice(0, 10) >= from)) {
		for (const line of readFileSync(join(dir, f), 'utf8').split('\n')) {
			if (!line) continue;
			try {
				out.push(JSON.parse(line));
			} catch {
				/* skip */
			}
		}
	}
	return out;
}

// ---------- Aggregation for the heatmap page ----------

export type HeatPage = { path: string; views: number; clicks: number };
export type HeatmapData = {
	source: 'live' | 'demo' | 'waiting';
	installed: boolean;
	pages: HeatPage[];
	path: string;
	device: Device;
	width: number;
	height: number;
	views: number;
	points: { x: number; y: number; v: number }[]; // x 0..1 of page width, y px
	reach: number[]; // % of views reaching each 5% band (20 values)
	foldPx: number;
	rage: { label: string; count: number; x: number; y: number }[];
	elements: { label: string; clicks: number; interactive: boolean }[];
	totalClicks: number;
};

export const DEVICE_WIDTH: Record<Device, number> = { desktop: 1280, mobile: 390 };

function aggregate(events: TrackEvent[], path: string, device: Device, snapshotHeight: number | null): Omit<HeatmapData, 'source' | 'installed' | 'pages'> {
	const pv = events.filter((e) => e.t === 'pv' && e.p === path && e.d === device) as Extract<TrackEvent, { t: 'pv' }>[];
	const clicks = events.filter((e) => e.t === 'c' && e.p === path && e.d === device) as Extract<TrackEvent, { t: 'c' }>[];
	// keep the deepest scroll per page view (the snippet re-sends depth as people scroll)
	const byView = new Map<string, Extract<TrackEvent, { t: 's' }>>();
	(events.filter((e) => e.t === 's' && e.p === path && e.d === device) as Extract<TrackEvent, { t: 's' }>[]).forEach((s, i) => {
		const k = s.v ?? String(i);
		const prev = byView.get(k);
		if (!prev || s.depth > prev.depth) byView.set(k, s);
	});
	const scrolls = [...byView.values()];
	const height = snapshotHeight ?? Math.max(1000, ...scrolls.map((s) => s.h), ...pv.map((p) => p.h * 2));
	// bin clicks on a 12 px grid to keep payloads small
	const bins = new Map<string, { x: number; y: number; v: number }>();
	for (const c of clicks) {
		const bx = Math.round(c.x * 200) / 200;
		const by = Math.round(c.y / 12) * 12;
		const k = `${bx}|${by}`;
		const b = bins.get(k) ?? { x: bx, y: by, v: 0 };
		b.v++;
		bins.set(k, b);
	}
	const reach = Array.from({ length: 20 }, (_, i) => {
		if (!scrolls.length) return 0;
		const band = (i + 1) / 20;
		return Math.round((scrolls.filter((s) => s.depth >= band - 0.0001).length / scrolls.length) * 100);
	});
	const rageMap = new Map<string, { label: string; count: number; x: number; y: number }>();
	const elMap = new Map<string, { label: string; clicks: number; interactive: boolean }>();
	for (const c of clicks) {
		const label = (c.txt || c.s || 'element').slice(0, 60);
		const e = elMap.get(label) ?? { label, clicks: 0, interactive: Boolean(c.i) };
		e.clicks++;
		elMap.set(label, e);
		if (c.rage) {
			const r = rageMap.get(label) ?? { label, count: 0, x: c.x, y: c.y };
			r.count++;
			rageMap.set(label, r);
		}
	}
	const foldPx = pv.length ? Math.round(pv.reduce((s, p) => s + p.h, 0) / pv.length) : device === 'mobile' ? 740 : 820;
	return {
		path,
		device,
		width: DEVICE_WIDTH[device],
		height,
		views: Math.max(pv.length, scrolls.length),
		points: [...bins.values()],
		reach,
		foldPx,
		rage: [...rageMap.values()].sort((a, b) => b.count - a.count).slice(0, 5),
		elements: [...elMap.values()].sort((a, b) => b.clicks - a.clicks).slice(0, 8),
		totalClicks: clicks.length
	};
}

export function getHeatmap(client: Client, path = '/', device: Device = 'desktop', days = 28): HeatmapData {
	if (client.demo) return demoHeatmap(client, path, device);
	const events = readEvents(client.id, days);
	const pageMap = new Map<string, HeatPage>();
	for (const e of events) {
		const p = pageMap.get(e.p) ?? { path: e.p, views: 0, clicks: 0 };
		if (e.t === 'pv') p.views++;
		if (e.t === 'c') p.clicks++;
		pageMap.set(e.p, p);
	}
	const pages = [...pageMap.values()].sort((a, b) => b.views - a.views);
	const snap = readSnapshot(client.id, path, device);
	return {
		source: events.length ? 'live' : 'waiting',
		installed: events.length > 0,
		pages: pages.length ? pages : [{ path: '/', views: 0, clicks: 0 }],
		...aggregate(events, path, device, snap?.height ?? null)
	};
}

// ---------- Behaviour insights (become tasks) ----------
export function behaviourTasks(h: HeatmapData): Draft[] {
	if (!h.views) return [];
	const out: Draft[] = [];
	const half = h.reach[9];
	if (half && half < 50)
		out.push({
			level: 'warn',
			area: 'Behaviour',
			title: `Only ${half}% scroll past the middle of ${h.path}`,
			meaning: `On ${h.device}, most visitors leave before seeing the second half of the page.`,
			action: 'Move the main call-to-action and contact info into the first screen.'
		});
	const r = h.rage[0];
	if (r)
		out.push({
			level: 'bad',
			area: 'Behaviour',
			title: `Rage clicks on "${r.label}"`,
			meaning: `${r.count} times visitors clicked repeatedly here in frustration — it probably looks clickable but does nothing.`,
			action: 'Make it a real link/button, or change its design so it does not look clickable.'
		});
	const dead = h.elements.find((e) => !e.interactive && e.clicks >= Math.max(5, h.totalClicks * 0.06));
	if (dead && dead.label !== r?.label)
		out.push({
			level: 'warn',
			area: 'Behaviour',
			title: `People click "${dead.label}" but it is not a link`,
			meaning: `${dead.clicks} clicks on an element that does nothing.`,
			action: 'Link it to the page people expect (often the service detail or contact page).'
		});
	return out;
}

// ---------- Demo data ----------

function rng(seed: string) {
	let h = 2166136261;
	for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
	return () => ((h = Math.imul(h ^ (h >>> 15), 2246822519) ^ Math.imul(h ^ (h >>> 13), 3266489917)) >>> 0) / 4294967296;
}

// Element boxes of the demo page (see demoPageHtml) — [label, x0, x1, y0, y1, weight, interactive]
type Box = [string, number, number, number, number, number, boolean];
const BOXES: Record<Device, Box[]> = {
	desktop: [
		['Logo', 0.05, 0.16, 22, 58, 3, true],
		['Services', 0.69, 0.75, 28, 52, 6, true],
		['Prices', 0.76, 0.81, 28, 52, 5, true],
		['Contact', 0.87, 0.95, 22, 58, 7, true],
		['Book now', 0.38, 0.49, 395, 450, 22, true],
		['See our work', 0.51, 0.62, 395, 450, 7, true],
		['Hero image', 0.1, 0.9, 120, 400, 2, false],
		['Card · Service 1', 0.07, 0.33, 760, 1060, 9, false],
		['Card · Service 2', 0.37, 0.63, 760, 1060, 6, false],
		['Card · Service 3', 0.67, 0.93, 760, 1060, 4, false],
		['Reviews', 0.1, 0.9, 1180, 1460, 2, false],
		['Send', 0.4, 0.6, 1880, 1930, 5, true],
		['Phone number', 0.08, 0.3, 2110, 2140, 4, false]
	],
	mobile: [
		['Menu', 0.82, 0.95, 16, 48, 9, true],
		['Logo', 0.05, 0.35, 16, 48, 2, true],
		['Book now', 0.08, 0.92, 450, 506, 24, true],
		['Hero image', 0.05, 0.95, 90, 400, 2, false],
		['Card · Service 1', 0.05, 0.95, 650, 960, 8, false],
		['Card · Service 2', 0.05, 0.95, 990, 1300, 4, false],
		['Card · Service 3', 0.05, 0.95, 1330, 1640, 2, false],
		['Reviews', 0.05, 0.95, 1700, 2100, 1, false],
		['Send', 0.08, 0.92, 2600, 2650, 2, true],
		['Phone number', 0.08, 0.6, 2780, 2810, 6, false]
	]
};
const DEMO_H: Record<Device, number> = { desktop: 2240, mobile: 2940 };

function demoHeatmap(client: Client, path: string, device: Device): HeatmapData {
	const r = rng(client.id + device);
	const views = device === 'desktop' ? 1200 + Math.floor(r() * 800) : 2100 + Math.floor(r() * 1200);
	const points: { x: number; y: number; v: number }[] = [];
	const elements: HeatmapData['elements'] = [];
	let total = 0;
	for (const [label, x0, x1, y0, y1, w, interactive] of BOXES[device]) {
		const n = Math.round(w * (8 + r() * 6));
		elements.push({ label, clicks: n * 3, interactive });
		total += n * 3;
		for (let i = 0; i < n; i++) {
			// cluster near the centre of each box
			const cx = (x0 + x1) / 2 + ((r() + r() - 1) * (x1 - x0)) / 2;
			const cy = (y0 + y1) / 2 + ((r() + r() - 1) * (y1 - y0)) / 2;
			points.push({ x: +cx.toFixed(3), y: Math.round(cy), v: 1 + Math.floor(r() * 4) });
		}
	}
	const h = DEMO_H[device];
	const fold = device === 'mobile' ? 740 : 820;
	const reach = Array.from({ length: 20 }, (_, i) => {
		const px = ((i + 1) / 20) * h;
		if (px <= fold) return 100;
		return Math.max(4, Math.round(100 * Math.exp(-((px - fold) / h) * (device === 'mobile' ? 2.6 : 1.8))));
	});
	return {
		source: 'demo',
		installed: true,
		pages: [
			{ path: '/', views, clicks: total },
			{ path: '/services', views: Math.round(views * 0.42), clicks: Math.round(total * 0.3) },
			{ path: '/contact', views: Math.round(views * 0.25), clicks: Math.round(total * 0.2) }
		],
		path,
		device,
		width: DEVICE_WIDTH[device],
		height: h,
		views,
		points,
		reach,
		foldPx: fold,
		rage: client.id.length % 2 ? [{ label: 'Card · Service 1', count: 14 + Math.floor(r() * 20), x: device === 'mobile' ? 0.5 : 0.2, y: device === 'mobile' ? 800 : 900 }] : [],
		elements: elements.sort((a, b) => b.clicks - a.clicks).slice(0, 8),
		totalClicks: total
	};
}

export function demoPageHtml(client: Client, device: Device) {
	const c = client.color;
	const name = client.name;
	const m = device === 'mobile';
	return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>
*{box-sizing:border-box;margin:0}body{font-family:system-ui,sans-serif;color:#1d1d1f;width:${DEVICE_WIDTH[device]}px}
header{height:${m ? 64 : 80}px;display:flex;align-items:center;justify-content:space-between;padding:0 ${m ? 20 : 64}px;border-bottom:1px solid #eee}
.logo{font-weight:800;font-size:${m ? 18 : 22}px}.nav{display:${m ? 'none' : 'flex'};gap:28px;font-size:15px;margin-left:auto;margin-right:40px}
.btn{background:${c};color:#fff;border-radius:999px;padding:${m ? '16px' : '18px 30px'};font-weight:600;display:inline-block;text-align:center}
.ghost{border:2px solid #1d1d1f;border-radius:999px;padding:16px 28px;font-weight:600;display:inline-block}
.hero{height:${m ? 536 : 560}px;padding:${m ? '40px 20px' : '60px 64px'};text-align:center;background:linear-gradient(${c}22,#fff)}
.hero h1{font-size:${m ? 34 : 60}px;line-height:1.05;margin:${m ? '0 0 16px' : '30px 0 20px'}}.hero p{font-size:18px;color:#555;max-width:620px;margin:0 auto 40px}
.cards{display:grid;grid-template-columns:${m ? '1fr' : 'repeat(3,1fr)'};gap:${m ? 30 : 48}px;padding:${m ? '50px 20px' : '120px 90px 80px'}}
.card{height:${m ? 310 : 300}px;border-radius:24px;background:#f5f5f3;padding:28px}.card div{height:150px;border-radius:16px;background:${c}55;margin-bottom:18px}
.reviews{height:${m ? 440 : 360}px;margin:${m ? '0 20px' : '40px 90px'};border-radius:28px;background:#111;color:#fff;padding:48px;font-size:${m ? 22 : 30}px}
form{padding:${m ? '60px 20px' : '80px 360px'};display:grid;gap:16px}input,textarea{border:1px solid #ddd;border-radius:14px;padding:16px;font:inherit}textarea{height:${m ? 160 : 180}px}
footer{background:#f5f5f3;padding:${m ? '50px 20px' : '60px 90px'};height:${m ? 200 : 200}px;font-size:15px}
</style></head><body>
<header><span class="logo">${name}</span><nav class="nav"><a>Services</a><a>Prices</a><a>About</a></nav>${m ? '<span style="font-size:26px">☰</span>' : '<span class="btn" style="padding:14px 24px">Contact</span>'}</header>
<section class="hero"><h1>${name},<br>right in Brussels.</h1><p>Demo page generated by Undercut. Install the tracking snippet to see your client's real page here.</p>
<span class="btn" style="${m ? 'display:block' : ''}">Book now</span> ${m ? '' : '<span class="ghost">See our work</span>'}</section>
<section class="cards">${[1, 2, 3].map((i) => `<article class="card"><div></div><b>Service ${i}</b><p style="color:#666;margin-top:6px">Short description of the service.</p></article>`).join('')}</section>
<section class="reviews">“Fantastic service, quick and friendly.” ★★★★★</section>
<form><h2 style="font-size:32px">Contact us</h2><input placeholder="Name"><input placeholder="Email"><textarea placeholder="Message"></textarea><span class="btn">Send</span></form>
<footer><b>${name}</b><p style="margin-top:16px">Rue de l'Exemple 12, 1050 Bruxelles</p><p style="margin-top:8px">+32 2 123 45 67</p></footer>
</body></html>`;
}
