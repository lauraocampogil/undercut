// Form actions for clients, tasks, meetings, quotes and invoices (dashboard + their own pages).
import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { addMeeting, addTask, checkWebsite, createDoc, deleteClient, deleteDoc, deleteMeeting, deleteTask, getBiz, saveClient, saveDetails, saveDoc, setSiteCheck, toggleTask, updateTask, type ClientStatus, type DocLine, type DocStatus } from './business.ts';
import { getOS, setBrief, updateItem } from './agency-os.ts';
import { briefContent } from './brief.ts';
import { sendEmail, emailReady } from './email.ts';
import { getAccount } from './store.ts';
import { addPayment, deletePayment, markPaymentPaid } from './business.ts';
import { resolveItem, type InboxKind } from './inbox.ts';

type E = RequestEvent;
const str = (f: FormData, k: string, n = 200) => String(f.get(k) ?? '').trim().slice(0, n);
const date = (f: FormData, k: string) => (/^\d{4}-\d{2}-\d{2}$/.test(str(f, k)) ? str(f, k) : undefined);
const num = (f: FormData, k: string) => {
	const v = Number(str(f, k).replace(',', '.'));
	return Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : undefined;
};
const STATUSES: ClientStatus[] = ['active', 'paused', 'ended'];
const DOC_STATUSES: DocStatus[] = ['draft', 'sent', 'accepted', 'declined', 'paid'];

export const businessActions = {
	client: async ({ request }: E) => {
		const f = await request.formData();
		const name = str(f, 'name', 120);
		if (!name) return fail(400, { clientError: 'Give the client a name.' });
		const status = str(f, 'status') as ClientStatus;
		const c = saveClient({
			id: str(f, 'id') || undefined,
			name,
			contact: str(f, 'contact', 120) || undefined,
			email: str(f, 'email', 160) || undefined,
			phone: str(f, 'phone', 40) || undefined,
			website: str(f, 'website', 200) || undefined,
			address: str(f, 'address', 300) || undefined,
			vatNumber: str(f, 'vatNumber', 40) || undefined,
			services: str(f, 'services', 200).split(',').map((s) => s.trim()).filter(Boolean),
			fee: num(f, 'fee'),
			status: STATUSES.includes(status) ? status : 'active',
			since: date(f, 'since'),
			notes: str(f, 'notes', 4000) || undefined
		});
		if (f.get('go') === '1') redirect(303, `/app/crm/${c.id}`);
		return { clientSaved: c.id };
	},
	deleteClient: async ({ request }: E) => {
		deleteClient(str(await request.formData(), 'id'));
		redirect(303, '/app/crm');
	},
	checkSite: async ({ request }: E) => {
		const id = str(await request.formData(), 'id');
		const c = getBiz().clients.find((x) => x.id === id);
		if (!c?.website) return fail(400, { siteError: 'Add the client’s website first.' });
		setSiteCheck(id, await checkWebsite(c.website));
		return { checked: id };
	},
	/** A won prospect becomes a client (keeps name, website, phone, email, monthly value). */
	makeClient: async ({ request }: E) => {
		const id = str(await request.formData(), 'id');
		const p = getOS().pipeline.find((x) => x.id === id);
		if (!p) return fail(404, { error: 'Prospect not found.' });
		const existing = getBiz().clients.find((c) => c.fromProspect === id);
		if (existing) redirect(303, `/app/crm/${existing.id}`);
		const c = saveClient({ name: p.name, website: p.website, phone: p.phone, email: p.email, address: p.address, fee: p.value, notes: p.note, fromProspect: p.id, services: [] });
		if (p.stage !== 'won') updateItem(id, { stage: 'won' });
		redirect(303, `/app/crm/${c.id}`);
	},

	task: async ({ request }: E) => {
		const f = await request.formData();
		const title = str(f, 'title', 300);
		if (!title) return fail(400, { taskError: 'Write the task first.' });
		addTask({ title, clientId: str(f, 'clientId') || undefined, due: date(f, 'due') });
		return { taskAdded: true };
	},
	toggleTask: async ({ request }: E) => {
		toggleTask(str(await request.formData(), 'id'));
		return { ok: true };
	},
	editTask: async ({ request }: E) => {
		const f = await request.formData();
		updateTask(str(f, 'id'), { title: str(f, 'title', 300) || undefined, due: date(f, 'due'), clientId: str(f, 'clientId') || undefined });
		return { ok: true };
	},
	deleteTask: async ({ request }: E) => {
		deleteTask(str(await request.formData(), 'id'));
		return { ok: true };
	},

	meeting: async ({ request }: E) => {
		const f = await request.formData();
		const title = str(f, 'title', 200);
		const d = date(f, 'date');
		if (!title || !d) return fail(400, { meetingError: 'A meeting needs a title and a date.' });
		const time = /^\d{2}:\d{2}$/.test(str(f, 'time')) ? str(f, 'time') : undefined;
		addMeeting({ title, date: d, time, clientId: str(f, 'clientId') || undefined, note: str(f, 'note', 1000) || undefined });
		return { meetingAdded: true };
	},
	deleteMeeting: async ({ request }: E) => {
		deleteMeeting(str(await request.formData(), 'id'));
		return { ok: true };
	},

	newDoc: async ({ request }: E) => {
		const f = await request.formData();
		const kind = str(f, 'kind') === 'quote' ? 'quote' : 'invoice';
		const clientId = str(f, 'clientId');
		if (!getBiz().clients.some((c) => c.id === clientId)) return fail(400, { docError: 'Choose a client first (add one in Clients).' });
		const d = createDoc(kind, clientId);
		redirect(303, `/app/invoices/${d.id}`);
	},
	saveDoc: async ({ request }: E) => {
		const f = await request.formData();
		const descs = f.getAll('desc').map(String);
		const qtys = f.getAll('qty').map(String);
		const prices = f.getAll('price').map(String);
		const lines: DocLine[] = descs
			.map((desc, i) => ({ desc: desc.trim().slice(0, 300), qty: Number((qtys[i] ?? '').replace(',', '.')) || 0, price: Number((prices[i] ?? '').replace(',', '.')) || 0 }))
			.filter((l) => l.desc || l.price);
		const vat = Number(str(f, 'vat').replace(',', '.'));
		const status = str(f, 'status') as DocStatus;
		saveDoc(str(f, 'id'), {
			clientId: str(f, 'clientId') || undefined,
			date: date(f, 'date'),
			due: date(f, 'due'),
			lines,
			vat: Number.isFinite(vat) && vat >= 0 && vat <= 100 ? vat : 0,
			notes: str(f, 'notes', 2000) || undefined,
			...(DOC_STATUSES.includes(status) ? { status } : {})
		});
		return { docSaved: true };
	},
	docStatus: async ({ request }: E) => {
		const f = await request.formData();
		const status = str(f, 'status') as DocStatus;
		if (DOC_STATUSES.includes(status)) saveDoc(str(f, 'id'), { status });
		return { ok: true };
	},
	quoteToInvoice: async ({ request }: E) => {
		const id = str(await request.formData(), 'id');
		const q = getBiz().docs.find((d) => d.id === id);
		if (!q || q.kind !== 'quote') return fail(404, { docError: 'Quote not found.' });
		saveDoc(q.id, { status: 'accepted' });
		const d = createDoc('invoice', q.clientId, q);
		redirect(303, `/app/invoices/${d.id}`);
	},
	deleteDoc: async ({ request }: E) => {
		deleteDoc(str(await request.formData(), 'id'));
		redirect(303, '/app/invoices');
	},
	/** "To approve": sent (or skipped) → move the prospect / payment forward. */
	inbox: async ({ request }: E) => {
		const f = await request.formData();
		const kind = str(f, 'kind') as InboxKind;
		if (!['first', 'followup', 'payment'].includes(kind)) return fail(400, { error: 'Unknown item' });
		resolveItem(kind, str(f, 'id'), f.get('sent') === '1');
		return { resolved: str(f, 'id') };
	},
	brief: async ({ request }: E) => {
		setBrief(String((await request.formData()).get('on')) === '1');
		return { ok: true };
	},
	/** Send today's brief now, to check what it looks like. */
	briefTest: async ({ url }: E) => {
		const to = getAccount().email;
		if (!emailReady()) return fail(400, { briefMsg: 'Email is not set up on the server yet (Resend).' });
		if (!to) return fail(400, { briefMsg: 'Add your email in My account first.' });
		const c = briefContent(url.origin);
		const ok = await sendEmail(to, c.subject || 'Today: nothing to approve', c.html);
		return { briefMsg: ok ? `Sent to ${to}.` : 'Could not send it. Check the Resend set-up.' };
	},
	payment: async ({ request }: E) => {
		const f = await request.formData();
		const amount = num(f, 'amount');
		const due = date(f, 'due');
		const clientId = str(f, 'clientId') || undefined;
		const c = clientId ? getBiz().clients.find((x) => x.id === clientId) : undefined;
		const who = c?.name || str(f, 'who', 120);
		if (!who || !amount || !due) return fail(400, { paymentError: 'Who, how much and the due date, please.' });
		addPayment({ clientId: c?.id, who, email: str(f, 'email', 160) || c?.email, label: str(f, 'label', 120), amount, due });
		return { paymentAdded: true };
	},
	paid: async ({ request }: E) => {
		markPaymentPaid(str(await request.formData(), 'id'));
		return { ok: true };
	},
	deletePayment: async ({ request }: E) => {
		deletePayment(str(await request.formData(), 'id'));
		return { ok: true };
	},
	details: async ({ request }: E) => {
		const f = await request.formData();
		const vat = Number(str(f, 'vat').replace(',', '.'));
		saveDetails({
			legalName: str(f, 'legalName', 160) || undefined,
			address: str(f, 'address', 300) || undefined,
			vatNumber: str(f, 'vatNumber', 40) || undefined,
			iban: str(f, 'iban', 40) || undefined,
			email: str(f, 'email', 160) || undefined,
			phone: str(f, 'phone', 40) || undefined,
			footer: str(f, 'footer', 300) || undefined,
			vat: Number.isFinite(vat) && vat >= 0 && vat <= 100 ? vat : 21,
			payDays: Math.max(0, Math.min(120, Math.round(Number(str(f, 'payDays')) || 30)))
		});
		return { detailsSaved: true };
	}
};
