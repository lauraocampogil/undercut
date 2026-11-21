// "To approve": everything Undercut prepared for today, built from the agency's real data.
// First messages to new prospects, follow-ups that are due, payment reminders. Nothing is sent without the user's click.
import { getOS, saveOS, type PipelineItem } from './agency-os.ts';
import { addDays, docTotal, getBiz, remindPayment, today } from './business.ts';

type Lang = 'fr' | 'nl' | 'en';
export type InboxKind = 'first' | 'followup' | 'payment';
export type InboxItem = {
	key: string; // kind:id
	kind: InboxKind;
	id: string; // prospect, payment or invoice id
	title: string;
	why: string;
	to?: string; // email
	phone?: string;
	subject: string;
	message: string;
	step?: number; // follow-up number / reminder number
	late?: boolean;
};

const FIRST_PER_DAY = 3;
const MAX_FOLLOWUPS = 2; // after the first message: 2 follow-ups, then it moves to "Not now"

const money = (n: number, lang: Lang) => new Intl.NumberFormat(lang === 'nl' ? 'nl-BE' : lang === 'fr' ? 'fr-BE' : 'en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
const date = (d: string, lang: Lang) => new Date(d + 'T12:00:00').toLocaleDateString(lang === 'nl' ? 'nl-BE' : lang === 'fr' ? 'fr-BE' : 'en-GB', { day: 'numeric', month: 'long' });

const FOLLOW: Record<Lang, (step: number, biz: string, agency: string) => { subject: string; text: string }> = {
	fr: (step, biz, agency) =>
		step === 1
			? { subject: `${biz} : suite à mon message`, text: `Bonjour,\n\nJe me permets de revenir vers vous au sujet de mon message de la semaine dernière concernant ${biz}.\n\nSeriez-vous ouvert à un échange de 10 minutes cette semaine ? Je peux vous montrer concrètement ce que j’ai remarqué.\n\nBonne journée,\n${agency}` }
			: { subject: `${biz} : dernier message`, text: `Bonjour,\n\nDernier petit message de ma part : si ce n’est pas le bon moment, aucun souci.\n\nJe reste disponible si vous souhaitez en parler plus tard.\n\nBelle journée,\n${agency}` },
	nl: (step, biz, agency) =>
		step === 1
			? { subject: `${biz}: opvolging van mijn bericht`, text: `Hallo,\n\nIk kom even terug op mijn bericht van vorige week over ${biz}.\n\nHebt u deze week 10 minuten voor een kort gesprek? Ik toon u graag concreet wat me opviel.\n\nFijne dag,\n${agency}` }
			: { subject: `${biz}: laatste bericht`, text: `Hallo,\n\nEen laatste berichtje van mij: als het nu niet past, geen probleem.\n\nIk sta klaar als u er later over wilt praten.\n\nFijne dag,\n${agency}` },
	en: (step, biz, agency) =>
		step === 1
			? { subject: `${biz}: following up`, text: `Hi,\n\nJust following up on my message from last week about ${biz}.\n\nWould you be open to a 10-minute call this week? I can show you exactly what I noticed.\n\nBest,\n${agency}` }
			: { subject: `${biz}: last note`, text: `Hi,\n\nLast note from me: if now isn’t the right time, no problem at all.\n\nHappy to talk whenever it suits you.\n\nBest,\n${agency}` }
};

const REMIND: Record<Lang, (p: { who: string; label: string; amount: string; due: string; agency: string; step: number; iban?: string }) => { subject: string; text: string }> = {
	fr: ({ who, label, amount, due, agency, step, iban }) => ({
		subject: step === 1 ? `Petit rappel : ${label}` : `Rappel : ${label} en attente`,
		text: step === 1 ? `Bonjour ${who},\n\nPetit rappel concernant ${label} de ${amount}, arrivé(e) à échéance le ${due}.\n\nPourriez-vous me dire quand le paiement sera effectué ?${iban ? `\nIBAN : ${iban}` : ''}\n\nMerci beaucoup,\n${agency}` : `Bonjour ${who},\n\nSauf erreur de ma part, ${label} de ${amount} (échéance le ${due}) n’est toujours pas réglé(e).\n\nMerci de procéder au paiement dans les prochains jours${iban ? ` sur ${iban}` : ''}, ou de me dire s’il y a un souci.\n\nBien à vous,\n${agency}`
	}),
	nl: ({ who, label, amount, due, agency, step, iban }) => ({
		subject: step === 1 ? `Kleine herinnering: ${label}` : `Herinnering: ${label} nog open`,
		text: step === 1 ? `Hallo ${who},\n\nEen kleine herinnering voor ${label} van ${amount}, vervallen op ${due}.\n\nKunt u laten weten wanneer de betaling gebeurt?${iban ? `\nIBAN: ${iban}` : ''}\n\nAlvast bedankt,\n${agency}` : `Hallo ${who},\n\n${label} van ${amount} (vervallen op ${due}) staat bij mij nog open.\n\nWilt u de betaling de komende dagen uitvoeren${iban ? ` op ${iban}` : ''}, of laten weten als er iets is?\n\nMet vriendelijke groet,\n${agency}`
	}),
	en: ({ who, label, amount, due, agency, step, iban }) => ({
		subject: step === 1 ? `Friendly reminder: ${label}` : `Reminder: ${label} still open`,
		text: step === 1 ? `Hi ${who},\n\nA friendly reminder about ${label} for ${amount}, due on ${due}.\n\nCould you let me know when the payment will go out?${iban ? `\nIBAN: ${iban}` : ''}\n\nThanks a lot,\n${agency}` : `Hi ${who},\n\nAs far as I can see, ${label} for ${amount} (due ${due}) is still unpaid.\n\nCould you pay it in the next few days${iban ? ` to ${iban}` : ''}, or let me know if anything is wrong?\n\nBest regards,\n${agency}`
	})
};

/** Everything to approve today, most urgent first. */
export function inboxItems(): InboxItem[] {
	const os = getOS();
	const b = getBiz();
	const t = today();
	const lang: Lang = os.profile?.lang ?? 'en';
	const agency = os.profile?.name || 'Your agency';
	const items: InboxItem[] = [];

	// 1) payment reminders: overdue, and no reminder in the last 7 days
	const recent = (d?: string) => Boolean(d && d > addDays(t, -7));
	const cname = (id?: string) => (id ? b.clients.find((c) => c.id === id) : undefined);
	for (const p of b.payments) {
		if (p.paidAt || p.due >= t || recent(p.lastReminder)) continue;
		const step = Math.min(2, (p.reminders ?? 0) + 1);
		const c = cname(p.clientId);
		const m = REMIND[lang]({ who: c?.contact?.split(' ')[0] || p.who, label: p.label || (lang === 'fr' ? 'ma facture' : lang === 'nl' ? 'mijn factuur' : 'my invoice'), amount: money(p.amount, lang), due: date(p.due, lang), agency, step, iban: b.details.iban });
		items.push({ key: `payment:${p.id}`, kind: 'payment', id: p.id, title: `${p.who} owes ${money(p.amount, 'en')}`, why: `${p.label || 'Invoice'} · due ${p.due}${p.reminders ? ` · ${p.reminders} reminder${p.reminders > 1 ? 's' : ''} sent` : ''}`, to: p.email || c?.email, phone: c?.phone, subject: m.subject, message: m.text, step, late: true });
	}
	for (const d of b.docs) {
		if (d.kind !== 'invoice' || d.status !== 'sent' || !d.due || d.due >= t || recent(d.lastReminder)) continue;
		const c = cname(d.clientId);
		const step = Math.min(2, (d.reminders ?? 0) + 1);
		const total = docTotal(d).total;
		const m = REMIND[lang]({ who: c?.contact?.split(' ')[0] || c?.name || '', label: lang === 'fr' ? `la facture ${d.number}` : lang === 'nl' ? `factuur ${d.number}` : `invoice ${d.number}`, amount: money(total, lang), due: date(d.due, lang), agency, step, iban: b.details.iban });
		items.push({ key: `payment:${d.id}`, kind: 'payment', id: d.id, title: `${c?.name ?? 'Client'} owes ${money(total, 'en')}`, why: `Invoice ${d.number} · due ${d.due}`, to: c?.email, phone: c?.phone, subject: m.subject, message: m.text, step, late: true });
	}

	// 2) follow-ups that are due; a week after the last follow-up with no answer, the prospect moves to "Not now"
	let expired = false;
	for (const p of os.pipeline) if (p.stage === 'contacted' && (p.followups ?? 0) >= MAX_FOLLOWUPS && p.next && p.next <= t) Object.assign(p, { stage: 'lost', next: undefined, updatedAt: new Date().toISOString() }), (expired = true);
	if (expired) saveOS(os);
	const due = os.pipeline.filter((p) => p.stage === 'contacted' && p.next && p.next <= t).sort((a, z) => a.next!.localeCompare(z.next!));
	for (const p of due) {
		const step = Math.min(MAX_FOLLOWUPS, (p.followups ?? 0) + 1);
		const m = FOLLOW[lang](step, p.name, agency);
		items.push({ key: `followup:${p.id}`, kind: 'followup', id: p.id, title: `Follow up ${p.name}`, why: step === MAX_FOLLOWUPS ? 'Last follow-up: after this it moves to “Not now”' : `No answer since ${p.contactedAt ?? p.updatedAt.slice(0, 10)}`, to: p.email, phone: p.phone, subject: m.subject, message: m.text, step, late: p.next! < t });
	}

	// 3) first messages: the best new prospects, a few a day
	const fresh = os.pipeline.filter((p) => p.stage === 'new').sort((a, z) => z.score - a.score).slice(0, FIRST_PER_DAY);
	for (const p of fresh) items.push({ key: `first:${p.id}`, kind: 'first', id: p.id, title: `Write to ${p.name}`, why: `${p.category} · ${p.pitch}${p.budget === 'high' ? ' · can afford you' : ''}`, to: p.email, phone: p.phone, subject: p.name, message: p.message });

	return items;
}

/** The user approved (sent) or skipped an item: move the real state forward so it leaves the inbox. */
export function resolveItem(kind: InboxKind, id: string, sent: boolean) {
	const t = today();
	if (kind === 'payment') return remindPayment(id, sent);
	const s = getOS();
	const p: PipelineItem | undefined = s.pipeline.find((x) => x.id === id);
	if (!p) return;
	const now = new Date().toISOString();
	if (kind === 'first') {
		if (sent) Object.assign(p, { stage: 'contacted', contactedAt: t, followups: 0, next: addDays(t, 4), updatedAt: now });
		else Object.assign(p, { stage: 'lost', next: undefined, note: [p.note, 'Skipped from the inbox'].filter(Boolean).join(' · '), updatedAt: now });
	} else if (kind === 'followup') {
		if (sent) {
			const n = (p.followups ?? 0) + 1;
			// after the last follow-up, wait a week for an answer (then inboxItems moves it to "Not now")
			Object.assign(p, { followups: n, next: n >= MAX_FOLLOWUPS ? addDays(t, 7) : addDays(t, 4), updatedAt: now });
		} else Object.assign(p, { next: addDays(t, 2), updatedAt: now });
	}
	if (p.next === undefined) delete p.next;
	saveOS(s);
}
