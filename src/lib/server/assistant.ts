// Undercut AI: chat with the data of the client you are looking at.
// It reads (status, SEO problems, keywords…) with tools, and proposes actions as buttons.
// It never changes a site on its own: the agency clicks the button to apply.
// With ANTHROPIC_API_KEY → Claude with tool use. Without → a rules-based assistant that covers the main asks.
import * as env from '$app/env/private';
import type { Client } from '#lib/types.ts';
import { getClient, listClients } from './store.ts';
import { getClientOverview } from './overview.ts';
import { getSeoAudit } from './seo-audit.ts';
import { listFixes } from './fixes.ts';
import { getIdeas } from './ideas.ts';
import { howToFix } from './fix-engine.ts';
import { AUTO_FIX_ISSUES } from '#lib/fixable.ts';
import { track } from './usage.ts';
import { explain } from './why.ts';
import { getLeads } from './leads.ts';
import { BUSINESS_TOOLS, runBusinessTool, businessOverview, businessInvoices, businessAgenda, businessPipeline, businessClients, businessTasks } from './assistant-business.ts';

export type Msg = { role: 'user' | 'assistant'; content: string };
export type Action =
	| { type: 'fix_issue'; label: string; issueId: string }
	| { type: 'fix_all'; label: string }
	| { type: 'keyword_fix'; label: string; keyword: string }
	| { type: 'mark_done'; label: string; taskId: string }
	| { type: 'rerun_audit'; label: string }
	| { type: 'open'; label: string; href: string }
	| { type: 'add_task'; label: string; title: string; due?: string; client?: string };
export type Reply = { reply: string; actions: Action[]; ai: boolean };

// ---------- tools (shared by Claude and the fallback) ----------
async function clientStatus(c: Client) {
	const o = await getClientOverview(c);
	return {
		client: c.name,
		health: o.health.score,
		areas: o.areas.map((a) => ({ area: a.label, status: a.level, value: `${a.value} ${a.sub}` })),
		tasks: o.tasks.filter((t) => !t.done && t.level !== 'good').slice(0, 8).map((t) => ({ id: t.id, issueId: t.issueId, level: t.level, area: t.area, title: t.title, action: t.action }))
	};
}

async function seoProblems(c: Client) {
	const a = await getSeoAudit(c);
	const fixes = listFixes(c.id);
	return {
		score: a.score,
		lighthouseMobile: a.lighthouse?.scores ?? null,
		lighthouseDesktop: a.lighthouseDesktop?.scores ?? null,
		consoleErrors: a.console?.items.map((i) => i.message) ?? [],
		w3c: a.w3c ? { errors: a.w3c.errors, warnings: a.w3c.warnings } : null,
		issues: a.issues.map((i) => ({ id: i.id, level: i.level, title: i.title, autoFixable: AUTO_FIX_ISSUES.has(i.id) })),
		fixes: { suggested: fixes.filter((f) => f.status === 'suggested').length, live: fixes.filter((f) => f.status === 'live').length }
	};
}

async function keywords(keyword: string) {
	const r = await getIdeas(keyword, 'fr', 'BE');
	return { keywords: r.keywords.slice(0, 8), questions: r.questions.flatMap((g) => g.items).slice(0, 8), trend: r.trend.change };
}

// ---------- Claude with tools ----------
const TOOLS = [
	{ name: 'get_client_status', description: 'Health score, status per area and the open tasks of the current client.', input_schema: { type: 'object', properties: {} } },
	{ name: 'get_seo_problems', description: 'SEO audit of the current client: score, Lighthouse mobile/desktop, console errors, W3C, issues (with autoFixable flag), fixes.', input_schema: { type: 'object', properties: {} } },
	{ name: 'keyword_research', description: 'Keyword research for a topic in Belgium: volumes, competition, questions people ask, trend.', input_schema: { type: 'object', properties: { keyword: { type: 'string' } }, required: ['keyword'] } },
	{ name: 'how_to_fix', description: 'Step-by-step fix + code for a problem that cannot be fixed automatically (speed, console errors, HTML errors, contrast…).', input_schema: { type: 'object', properties: { problem: { type: 'string' } }, required: ['problem'] } },
	{ name: 'explain_change', description: 'Why did a number change? Splits the change of visits, leads or Google clicks across channel, landing page, device and country.', input_schema: { type: 'object', properties: { metric: { type: 'string', enum: ['visits', 'leads', 'clicks'] } }, required: ['metric'] } },
	{ name: 'get_leads', description: 'Leads of the current client (forms, calls, emails, WhatsApp) by channel and landing page.', input_schema: { type: 'object', properties: {} } },
	{ name: 'list_clients', description: 'Sites and apps tracked in Analytics, with health score.', input_schema: { type: 'object', properties: {} } },
	{
		name: 'propose_action',
		description:
			'Show the user a button that applies a change when clicked. Use it whenever the user asks to do/fix/plan something. Types: add_task (needs title; optional due YYYY-MM-DD and client name), open (needs href, e.g. /app/invoices/ID, /app/crm/ID, /app/prospects, /app/tasks), fix_issue (needs issueId of an autoFixable SEO issue: title-missing, title-length, desc, alt, canonical, schema), fix_all (all automatic SEO fixes), keyword_fix (needs keyword), mark_done (needs taskId), rerun_audit.',
		input_schema: {
			type: 'object',
			properties: { type: { type: 'string', enum: ['add_task', 'open', 'fix_issue', 'fix_all', 'keyword_fix', 'mark_done', 'rerun_audit'] }, label: { type: 'string' }, title: { type: 'string' }, due: { type: 'string' }, client: { type: 'string' }, issueId: { type: 'string' }, keyword: { type: 'string' }, taskId: { type: 'string' }, href: { type: 'string' } },
			required: ['type', 'label']
		}
	}
];

async function withClaude(client: Client | null, messages: Msg[]): Promise<Reply> {
	const actions: Action[] = [];
	const system = `You are Undercut AI, the assistant inside the private dashboard of a digital agency (or freelancer). Today is ${new Date().toISOString().slice(0, 10)}. You can read the agency's own business (clients, monthly retainers, quotes and invoices, tasks, agenda, prospects pipeline) and the analytics of the client sites and apps it tracks. ${client ? `The agency is looking at the analytics of "${client.name}" (${client.type ?? 'web'}, ${client.domain}).` : 'The agency is on its main dashboard.'}
Answer in the user's language, short and concrete (max ~120 words, plain sentences, no markdown headings, amounts with the currency). Always use the tools to look at real data before answering, and never invent numbers: if the data is empty, say so and suggest what to add. When the user wants something done (a reminder, a task, open an invoice, fix a site), call propose_action so they get a button. You cannot change anything yourself, never claim you did.`;
	let convo: any[] = messages.map((m) => ({ role: m.role, content: m.content }));
	for (let i = 0; i < 6; i++) {
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: { 'x-api-key': env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
			body: JSON.stringify({ model: env.ANTHROPIC_MODEL || 'claude-sonnet-4-5', max_tokens: 900, system, tools: [...BUSINESS_TOOLS, ...(client ? TOOLS : TOOLS.filter((t) => ['list_clients', 'keyword_research', 'propose_action'].includes(t.name)))], messages: convo }),
			signal: AbortSignal.timeout(60_000)
		});
		if (!res.ok) throw new Error(`Claude ${res.status}`);
		const j = await res.json();
		convo.push({ role: 'assistant', content: j.content });
		const uses = (j.content ?? []).filter((b: any) => b.type === 'tool_use');
		if (!uses.length || j.stop_reason !== 'tool_use') {
			const text = (j.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim();
			return { reply: text || 'Done.', actions, ai: true };
		}
		const results = [];
		for (const u of uses) {
			let out: unknown;
			try {
				const biz = runBusinessTool(u.name, u.input ?? {});
				if (biz !== undefined) out = biz;
				else if (u.name === 'get_client_status' && client) out = await clientStatus(client);
				else if (u.name === 'get_seo_problems' && client) out = await seoProblems(client);
				else if (u.name === 'keyword_research') out = await keywords(String(u.input.keyword));
				else if (u.name === 'how_to_fix' && client) out = await howToFix(client, String(u.input.problem));
				else if (u.name === 'explain_change' && client) out = await explain(client, u.input.metric, 28);
				else if (u.name === 'get_leads' && client) out = getLeads(client, 28);
				else if (u.name === 'list_clients') out = await Promise.all(listClients().map(async (c) => ({ id: c.id, name: c.name, health: (await getClientOverview(c)).health.score })));
				else if (u.name === 'propose_action') {
					actions.push(u.input as Action);
					out = { shown: true };
				} else out = { error: 'not available here' };
			} catch (e) {
				out = { error: (e as Error).message };
			}
			results.push({ type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(out).slice(0, 12000) });
		}
		convo.push({ role: 'user', content: results });
	}
	return { reply: 'I looked at the data — see the actions below.', actions, ai: true };
}

// ---------- rules-based fallback ----------
function lang(t: string): 'es' | 'fr' | 'en' {
	if (/(¿|cuánto|cuanto|ganado|quién|quien|hoy|semana|tareas?|facturas?|\b(qué|que|cómo|como|arregla|hazme|hacer|dame|palabras?|por qué|mejorar|cliente)\b)/i.test(t)) return 'es';
	if (/\b(comment|pourquoi|corrige|répare|fais|mots?-clés?|améliorer|quoi)\b/i.test(t)) return 'fr';
	return 'en';
}
const T = {
	fixed: { en: 'I can fix these automatically on the site (published through the Undercut snippet):', es: 'Puedo arreglar esto automáticamente en la web (se publica con el snippet de Undercut):', fr: 'Je peux corriger ceci automatiquement sur le site (publié via le snippet Undercut) :' },
	nothingAuto: { en: 'No automatic fix is pending. The remaining problems need a developer — ask me “how to fix …” for the steps.', es: 'No queda ningún arreglo automático. Lo que queda necesita un desarrollador: pregúntame “cómo arreglo …” y te doy los pasos.', fr: 'Aucune correction automatique en attente. Le reste demande un développeur — demande-moi « comment corriger … ».' },
	status: { en: (n: string, h: number) => `${n} is at ${h}/100. Most urgent:`, es: (n: string, h: number) => `${n} está en ${h}/100. Lo más urgente:`, fr: (n: string, h: number) => `${n} est à ${h}/100. Le plus urgent :` },
	kw: { en: 'Best keywords for', es: 'Mejores palabras clave para', fr: 'Meilleurs mots-clés pour' },
	pick: { en: 'Pick a client first (open it), then ask me again.', es: 'Abre primero un cliente y vuelve a preguntarme.', fr: 'Ouvre d’abord un client, puis repose ta question.' },
	overview: { en: 'Clients that need you most:', es: 'Los clientes que más te necesitan:', fr: 'Les clients qui ont le plus besoin de toi :' }
};

// Agency-level questions without an AI key: money, unpaid invoices, today, follow-ups, best clients, tasks.
const money = (n: number, cur: string) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: cur, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
const BT = {
	revenue: { en: (a: string, b: string, c: string) => `This month you were paid ${a}. Monthly retainers add up to ${b}. Still waiting for ${c}.`, es: (a: string, b: string, c: string) => `Este mes has cobrado ${a}. Tus cuotas mensuales suman ${b}. Aún esperas ${c}.`, fr: (a: string, b: string, c: string) => `Ce mois-ci tu as encaissé ${a}. Tes forfaits mensuels font ${b}. Encore ${c} en attente.` },
	unpaid: { en: 'Not paid yet:', es: 'Todavía sin pagar:', fr: 'Pas encore payé :' },
	allPaid: { en: 'Every invoice you sent is paid.', es: 'Todas las facturas que enviaste están pagadas.', fr: 'Toutes les factures envoyées sont payées.' },
	today: { en: 'For today:', es: 'Para hoy:', fr: 'Pour aujourd’hui :' },
	week: { en: 'This week:', es: 'Esta semana:', fr: 'Cette semaine :' },
	free: { en: 'Nothing planned today. Add a task or find new prospects.', es: 'Nada previsto hoy. Añade una tarea o busca nuevos prospectos.', fr: 'Rien de prévu aujourd’hui. Ajoute une tâche ou cherche de nouveaux prospects.' },
	follow: { en: 'Follow up with:', es: 'Haz seguimiento a:', fr: 'Relance :' },
	noFollow: { en: 'No follow-up due. Contact the prospects in “To contact”.', es: 'Ningún seguimiento pendiente. Contacta a los prospectos en “To contact”.', fr: 'Aucune relance prévue. Contacte les prospects « To contact ».' },
	best: { en: 'Your biggest clients:', es: 'Tus clientes más importantes:', fr: 'Tes plus gros clients :' },
	noClients: { en: 'No clients yet. Add them in Clients, or turn a won prospect into a client.', es: 'Aún no tienes clientes. Añádelos en Clients o convierte un prospecto ganado.', fr: 'Pas encore de clients. Ajoute-les dans Clients.' },
	tasks: { en: 'Open tasks:', es: 'Tareas abiertas:', fr: 'Tâches ouvertes :' },
	noTasks: { en: 'No open tasks.', es: 'No tienes tareas abiertas.', fr: 'Aucune tâche ouverte.' },
	summary: { en: (s: string) => `Your business today: ${s}. Ask me about money, unpaid invoices, today, follow-ups or clients.`, es: (s: string) => `Tu negocio hoy: ${s}. Pregúntame por ingresos, facturas sin pagar, hoy, seguimientos o clientes.`, fr: (s: string) => `Ton activité aujourd’hui : ${s}. Demande-moi le chiffre, les impayés, aujourd’hui, les relances ou les clients.` }
};
function businessFallback(q: string, L: 'es' | 'fr' | 'en'): Reply {
	const t = q.toLowerCase();
	const o = businessOverview();
	const cur = o.currency;
	if (/(unpaid|not paid|n.?t paid|owe|overdue|sin pagar|no ha pagado|no me ha pagado|no han pagado|debe|impay|pas pay|retard)/i.test(t)) {
		const list = businessInvoices('sent').filter((d) => d.kind === 'invoice');
		if (!list.length) return { reply: BT.allPaid[L], actions: [], ai: false };
		return { reply: `${BT.unpaid[L]}\n${list.slice(0, 6).map((d) => `• ${d.client}: ${money(d.total, cur)} (${d.number}${d.due && d.due < o.today ? ', late' : ''})`).join('\n')}`, actions: list.slice(0, 3).map((d) => ({ type: 'open' as const, label: `Open ${d.number}`, href: `/app/invoices/${d.id}` })), ai: false };
	}
	if (/(earn|revenue|income|money|paid|turnover|gan|ingres|cobr|factur|dinero|chiffre|gagn|encaiss|argent)/i.test(t)) {
		const r = o.revenue;
		return { reply: BT.revenue[L](money(r.paidThisMonth, cur), money(r.monthlyRetainers, cur), money(r.waitingForPayment, cur)), actions: [{ type: 'open', label: 'Open quotes & invoices', href: '/app/invoices' }], ai: false };
	}
	if (/(follow|prospect|seguimiento|relanc|lead)/i.test(t)) {
		const due = businessPipeline().filter((p) => p.followUp && p.followUp <= o.today && p.stage !== 'won' && p.stage !== 'lost');
		if (!due.length) return { reply: BT.noFollow[L], actions: [{ type: 'open', label: 'Open pipeline', href: '/app/prospects' }], ai: false };
		return { reply: `${BT.follow[L]}\n${due.slice(0, 6).map((p) => `• ${p.name}${p.note ? ` (${p.note.slice(0, 60)})` : ''}`).join('\n')}`, actions: [{ type: 'open', label: 'Open pipeline', href: '/app/prospects' }], ai: false };
	}
	if (/(today|what should i do|priorit|hoy|qué hago|que hago|aujourd|quoi faire|semaine|week)/i.test(t)) {
		const week = /week|semana|semaine/.test(t);
		const items = businessAgenda(week ? 7 : 0);
		if (!items.length) return { reply: BT.free[L], actions: [{ type: 'open', label: 'Open tasks & agenda', href: '/app/tasks' }], ai: false };
		return { reply: `${(week ? BT.week : BT.today)[L]}\n${items.slice(0, 8).map((a) => `• ${a.late ? '⚠ ' : ''}${a.time ? a.time + ' ' : ''}${a.title}${a.sub ? ` · ${a.sub}` : ''}`).join('\n')}`, actions: [{ type: 'open', label: 'Open tasks & agenda', href: '/app/tasks' }], ai: false };
	}
	if (/(best|biggest|top|mejor|más importante|meilleur|plus gros|client)/i.test(t)) {
		const cs = businessClients().filter((c) => c.status === 'active').sort((a, b) => b.monthlyFee + b.paidTotal - (a.monthlyFee + a.paidTotal));
		if (!cs.length) return { reply: BT.noClients[L], actions: [{ type: 'open', label: 'Open clients', href: '/app/crm' }], ai: false };
		return { reply: `${BT.best[L]}\n${cs.slice(0, 5).map((c) => `• ${c.name}: ${money(c.monthlyFee, cur)}/month · ${money(c.paidTotal, cur)} paid so far`).join('\n')}`, actions: cs.slice(0, 2).map((c) => ({ type: 'open' as const, label: `Open ${c.name}`, href: `/app/crm/${c.id}` })), ai: false };
	}
	if (/(task|tarea|tâche|todo|to-do)/i.test(t)) {
		const ts = businessTasks();
		return { reply: ts.length ? `${BT.tasks[L]}\n${ts.slice(0, 8).map((k) => `• ${k.title}${k.client ? ` · ${k.client}` : ''}${k.due ? ` (${k.due})` : ''}`).join('\n')}` : BT.noTasks[L], actions: [{ type: 'open', label: 'Open tasks', href: '/app/tasks' }], ai: false };
	}
	const parts = [`${o.clients.active} active clients`, `${money(o.revenue.monthlyRetainers, cur)}/month`, `${o.tasks.open} open tasks`, `${o.pipeline.new} prospects to contact`];
	if (o.revenue.overdueInvoices) parts.push(`${o.revenue.overdueInvoices} late invoices`);
	return { reply: BT.summary[L](parts.join(', ')), actions: [], ai: false };
}

async function fallback(client: Client | null, messages: Msg[]): Promise<Reply> {
	const q = messages.at(-1)?.content ?? '';
	const L = lang(q);
	const lower = q.toLowerCase();
	const kwMatch = q.match(/["“«](.+?)["”»]/) ?? q.match(/(?:keywords?|palabras? clave|mots?-clés?)\s+(?:for|para|pour|de)?\s*(.+)$/i);

	if (kwMatch) {
		const k = kwMatch[1].trim().replace(/[?.!]+$/, '');
		const r = await keywords(k);
		const lines = r.keywords.slice(0, 5).map((x) => `• ${x.keyword} — ${x.volume}/mo (${x.competition})`);
		return {
			reply: `${T.kw[L]} “${k}”:\n${lines.join('\n')}`,
			actions: client ? [{ type: 'keyword_fix', label: `Use “${r.keywords[0]?.keyword ?? k}” in a page title`, keyword: r.keywords[0]?.keyword ?? k }, { type: 'open', label: 'Open Keywords', href: `/app/clients/${client.id}/keywords?q=${encodeURIComponent(k)}` }] : [{ type: 'open', label: 'Open Keywords', href: `/app/ideas?q=${encodeURIComponent(k)}` }],
			ai: false
		};
	}
	if (!client) return businessFallback(q, L);
	if (/\b(why|por qué|porque|pourquoi)\b/i.test(lower)) {
		const metric = /lead|contact|call|llamad|formul/i.test(lower) ? 'leads' : /google|search|click|clic|seo/i.test(lower) ? 'clicks' : 'visits';
		const w = await explain(client, metric, 28);
		return { reply: w.sentence, actions: [{ type: 'open', label: metric === 'leads' ? 'Open Leads' : metric === 'clicks' ? 'Open Search' : 'Open Traffic', href: `/app/clients/${client.id}/${metric === 'leads' ? 'leads' : metric === 'clicks' ? 'search' : 'traffic'}` }], ai: false };
	}
	if (/(how|cómo|como|comment).*(fix|arregl|corrig|répar)/i.test(lower)) {
		const h = await howToFix(client, q);
		return { reply: h.steps.map((s, i) => `${i + 1}. ${s}`).join('\n') + (h.code ? `\n\n${h.code}` : ''), actions: [], ai: false };
	}
	const wantsStatus = /(first|priorit|urgent|primero|d'abord|what should|qué debo|que debo|status|estado|how is|cómo va|comment va)/i.test(lower);
	if (!wantsStatus && /(fix|arregl|corrig|répar|repar|apply|aplica|publish|publica)/i.test(lower)) {
		const s = await seoProblems(client);
		const auto = s.issues.filter((i) => i.autoFixable);
		if (!auto.length) return { reply: T.nothingAuto[L], actions: [{ type: 'open', label: 'Open SEO', href: `/app/clients/${client.id}/seo` }], ai: false };
		return {
			reply: `${T.fixed[L]}\n${auto.map((i) => `• ${i.title}`).join('\n')}`,
			actions: [{ type: 'fix_all', label: `Fix all ${auto.length} automatically` }, ...auto.slice(0, 3).map((i) => ({ type: 'fix_issue' as const, label: `Fix: ${i.title}`, issueId: i.id }))],
			ai: false
		};
	}
	const st = await clientStatus(client);
	return {
		reply: `${T.status[L](client.name, st.health)}\n${st.tasks.slice(0, 3).map((t) => `• ${t.title} → ${t.action}`).join('\n') || '—'}`,
		actions: st.tasks
			.slice(0, 3)
			.map((t): Action => (t.issueId && AUTO_FIX_ISSUES.has(t.issueId) ? { type: 'fix_issue', label: `Fix: ${t.title}`, issueId: t.issueId } : { type: 'mark_done', label: `Mark done: ${t.title}`, taskId: t.id })),
		ai: false
	};
}

export async function ask(clientId: string | null, messages: Msg[]): Promise<Reply> {
	track('ai');
	const client = clientId ? (getClient(clientId) ?? null) : null;
	const msgs = messages.slice(-12).map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));
	if (env.ANTHROPIC_API_KEY) {
		try {
			return await withClaude(client, msgs);
		} catch {
			/* fall back to rules */
		}
	}
	return fallback(client, msgs);
}
