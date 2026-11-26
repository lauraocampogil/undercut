// Waitlist → confirmed email → access. Seats are given in the order people confirm:
//   the first 20 use Undercut free during the beta (full database), the next 30 get the founding price (€29/month),
//   everyone after pays the normal price (€49/month). The seat is kept on the waitlist row (answers.tier).
import { createHmac } from 'node:crypto';
import * as env from '$app/env/private';
import { invite, type WaitRow } from './beta.ts';
import { early, setAnswers } from './waitlist.ts';
import { sendEmail } from './email.ts';
import { secret } from './auth.ts';
import { PRICE } from '#lib/pricing.ts';
import { appUrl as app, button, layout, siteUrl, unsubscribeLink } from './mails.ts';

export type Tier = 'free' | 'founder' | 'regular';
export const betaSeats = () => PRICE.freeSeats + PRICE.founderSeats; // 50
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const sign = (email: string) => createHmac('sha256', secret()).update(`wait:${email.toLowerCase()}`).digest('hex').slice(0, 24);
export const checkToken = (email: string, t: string) => Boolean(t) && sign(email) === t;

type L = 'en' | 'fr' | 'es';
const lang = (l?: string): L => (l === 'fr' || l === 'es' ? l : 'en');
const shell = (body: string, l: string, to: string) => layout(`${body}<p style="margin-bottom:0">Laura</p>`, { lang: l, to });

const CONFIRM = {
	en: { subject: 'Confirm your email for Undercut', hi: 'Hi', body: 'One click to confirm your email and get your place. The first 20 people use Undercut free for life, the next 30 get the first month free and then €29/month instead of €49.', cta: 'Confirm my email' },
	fr: { subject: 'Confirmez votre email pour Undercut', hi: 'Bonjour', body: 'Un clic pour confirmer votre email et obtenir votre place. Les 20 premiers utilisent Undercut gratuitement à vie, les 30 suivants ont le premier mois offert puis 29 €/mois au lieu de 49 €.', cta: 'Confirmer mon email' },
	es: { subject: 'Confirma tu email para Undercut', hi: 'Hola', body: 'Un clic para confirmar tu email y conseguir tu plaza. Las 20 primeras personas usan Undercut gratis de por vida; las 30 siguientes tienen el primer mes gratis y después pagan 29 €/mes en vez de 49 €.', cta: 'Confirmar mi email' }
};
const ACCESS = {
	en: { subject: 'Your access to Undercut', hi: 'Hi', free: 'You’re one of the first 20: Undercut is free for you for life, with the full database.', ask: 'In exchange I’d love your real opinion after you try it: do you actually like it? Would you use it every month, and why? What would make you pay for it? What’s missing or confusing? It takes 3 minutes and it decides what I build next.', feedback: 'Give my opinion', founder: 'You’re one of the first 50: your first month is free, with the full database. After that you keep the founding price, €29/month instead of €49, for as long as you stay subscribed.', regular: 'Your account is ready. Try it free, and unlock the full database for €49/month when you want.', cta: 'Create my account', end: 'Reply to this email anytime, I read everything.' },
	fr: { subject: 'Votre accès à Undercut', hi: 'Bonjour', free: 'Vous faites partie des 20 premiers : Undercut est gratuit pour vous à vie, avec la base complète.', ask: 'En échange, j’aimerais votre vrai avis après l’avoir essayé : est-ce que ça vous plaît vraiment ? L’utiliseriez-vous chaque mois, et pourquoi ? Qu’est-ce qui vous ferait payer ? Qu’est-ce qui manque ou n’est pas clair ? Ça prend 3 minutes et ça décide de ce que je construis ensuite.', feedback: 'Donner mon avis', founder: 'Vous faites partie des 50 premiers : votre premier mois est offert, avec la base complète. Ensuite vous gardez le prix fondateur, 29 €/mois au lieu de 49 €, tant que vous restez abonné·e.', regular: 'Votre compte est prêt. Essayez gratuitement, et débloquez la base complète pour 49 €/mois quand vous voulez.', cta: 'Créer mon compte', end: 'Répondez à cet email quand vous voulez, je lis tout.' },
	es: { subject: 'Tu acceso a Undercut', hi: 'Hola', free: 'Eres de las 20 primeras personas: Undercut es gratis para ti de por vida, con la base de datos completa.', ask: 'A cambio me encantaría tu opinión real cuando lo pruebes: ¿de verdad te gusta? ¿Lo usarías cada mes, y por qué? ¿Qué te haría pagar por él? ¿Qué falta o no se entiende? Son 3 minutos y deciden lo que construyo después.', feedback: 'Dar mi opinión', founder: 'Eres de las 50 primeras personas: el primer mes es gratis, con la base completa. Después mantienes el precio fundador, 29 €/mes en vez de 49 €, mientras sigas suscrito/a.', regular: 'Tu cuenta está lista. Pruébala gratis y desbloquea la base completa por 49 €/mes cuando quieras.', cta: 'Crear mi cuenta', end: 'Responde a este email cuando quieras, lo leo todo.' }
};

/** Step 1 (right after joining): the confirmation email. */
export async function sendConfirm(email: string, name: string, l: string, appUrl: string) {
	const m = CONFIRM[lang(l)];
	const link = `${siteUrl()}/waitlist/confirm?e=${encodeURIComponent(email.toLowerCase())}&t=${sign(email)}`;
	const first = esc(name.split(' ')[0] || '');
	return sendEmail(email, m.subject, shell(`<p style="margin-top:0">${m.hi}${first ? ` ${first}` : ''},</p><p>${m.body}</p>${button(link, m.cta)}`, l, email), unsubscribeLink(email));
}

async function sendAccess(row: WaitRow, code: string, tier: Tier, l: string, appUrl: string) {
	const m = ACCESS[lang(l)];
	const link = `${app()}/signup?code=${code}`;
	const first = esc(row.name.split(' ')[0] || '');
	return sendEmail(row.email, m.subject, shell(`<p style="margin-top:0">${m.hi}${first ? ` ${first}` : ''},</p><p>${m[tier]}</p>${button(link, m.cta)}${tier === 'free' ? `<p>${m.ask}</p>${button(`${app()}/app/feedback`, m.feedback)}` : ''}<p>${m.end}</p>`, l, row.email), unsubscribeLink(row.email));
}

/** Step 2 (the link in the email): mark the email confirmed, give the next seat, return the sign-up code. */
export async function confirm(email: string, appUrl: string): Promise<{ code: string; tier: Tier } | null> {
	const all = await early();
	const me = all.find((x) => x.row.email === email.toLowerCase());
	if (!me) return null;
	if (me.row.code && me.a.tier) return { code: me.row.code, tier: me.a.tier as Tier };
	const free = all.filter((x) => x.a.tier === 'free').length;
	const founder = all.filter((x) => x.a.tier === 'founder').length;
	const tier: Tier = free < PRICE.freeSeats ? 'free' : founder < PRICE.founderSeats ? 'founder' : 'regular';
	await setAnswers(me.row.email, { ...me.a, tier, confirmed: new Date().toISOString() });
	const row = me.row.code ? me.row : await invite(me.row.id);
	if (!row?.code) return null;
	await sendAccess(row, row.code, tier, me.a.lang ?? 'en', appUrl).catch(() => null);
	return { code: row.code, tier };
}

/** The seat of an email (for the account and the price). */
export async function tierOf(email?: string | null): Promise<Tier | null> {
	if (!email) return null;
	const me = (await early()).find((x) => x.row.email === email.toLowerCase());
	return (me?.a.tier as Tier) ?? null;
}

/** Admin: send the confirmation email to everyone who joined and never confirmed (people from before). */
export async function remindUnconfirmed(appUrl: string) {
	let sent = 0;
	for (const x of await early()) {
		if (x.a.tier || x.a.unsubscribed) continue;
		if (await sendConfirm(x.row.email, x.row.name, x.a.lang ?? 'en', appUrl)) sent++;
		await new Promise((r) => setTimeout(r, 600)); // stay under the email provider's rate limit
	}
	return { sent };
}

/** The seat written on a waitlist row (used at sign-up with the code). */
export const tierOfRow = (row: WaitRow | null): Tier | null => {
	try {
		return (JSON.parse(row?.note || '{}').tier as Tier) ?? null;
	} catch {
		return null;
	}
};

/** Dev: send every waitlist email to one address, to check how they look (no seat is given). */
export async function sendSamples(to: string, l: string, appUrl: string) {
	const row = { email: to, name: '' } as WaitRow;
	const out: Record<string, boolean> = {};
	out.confirm = Boolean(await sendConfirm(to, '', l, appUrl));
	for (const tier of ['free', 'founder', 'regular'] as Tier[]) out[tier] = Boolean(await sendAccess(row, 'SAMPLE-CODE', tier, l, appUrl));
	return out;
}

/** The language chosen on the waitlist (used for the account and its emails). */
export const langOfRow = (row: WaitRow | null): 'en' | 'fr' | 'es' | null => {
	try {
		const l = JSON.parse(row?.note || '{}').lang;
		return l === 'en' || l === 'fr' || l === 'es' ? l : null;
	} catch {
		return null;
	}
};
