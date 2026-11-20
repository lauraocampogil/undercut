// What Undercut AI can read about the agency's own business: money, clients, invoices, tasks, agenda, pipeline.
import { agenda, docTotal, getBiz, money, today } from './business.ts';
import { getOS, pipelineStats } from './agency-os.ts';

export function businessOverview() {
	const b = getBiz();
	const os = getOS();
	const m = money(b);
	const st = pipelineStats(os);
	return {
		today: today(),
		agency: os.profile ? { name: os.profile.name, city: os.profile.city, services: os.profile.services } : null,
		currency: b.details.currency,
		revenue: { monthlyRetainers: m.mrr, paidThisMonth: m.paidMonth, waitingForPayment: m.unpaid, unpaidInvoices: m.unpaidCount, overdueInvoices: m.overdue, openQuotes: m.openQuotes },
		clients: { active: m.active, total: b.clients.length },
		tasks: { open: b.tasks.filter((t) => !t.done).length, late: b.tasks.filter((t) => !t.done && t.due && t.due < today()).length },
		pipeline: { ...st.counts, wonThisMonth: st.wonMonth, goalPerMonth: os.goal.wonPerMonth, replyRate: st.replyRate, followUpsDue: st.due.length }
	};
}

export function businessClients() {
	const b = getBiz();
	return b.clients.map((c) => {
		const inv = b.docs.filter((d) => d.kind === 'invoice' && d.clientId === c.id);
		return {
			id: c.id,
			name: c.name,
			status: c.status,
			services: c.services,
			monthlyFee: c.fee ?? 0,
			since: c.since,
			paidTotal: inv.filter((d) => d.status === 'paid').reduce((t, d) => t + docTotal(d).total, 0),
			unpaidTotal: inv.filter((d) => d.status === 'sent').reduce((t, d) => t + docTotal(d).total, 0),
			openTasks: b.tasks.filter((t) => t.clientId === c.id && !t.done).length,
			website: c.website,
			siteOnline: c.site ? c.site.status >= 200 && c.site.status < 400 : null
		};
	});
}

export function businessInvoices(status?: string) {
	const b = getBiz();
	const name = (id: string) => b.clients.find((c) => c.id === id)?.name ?? 'Deleted client';
	return b.docs
		.filter((d) => !status || d.status === status || (status === 'overdue' && d.kind === 'invoice' && d.status === 'sent' && !!d.due && d.due < today()))
		.map((d) => ({ id: d.id, kind: d.kind, number: d.number, client: name(d.clientId), date: d.date, due: d.due, status: d.status, total: docTotal(d).total }));
}

export function businessTasks() {
	const b = getBiz();
	const name = (id?: string) => (id ? b.clients.find((c) => c.id === id)?.name : undefined);
	return b.tasks.filter((t) => !t.done).map((t) => ({ id: t.id, title: t.title, client: name(t.clientId), due: t.due }));
}

export function businessAgenda(days = 14) {
	return agenda(getBiz(), getOS().pipeline, days);
}

export function businessPipeline() {
	return getOS().pipeline.map((p) => ({ id: p.id, name: p.name, category: p.category, stage: p.stage, followUp: p.next, value: p.value, note: p.note, why: p.pitch }));
}

export const BUSINESS_TOOLS = [
	{ name: 'business_overview', description: 'The agency’s own numbers: monthly retainers, paid this month, unpaid and overdue invoices, open quotes, clients, tasks, pipeline counts and monthly goal.', input_schema: { type: 'object', properties: {} } },
	{ name: 'business_clients', description: 'The agency’s clients: status, services, monthly fee, paid and unpaid totals, open tasks, website status.', input_schema: { type: 'object', properties: {} } },
	{ name: 'business_invoices', description: 'Quotes and invoices with client, dates, status and total. Optional status filter: draft, sent, paid, accepted, declined, overdue.', input_schema: { type: 'object', properties: { status: { type: 'string' } } } },
	{ name: 'business_tasks', description: 'Open tasks with client and due date.', input_schema: { type: 'object', properties: {} } },
	{ name: 'business_agenda', description: 'Meetings, task deadlines, prospect follow-ups and invoices due in the next days (and anything late).', input_schema: { type: 'object', properties: { days: { type: 'number' } } } },
	{ name: 'business_pipeline', description: 'Prospects in the pipeline: stage (new, contacted, talking, won, lost), follow-up date, value, notes.', input_schema: { type: 'object', properties: {} } }
];

export function runBusinessTool(name: string, input: Record<string, unknown>): unknown {
	if (name === 'business_overview') return businessOverview();
	if (name === 'business_clients') return businessClients();
	if (name === 'business_invoices') return businessInvoices(input.status ? String(input.status) : undefined);
	if (name === 'business_tasks') return businessTasks();
	if (name === 'business_agenda') return businessAgenda(Number(input.days) || 14);
	if (name === 'business_pipeline') return businessPipeline();
	return undefined;
}
