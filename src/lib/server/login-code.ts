// Two-step sign-in: after the password (or Google), a 6-digit code is sent to the account's email, every time.
// Nothing is stored: the pending sign-in is a signed cookie, the code a signature of (email, workspace, 10-minute window).
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { secret, startSession } from './auth.ts';
import { inWorkspace } from './context.ts';
import { getAccount, loadWorkspace } from './store.ts';
import { sendEmail } from './email.ts';
import { layout, mailLang } from './mails.ts';

const PENDING = 'uc_verify';
const TEN_MIN = 10 * 60_000;
type Pending = { e: string; w: string | null; n: string; x: number };

const sign = (s: string) => createHmac('sha256', secret()).update(s).digest('base64url');
const codeFor = (p: Pending, window: number) => String(parseInt(createHmac('sha256', secret()).update(`login|${p.e}|${p.w ?? ''}|${window}`).digest('hex').slice(0, 10), 16) % 1_000_000).padStart(6, '0');
const window = (t = Date.now()) => Math.floor(t / TEN_MIN);

export function readPending(cookies: Cookies): Pending | null {
	const raw = cookies.get(PENDING);
	if (!raw) return null;
	const [payload, sig] = raw.split('.');
	if (!payload || !sig || sign(payload) !== sig) return null;
	try {
		const p = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Pending;
		return p.x > Date.now() ? p : null;
	} catch {
		return null;
	}
}

const MAIL = {
	en: { subject: (c: string) => `${c} is your Undercut sign-in code`, body: 'Use this code to finish signing in to Undercut. It works for 10 minutes.', note: 'If you didn’t try to sign in, change your password: someone may know it.' },
	fr: { subject: (c: string) => `${c} est votre code de connexion Undercut`, body: 'Utilisez ce code pour terminer votre connexion à Undercut. Il est valable 10 minutes.', note: 'Si ce n’était pas vous, changez votre mot de passe : quelqu’un le connaît peut-être.' },
	es: { subject: (c: string) => `${c} es tu código para entrar en Undercut`, body: 'Usa este código para terminar de entrar en Undercut. Sirve durante 10 minutos.', note: 'Si no fuiste tú, cambia tu contraseña: puede que alguien la conozca.' }
};

/** Step 1: password (or Google) was right. Send the code and remember the pending sign-in. Returns where to go. */
export async function beginVerify(cookies: Cookies, email: string, ws: string | null, next: string, secure: boolean) {
	const p: Pending = { e: email.toLowerCase(), w: ws, n: next, x: Date.now() + TEN_MIN * 2 };
	const payload = Buffer.from(JSON.stringify(p)).toString('base64url');
	cookies.set(PENDING, `${payload}.${sign(payload)}`, { path: '/', httpOnly: true, sameSite: 'lax', secure, maxAge: 20 * 60 });
	await sendCode(p);
	return '/login/verify';
}

export async function sendCode(p: Pending) {
	if (p.w) await loadWorkspace(p.w);
	const lang = p.w ? await inWorkspace(p.w, () => getAccount().language) : getAccount().language;
	const m = MAIL[mailLang(lang)];
	const code = codeFor(p, window());
	return sendEmail(p.e, m.subject(code), layout(`<p style="margin-top:0">${m.body}</p><p style="font-size:34px;font-weight:700;letter-spacing:.25em;margin:24px 0">${code}</p><p style="color:#555;margin-bottom:0">${m.note}</p>`, { lang }));
}

/** Step 2: the code is right → open the session. */
export async function finishVerify(cookies: Cookies, code: string, secure: boolean): Promise<string | null> {
	const p = readPending(cookies);
	if (!p) return null;
	const clean = code.replace(/\D/g, '');
	const ok = [window(), window() - 1].some((w) => {
		const want = codeFor(p, w);
		return clean.length === 6 && timingSafeEqual(Buffer.from(clean), Buffer.from(want));
	});
	if (!ok) return null;
	if (p.w) {
		await loadWorkspace(p.w);
		await inWorkspace(p.w, () => startSession(cookies, p.e, secure));
	} else startSession(cookies, p.e, secure);
	cookies.delete(PENDING, { path: '/' });
	return p.n;
}
