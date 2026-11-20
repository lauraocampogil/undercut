// The agency's business: its clients (CRM), tasks, meetings, quotes and invoices.
// Everything here is entered by the agency itself — no example or invented data.
import { randomBytes } from 'node:crypto';
import { readData, writeData } from './store.ts';

export type ClientStatus = 'active' | 'paused' | 'ended';
export type SiteCheck = { at: string; status: number; ms: number; https: boolean; mobile: boolean; title: string };
export type BizClient = {
	id: string;
	name: string;
	contact?: string;
	email?: string;
	phone?: string;
	website?: string;
	address?: string;
	vatNumber?: string;
	services: string[];
	fee?: number; // € per month (retainer)
	status: ClientStatus;
	since?: string; // YYYY-MM-DD
	notes?: string;
	createdAt: string;
	site?: SiteCheck;
	fromProspect?: string;
};
export type Task = { id: string; title: string; clientId?: string; due?: string; done: boolean; doneAt?: string; createdAt: string };
export type Meeting = { id: string; title: string; date: string; time?: string; clientId?: string; note?: string };
export type DocLine = { desc: string; qty: number; price: number };
export type DocKind = 'quote' | 'invoice';
export type DocStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'paid';
export type Doc = { id: string; kind: DocKind; number: string; clientId: string; date: string; due?: string; lines: DocLine[]; vat: number; status: DocStatus; notes?: string; paidAt?: string; fromQuote?: string; createdAt: string };
export type BizDetails = { legalName?: string; address?: string; vatNumber?: string; iban?: string; email?: string; phone?: string; currency: string; vat: number; payDays: number; footer?: string };
export type Business = { clients: BizClient[]; tasks: Task[]; meetings: Meeting[]; docs: Doc[]; details: BizDetails };

const FILE = 'business.json';
const EMPTY: Business = { clients: [], tasks: [], meetings: [], docs: [], details: { currency: 'EUR', vat: 21, payDays: 30 } };
export const uid = () => randomBytes(6).toString('base64url');
export const today = () => new Date().toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);

export function getBiz(): Business {
	const b = readData<Business>(FILE, EMPTY);
	return { clients: b.clients ?? [], tasks: b.tasks ?? [], meetings: b.meetings ?? [], docs: b.docs ?? [], details: { ...EMPTY.details, ...(b.details ?? {}) } };
}
function save(b: Business) {
	writeData(FILE, b);
}
function edit<T>(fn: (b: Business) => T): T {
	const b = getBiz();
	const r = fn(b);
	save(b);
	return r;
}

// ---------- clients ----------
export function saveClient(c: Partial<BizClient> & { name: string }) {
	return edit((b) => {
		const i = c.id ? b.clients.findIndex((x) => x.id === c.id) : -1;
		if (i >= 0) {
			b.clients[i] = { ...b.clients[i], ...c };
			return b.clients[i];
		}
		const n: BizClient = { services: [], status: 'active', since: today(), ...c, id: uid(), createdAt: new Date().toISOString() };
		b.clients.push(n);
		return n;
	});
}
export function deleteClient(id: string) {
	edit((b) => {
		b.clients = b.clients.filter((c) => c.id !== id);
		// keep invoices (accounting), unlink tasks and meetings
		for (const t of b.tasks) if (t.clientId === id) t.clientId = undefined;
		for (const m of b.meetings) if (m.clientId === id) m.clientId = undefined;
	});
}
export function setSiteCheck(id: string, site: SiteCheck) {
	edit((b) => {
		const c = b.clients.find((x) => x.id === id);
		if (c) c.site = site;
	});
}

/** Live check of a website: answers, speed, HTTPS, mobile-friendly. */
export async function checkWebsite(url: string): Promise<SiteCheck> {
	const u = /^https?:\/\//.test(url) ? url : `https://${url}`;
	const t0 = Date.now();
	try {
		const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(10000), headers: { 'user-agent': 'Mozilla/5.0 (compatible; UndercutBot/1.0; +https://getundercut.app)' } });
		const html = (await r.text()).slice(0, 300_000);
		return { at: new Date().toISOString(), status: r.status, ms: Date.now() - t0, https: r.url.startsWith('https://'), mobile: /<meta[^>]+name=["']viewport["']/i.test(html), title: (html.match(/<title[^>]*>([^<]*)/i)?.[1] ?? '').trim().slice(0, 120) };
	} catch {
		return { at: new Date().toISOString(), status: 0, ms: Date.now() - t0, https: false, mobile: false, title: '' };
	}
}

// ---------- tasks ----------
export function addTask(t: { title: string; clientId?: string; due?: string }) {
	return edit((b) => {
		const n: Task = { id: uid(), title: t.title, clientId: t.clientId || undefined, due: t.due || undefined, done: false, createdAt: new Date().toISOString() };
		b.tasks.push(n);
		return n;
	});
}
export function toggleTask(id: string) {
	edit((b) => {
		const t = b.tasks.find((x) => x.id === id);
		if (t) {
			t.done = !t.done;
			t.doneAt = t.done ? new Date().toISOString() : undefined;
		}
	});
}
export function updateTask(id: string, patch: Partial<Pick<Task, 'title' | 'due' | 'clientId'>>) {
	edit((b) => {
		const t = b.tasks.find((x) => x.id === id);
		if (t) Object.assign(t, patch);
	});
}
export function deleteTask(id: string) {
	edit((b) => {
		b.tasks = b.tasks.filter((t) => t.id !== id);
	});
}

// ---------- meetings ----------
export function addMeeting(m: Omit<Meeting, 'id'>) {
	return edit((b) => {
		const n = { ...m, id: uid() };
		b.meetings.push(n);
		return n;
	});
}
export function deleteMeeting(id: string) {
	edit((b) => {
		b.meetings = b.meetings.filter((m) => m.id !== id);
	});
}

// ---------- quotes & invoices ----------
export const docTotal = (d: Pick<Doc, 'lines' | 'vat'>) => {
	const net = d.lines.reduce((t, l) => t + l.qty * l.price, 0);
	const vat = Math.round(net * d.vat) / 100;
	return { net, vat, total: net + vat };
};
function nextNumber(b: Business, kind: DocKind, date: string) {
	const y = date.slice(0, 4);
	const prefix = `${kind === 'quote' ? 'Q' : 'INV'}-${y}-`;
	const max = b.docs.filter((d) => d.kind === kind && d.number.startsWith(prefix)).reduce((m, d) => Math.max(m, Number(d.number.slice(prefix.length)) || 0), 0);
	return prefix + String(max + 1).padStart(3, '0');
}
export function createDoc(kind: DocKind, clientId: string, from?: Doc) {
	return edit((b) => {
		const date = today();
		const d: Doc = {
			id: uid(),
			kind,
			number: nextNumber(b, kind, date),
			clientId,
			date,
			due: kind === 'invoice' ? addDays(date, b.details.payDays) : addDays(date, 30),
			lines: from ? from.lines.map((l) => ({ ...l })) : [],
			vat: from?.vat ?? b.details.vat,
			status: 'draft',
			notes: from?.notes,
			fromQuote: from?.kind === 'quote' ? from.id : undefined,
			createdAt: new Date().toISOString()
		};
		// a retainer client: start the invoice with the monthly fee
		const c = b.clients.find((x) => x.id === clientId);
		if (!from && c?.fee) d.lines.push({ desc: `${c.services.length ? c.services.join(', ') : 'Services'}: ${new Date().toLocaleString('en', { month: 'long', year: 'numeric' })}`, qty: 1, price: c.fee });
		b.docs.push(d);
		return d;
	});
}
export function saveDoc(id: string, patch: Partial<Pick<Doc, 'clientId' | 'date' | 'due' | 'lines' | 'vat' | 'notes' | 'status'>>) {
	edit((b) => {
		const d = b.docs.find((x) => x.id === id);
		if (!d) return;
		Object.assign(d, patch);
		if (patch.status === 'paid' && !d.paidAt) d.paidAt = new Date().toISOString();
		if (patch.status && patch.status !== 'paid') d.paidAt = undefined;
	});
}
export function deleteDoc(id: string) {
	edit((b) => {
		b.docs = b.docs.filter((d) => d.id !== id);
	});
}
export function saveDetails(d: Partial<BizDetails>) {
	edit((b) => {
		b.details = { ...b.details, ...d };
	});
}

// ---------- numbers for the dashboard ----------
export function money(b: Business) {
	const month = today().slice(0, 7);
	const inv = b.docs.filter((d) => d.kind === 'invoice');
	const unpaid = inv.filter((d) => d.status === 'sent');
	const overdue = unpaid.filter((d) => d.due && d.due < today());
	return {
		mrr: b.clients.filter((c) => c.status === 'active').reduce((t, c) => t + (c.fee ?? 0), 0),
		active: b.clients.filter((c) => c.status === 'active').length,
		paidMonth: inv.filter((d) => d.status === 'paid' && (d.paidAt ?? d.date).startsWith(month)).reduce((t, d) => t + docTotal(d).total, 0),
		unpaid: unpaid.reduce((t, d) => t + docTotal(d).total, 0),
		unpaidCount: unpaid.length,
		overdue: overdue.length,
		openQuotes: b.docs.filter((d) => d.kind === 'quote' && d.status === 'sent').reduce((t, d) => t + docTotal(d).net, 0)
	};
}

export type AgendaItem = { date: string; time?: string; kind: 'meeting' | 'task' | 'followup' | 'invoice'; title: string; sub?: string; href: string; id: string; late?: boolean };
/** Everything with a date in the next `days` days (and anything late), sorted. */
export function agenda(b: Business, followups: { id: string; name: string; next?: string; stage: string }[], days = 7): AgendaItem[] {
	const t = today();
	const end = addDays(t, days);
	const cname = (id?: string) => (id ? b.clients.find((c) => c.id === id)?.name : undefined);
	const items: AgendaItem[] = [];
	for (const m of b.meetings) if (m.date >= t && m.date <= end) items.push({ id: m.id, date: m.date, time: m.time, kind: 'meeting', title: m.title, sub: cname(m.clientId), href: '/app/tasks' });
	for (const k of b.tasks) if (!k.done && k.due && k.due <= end) items.push({ id: k.id, date: k.due, kind: 'task', title: k.title, sub: cname(k.clientId), href: '/app/tasks', late: k.due < t });
	for (const p of followups) if (p.next && p.next <= end && p.stage !== 'won' && p.stage !== 'lost') items.push({ id: p.id, date: p.next, kind: 'followup', title: `Follow up ${p.name}`, href: '/app/prospects', late: p.next < t });
	for (const d of b.docs) if (d.kind === 'invoice' && d.status === 'sent' && d.due && d.due <= end) items.push({ id: d.id, date: d.due, kind: 'invoice', title: `Invoice ${d.number} due`, sub: cname(d.clientId), href: `/app/invoices/${d.id}`, late: d.due < t });
	return items.sort((a, z) => (a.date + (a.time ?? '99')).localeCompare(z.date + (z.time ?? '99')));
}
