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
	// for the one-card-at-a-time "Today" view
	name: string; // the business or the person
	meta: string; // one line under the name
	reasonsTitle?: 'why' | 'told';
	reasons?: string[]; // why they need the agency (or what you told them)
	proof?: { label: string; url: string }[]; // links to check it yourself
	lang?: Lang;
	instagram?: string;
	old?: boolean; // found with the first, weaker analysis
};

const FIRST_PER_DAY = 5; // first messages a day (sent today count against it)
const MAX_FOLLOWUPS = 2; // after the first message: 2 follow-ups, then it moves to "Not now"

const money = (n: number, lang: Lang) => new Intl.NumberFormat(lang === 'nl' ? 'nl-BE' : lang === 'fr' ? 'fr-BE' : 'en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
const date = (d: string, lang: Lang) => new Date(d + 'T12:00:00').toLocaleDateString(lang === 'nl' ? 'nl-BE' : lang === 'fr' ? 'fr-BE' : 'en-GB', { day: 'numeric', month: 'long' });

// follow-ups: short, in the business's language, an easy yes (no call or meeting required)
const FOLLOW: Record<Lang, (step: number, biz: string, agency: string) => { subject: string; text: string }> = {
	fr: (step, biz, agency) =>
		step === 1
			? { subject: `${biz} : vos 3 idées`, text: `Bonjour,\n\nJe reviens vers vous au sujet de mon message de la semaine dernière.\n\nLes 3 améliorations pour ${biz} sont prêtes : voulez-vous que je vous les envoie ? Elles sont gratuites et vous pourrez les appliquer avec ou sans nous. Un simple « oui » suffit.\n\nBelle journée,\n${agency}` }
			: { subject: `${biz} : je ne vous dérange plus`, text: `Bonjour,\n\nDernier message de ma part : si ce n’est pas le moment, aucun souci, je ne vous relancerai plus.\n\nSi un jour vous voulez les idées pour ${biz}, répondez simplement à ce message.\n\nBelle journée,\n${agency}` },
	nl: (step, biz, agency) =>
		step === 1
			? { subject: `${biz}: uw 3 ideeën`, text: `Goeiedag,\n\nIk kom even terug op mijn bericht van vorige week.\n\nDe 3 verbeteringen voor ${biz} liggen klaar: zal ik ze u sturen? Ze zijn gratis en u kunt ze met of zonder ons toepassen. Een eenvoudig “ja” volstaat.\n\nFijne dag,\n${agency}` }
			: { subject: `${biz}: ik stoor niet langer`, text: `Goeiedag,\n\nLaatste bericht van mij: past het nu niet, geen probleem, ik stuur u niets meer.\n\nWilt u de ideeën voor ${biz} later toch, antwoord dan gewoon op dit bericht.\n\nFijne dag,\n${agency}` },
	en: (step, biz, agency) =>
		step === 1
			? { subject: `${biz}: your 3 ideas`, text: `Hi,\n\nJust following up on my message from last week.\n\nThe 3 improvements for ${biz} are ready: shall I send them over? They’re free and you can use them with or without us. A simple “yes” is enough.\n\nBest,\n${agency}` }
			: { subject: `${biz}: I won’t bother you again`, text: `Hi,\n\nLast note from me: if now isn’t the time, no problem, I won’t follow up again.\n\nIf you’d like the ideas for ${biz} later, just reply to this email.\n\nBest,\n${agency}` }
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
export function inboxItems(opts: { payments?: boolean; ui?: Lang } = {}): InboxItem[] {
	const ui: Lang = opts.ui ?? 'en';
	const W = { fr: { wrote: 'écrit le', google: 'sur Google', high: 'Bon budget', medium: 'Budget moyen', low: 'Petit budget' }, nl: { wrote: 'geschreven op', google: 'op Google', high: 'Goed budget', medium: 'Gemiddeld budget', low: 'Klein budget' }, en: { wrote: 'you wrote on', google: 'on Google', high: 'Good budget', medium: 'Medium budget', low: 'Small budget' } }[ui];
	const os = getOS();
	const b = getBiz();
	const t = today();
	const lang: Lang = os.profile?.lang ?? 'en';
	const agency = os.profile?.name || 'Your agency';
	const items: InboxItem[] = [];

	// 1) payment reminders: overdue, and no reminder in the last 7 days
	const recent = (d?: string) => Boolean(d && d > addDays(t, -7));
	const cname = (id?: string) => (id ? b.clients.find((c) => c.id === id) : undefined);
	for (const p of opts.payments === false ? [] : b.payments) {
		if (p.paidAt || p.due >= t || recent(p.lastReminder)) continue;
		const step = Math.min(2, (p.reminders ?? 0) + 1);
		const c = cname(p.clientId);
		const m = REMIND[lang]({ who: c?.contact?.split(' ')[0] || p.who, label: p.label || (lang === 'fr' ? 'ma facture' : lang === 'nl' ? 'mijn factuur' : 'my invoice'), amount: money(p.amount, lang), due: date(p.due, lang), agency, step, iban: b.details.iban });
		items.push({ key: `payment:${p.id}`, kind: 'payment', id: p.id, name: p.who, meta: `${p.label || 'Invoice'} · due ${date(p.due, 'en')} · ${p.reminders ? `${p.reminders} reminder${p.reminders > 1 ? 's' : ''} sent` : 'no reminder sent yet'}`, lang, title: `${p.who} owes ${money(p.amount, 'en')}`, why: `${p.label || 'Invoice'} · due ${p.due}${p.reminders ? ` · ${p.reminders} reminder${p.reminders > 1 ? 's' : ''} sent` : ''}`, to: p.email || c?.email, phone: c?.phone, subject: m.subject, message: m.text, step, late: true });
	}
	for (const d of opts.payments === false ? [] : b.docs) {
		if (d.kind !== 'invoice' || d.status !== 'sent' || !d.due || d.due >= t || recent(d.lastReminder)) continue;
		const c = cname(d.clientId);
		const step = Math.min(2, (d.reminders ?? 0) + 1);
		const total = docTotal(d).total;
		const m = REMIND[lang]({ who: c?.contact?.split(' ')[0] || c?.name || '', label: lang === 'fr' ? `la facture ${d.number}` : lang === 'nl' ? `factuur ${d.number}` : `invoice ${d.number}`, amount: money(total, lang), due: date(d.due, lang), agency, step, iban: b.details.iban });
		items.push({ key: `payment:${d.id}`, kind: 'payment', id: d.id, name: c?.name ?? 'Client', meta: `Invoice ${d.number} · due ${date(d.due, 'en')} · ${d.reminders ? `${d.reminders} reminder${d.reminders > 1 ? 's' : ''} sent` : 'no reminder sent yet'}`, lang, title: `${c?.name ?? 'Client'} owes ${money(total, 'en')}`, why: `Invoice ${d.number} · due ${d.due}`, to: c?.email, phone: c?.phone, subject: m.subject, message: m.text, step, late: true });
	}

	// 2) follow-ups that are due; a week after the last follow-up with no answer, the prospect moves to "Not now"
	let expired = false;
	for (const p of os.pipeline) if (p.stage === 'contacted' && (p.followups ?? 0) >= MAX_FOLLOWUPS && p.next && p.next <= t) Object.assign(p, { stage: 'lost', next: undefined, updatedAt: new Date().toISOString() }), (expired = true);
	if (expired) saveOS(os);
	const due = os.pipeline.filter((p) => p.stage === 'contacted' && p.next && p.next <= t).sort((a, z) => a.next!.localeCompare(z.next!));
	for (const p of due) {
		const step = Math.min(MAX_FOLLOWUPS, (p.followups ?? 0) + 1);
		const m = FOLLOW[p.lang ?? lang](step, p.name, agency);
		const wrote = p.contactedAt ? date(p.contactedAt, ui) : '';
		items.push({ key: `followup:${p.id}`, kind: 'followup', id: p.id, name: p.name, meta: [p.category, p.city, wrote && `${W.wrote} ${wrote}`].filter(Boolean).join(' · '), reasonsTitle: 'told', reasons: [p.detail || p.pitch].filter(Boolean), lang: p.lang ?? lang, instagram: p.instagram, title: `Follow up ${p.name}`, why: step === MAX_FOLLOWUPS ? 'Last follow-up: after this it moves to “Not now”' : `No answer since ${p.contactedAt ?? p.updatedAt.slice(0, 10)}`, to: p.email, phone: p.phone, subject: m.subject, message: m.text, step, late: p.next! < t });
	}

	// 3) first messages: the best new prospects, a few a day
	const sentToday = os.pipeline.filter((p) => p.contactedAt === t).length;
	const fresh = os.pipeline.filter((p) => p.stage === 'new').sort((a, z) => z.score - a.score).slice(0, Math.max(0, FIRST_PER_DAY - sentToday));
	for (const p of fresh)
		items.push({
			key: `first:${p.id}`,
			kind: 'first',
			id: p.id,
			name: p.name,
			meta: [p.category, p.address || p.city, p.google?.rating ? `★ ${p.google.rating} ${W.google} (${p.google.count ?? 0})` : '', p.budget && W[p.budget]].filter(Boolean).join(' · '),
			reasonsTitle: 'why',
			// a real customer complaint first, then the biggest problems
			reasons: [...(p.detail ? [p.detail] : []), ...[...p.issues].sort((a, z) => (z.key === 'review' ? 99 : z.weight) - (a.key === 'review' ? 99 : a.weight)).map((i) => i.label)].slice(0, 3),
			proof: p.proof,
			old: !p.v,
			lang: p.lang ?? lang,
			instagram: p.instagram,
			title: `Write to ${p.name}`, why: `${p.category} · ${p.pitch}${p.lang ? ` · in ${({ fr: 'French', nl: 'Dutch', en: 'English' } as const)[p.lang]}` : ''}`, to: p.email, phone: p.phone, subject: p.subject ?? p.name, message: p.message });

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

/** This week's numbers for the Today page: real counts from the pipeline. */
export function weekStats() {
	const os = getOS();
	const from = addDays(today(), -6);
	const since = (d?: string) => Boolean(d && d.slice(0, 10) >= from);
	return {
		sent: os.pipeline.filter((p) => since(p.contactedAt)).length,
		replied: os.pipeline.filter((p) => (p.stage === 'talking' || p.stage === 'won') && p.contactedAt && since(p.updatedAt)).length,
		won: os.pipeline.filter((p) => p.stage === 'won' && since(p.updatedAt)).length
	};
}
