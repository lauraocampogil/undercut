// The few emails Undercut sends, in the person's language (en, fr, es). Plain, readable HTML that works in every inbox.
import { createHmac } from 'node:crypto';
import * as env from '$app/env/private';
import { secret } from './auth.ts';
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
export type MailLang = 'en' | 'fr' | 'es';
export const mailLang = (l?: string | null): MailLang => (l === 'fr' || l === 'es' ? l : 'en');

// Links in emails always point to the real site, never to localhost (test emails are sent from a dev machine).
const real = (v: string | undefined, fallback: string) => (v && !/localhost|127\.0\.0\.1/.test(v) ? v : fallback).replace(/\/$/, '');
export const siteUrl = () => real(env.SITE_URL, 'https://getundercut.app');
export const appUrl = () => real(env.PUBLIC_BASE_URL, 'https://app.getundercut.app');

/** One link per email address to stop Undercut's emails (no account needed). */
const sign = (email: string) => createHmac('sha256', secret()).update(`unsub:${email.toLowerCase()}`).digest('hex').slice(0, 24);
export const unsubscribeLink = (email: string) => `${siteUrl()}/unsubscribe?e=${encodeURIComponent(email.toLowerCase())}&t=${sign(email)}`;
export const checkUnsubscribe = (email: string, t: string) => Boolean(t) && sign(email) === t;

const FOOT = {
	en: { unsub: 'Unsubscribe', why: 'You get this email because you signed up on getundercut.app.' },
	fr: { unsub: 'Se désabonner', why: 'Vous recevez cet email car vous vous êtes inscrit·e sur getundercut.app.' },
	es: { unsub: 'Darse de baja', why: 'Recibes este email porque te registraste en getundercut.app.' }
};

/** The same card as the website: light grey page, white rounded card, the wordmark, generous padding. */
export function layout(body: string, o: { lang?: string | null; to?: string } = {}) {
	const f = FOOT[mailLang(o.lang)];
	const unsub = o.to ? ` · <a href="${unsubscribeLink(o.to)}" style="color:#888;text-decoration:underline">${f.unsub}</a>` : '';
	return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f4f2">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f2"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 8px 18px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-weight:800;font-size:22px;letter-spacing:-.04em;color:#0b0b0b">undercut</td></tr>
<tr><td style="background:#ffffff;border-radius:20px;border:1px solid #e8e8e4;padding:36px 32px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111;font-size:15px;line-height:1.6">${body}</td></tr>
<tr><td style="padding:18px 8px 0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#888;font-size:12px;line-height:1.6">${f.why}<br>Undercut · Brussels${unsub}</td></tr>
</table></td></tr></table></body></html>`;
}
export const button = (href: string, label: string) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0"><tr><td style="background:#0b0b0b;border-radius:12px"><a href="${esc(href)}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">${esc(label)}</a></td></tr></table>`;
const first = (name: string, fallback: string) => esc(name.split(' ')[0] || fallback);

const RESET = {
	en: { subject: 'Reset your Undercut password', hi: 'Hi', there: 'there', body: 'Someone asked to reset the password of your Undercut account. Click below to choose a new one. The link works for 1 hour.', cta: 'Choose a new password', note: 'If it wasn’t you, ignore this email: your password stays the same.' },
	fr: { subject: 'Réinitialisez votre mot de passe Undercut', hi: 'Bonjour', there: '', body: 'Quelqu’un a demandé à réinitialiser le mot de passe de votre compte Undercut. Cliquez ci-dessous pour en choisir un nouveau. Le lien est valable 1 heure.', cta: 'Choisir un nouveau mot de passe', note: 'Si ce n’était pas vous, ignorez cet email : votre mot de passe ne change pas.' },
	es: { subject: 'Restablece tu contraseña de Undercut', hi: 'Hola', there: '', body: 'Alguien pidió restablecer la contraseña de tu cuenta de Undercut. Pulsa abajo para elegir una nueva. El enlace sirve durante 1 hora.', cta: 'Elegir una contraseña nueva', note: 'Si no fuiste tú, ignora este email: tu contraseña no cambia.' }
};
export const resetSubject = (l?: string | null) => RESET[mailLang(l)].subject;
export const resetEmail = (name: string, link: string, l?: string | null) => {
	const m = RESET[mailLang(l)];
	const n = first(name, m.there);
	return layout(`<p style="margin-top:0">${m.hi}${n ? ` ${n}` : ''},</p><p>${m.body}</p>${button(link, m.cta)}<p style="color:#555;margin-bottom:0">${m.note}</p>`, { lang: l });
};

const WELCOME = {
	en: { subject: 'Welcome to Undercut', hi: 'Hi', there: 'there', body: 'Welcome to Undercut. Paste your product, or any app or SaaS like it: Undercut reads its bad reviews and those of similar products, and ranks what users want, with the reviews as proof.', cta: 'See what users want', note: 'Follow a product to get a report on the 1st of each month. Reply to this email if anything is unclear, I read every message.' },
	fr: { subject: 'Bienvenue sur Undercut', hi: 'Bonjour', there: '', body: 'Bienvenue sur Undercut. Collez votre produit, ou n’importe quelle app ou SaaS similaire : Undercut lit ses mauvais avis et ceux des produits similaires, et classe ce que veulent les utilisateurs, avec les avis comme preuve.', cta: 'Voir ce que veulent les utilisateurs', note: 'Suivez un produit pour recevoir un rapport le 1er de chaque mois. Répondez à cet email si quelque chose n’est pas clair, je lis tous les messages.' },
	es: { subject: 'Bienvenida a Undercut', hi: 'Hola', there: '', body: 'Bienvenido/a a Undercut. Pega tu producto, o cualquier app o SaaS parecido: Undercut lee sus malas reseñas y las de productos similares, y ordena lo que piden los usuarios, con las reseñas como prueba.', cta: 'Ver qué quieren los usuarios', note: 'Sigue un producto para recibir un informe el día 1 de cada mes. Responde a este email si algo no está claro, leo todos los mensajes.' }
};
export const welcomeSubject = (l?: string | null) => WELCOME[mailLang(l)].subject;
export const welcomeEmail = (name: string, to: string, l?: string | null) => {
	const m = WELCOME[mailLang(l)];
	const n = first(name, m.there);
	return layout(`<p style="margin-top:0">${m.hi}${n ? ` ${n}` : ''},</p><p>${m.body}</p>${button(`${appUrl()}/app/analyses`, m.cta)}<p style="color:#555">${m.note}</p><p style="margin-bottom:0">Laura</p>`, { lang: l, to });
};

export const MONTHLY = {
	en: { subject: 'Your monthly Undercut report: what users want', intro: 'What users asked for this month, in the products you follow.', newN: (n: number) => `${n} new complaints this month:`, about: (n: number, topic: string, product: string) => `<b>${n}</b> new about <b>${topic}</b> · ${product}`, nothing: 'Nothing new this month.', see: 'See what users want →', foot: 'You get this because you follow these products on Undercut. Unfollow them in the app to stop.' },
	fr: { subject: 'Votre rapport mensuel Undercut : ce que veulent les utilisateurs', intro: 'Ce que les utilisateurs ont demandé ce mois-ci, dans les produits que vous suivez.', newN: (n: number) => `${n} nouvelles plaintes ce mois-ci :`, about: (n: number, topic: string, product: string) => `<b>${n}</b> nouvelles sur <b>${topic}</b> · ${product}`, nothing: 'Rien de nouveau ce mois-ci.', see: 'Voir ce que veulent les utilisateurs →', foot: 'Vous recevez cet email car vous suivez ces produits sur Undercut. Arrêtez de les suivre dans l’app pour ne plus le recevoir.' },
	es: { subject: 'Tu informe mensual de Undercut: lo que quieren los usuarios', intro: 'Lo que pidieron los usuarios este mes, en los productos que sigues.', newN: (n: number) => `${n} quejas nuevas este mes:`, about: (n: number, topic: string, product: string) => `<b>${n}</b> nuevas sobre <b>${topic}</b> · ${product}`, nothing: 'Nada nuevo este mes.', see: 'Ver qué quieren los usuarios →', foot: 'Recibes este email porque sigues estos productos en Undercut. Deja de seguirlos en la app para no recibirlo.' }
};
