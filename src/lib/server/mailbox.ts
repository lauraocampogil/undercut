// Port 587 (STARTTLS) by default: some hosts (e.g. Hetzner) block outgoing 465 on new servers.
// The agency's own mailbox (Gmail, iCloud, Yahoo, or any IMAP/SMTP provider), connected with an app password.
// Undercut sends the first messages and follow-ups from it, and reads the inbox to see who replied:
// the card moves to "Replied" by itself and the follow-ups stop. The password is stored encrypted, never sent back to the browser.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { readData, writeData } from './store.ts';
import { secret } from './auth.ts';
import { getOS, saveOS } from './agency-os.ts';

export type Provider = 'gmail' | 'icloud' | 'yahoo' | 'other';
type Box = {
	email: string;
	name?: string;
	provider: Provider;
	smtp: { host: string; port: number };
	imap: { host: string; port: number };
	pass: string; // encrypted
	connectedAt: string;
	lastSync?: string;
	lastError?: string;
};
const FILE = 'mailbox.json';
export const PRESETS: Record<Exclude<Provider, 'other'>, { smtp: { host: string; port: number }; imap: { host: string; port: number } }> = {
	gmail: { smtp: { host: 'smtp.gmail.com', port: 587 }, imap: { host: 'imap.gmail.com', port: 993 } },
	icloud: { smtp: { host: 'smtp.mail.me.com', port: 587 }, imap: { host: 'imap.mail.me.com', port: 993 } },
	yahoo: { smtp: { host: 'smtp.mail.yahoo.com', port: 587 }, imap: { host: 'imap.mail.yahoo.com', port: 993 } }
};

// ---------- the password, encrypted at rest ----------
const key = () => createHash('sha256').update(`${secret()}:mailbox`).digest();
function seal(plain: string) {
	const iv = randomBytes(12);
	const c = createCipheriv('aes-256-gcm', key(), iv);
	const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
	return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.');
}
function open(sealed: string) {
	const [iv, tag, enc] = sealed.split('.').map((s) => Buffer.from(s, 'base64url'));
	const d = createDecipheriv('aes-256-gcm', key(), iv);
	d.setAuthTag(tag);
	return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
}

const getBox = () => readData<Box | null>(FILE, null);
/** What the app may show: never the password. */
export function mailboxInfo() {
	const b = getBox();
	return b ? { email: b.email, provider: b.provider, connectedAt: b.connectedAt, lastSync: b.lastSync, lastError: b.lastError } : null;
}

const transport = (b: Box, pass: string) => nodemailer.createTransport({ host: b.smtp.host, port: b.smtp.port, secure: b.smtp.port === 465, requireTLS: b.smtp.port !== 465, auth: { user: b.email, pass }, connectionTimeout: 15000 });
const imapClient = (b: Box, pass: string) => new ImapFlow({ host: b.imap.host, port: b.imap.port, secure: true, auth: { user: b.email, pass }, logger: false, socketTimeout: 30000 });

/** Check both sending and reading work, then save. */
export async function connectMailbox(input: { email: string; pass: string; provider: Provider; name?: string; smtpHost?: string; smtpPort?: number; imapHost?: string; imapPort?: number }): Promise<string | null> {
	const email = input.email.trim().toLowerCase();
	const pass = input.pass.replace(/\s+/g, ''); // Google shows app passwords as "abcd efgh ijkl mnop"
	if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !pass) return 'email';
	const preset = input.provider !== 'other' ? PRESETS[input.provider] : null;
	const b: Box = {
		email,
		name: input.name,
		provider: input.provider,
		smtp: preset?.smtp ?? { host: input.smtpHost ?? '', port: input.smtpPort || 587 },
		imap: preset?.imap ?? { host: input.imapHost ?? '', port: input.imapPort || 993 },
		pass: '',
		connectedAt: new Date().toISOString()
	};
	if (!b.smtp.host || !b.imap.host) return 'hosts';
	try {
		await transport(b, pass).verify();
	} catch {
		return 'smtp';
	}
	const c = imapClient(b, pass);
	try {
		await c.connect();
		await c.logout();
	} catch {
		return 'imap';
	}
	b.pass = seal(pass);
	writeData(FILE, b);
	return null;
}

export function disconnectMailbox() {
	writeData(FILE, null);
}

/** Send one message from the agency's own address. Returns the Message-ID, to recognise the reply. */
export async function sendFromMailbox(m: { to: string; subject: string; text: string; inReplyTo?: string; fromName?: string }): Promise<string> {
	const b = getBox();
	if (!b) throw new Error('no-mailbox');
	const info = await transport(b, open(b.pass)).sendMail({
		from: { name: m.fromName || b.name || b.email, address: b.email },
		to: m.to,
		subject: m.subject,
		text: m.text,
		...(m.inReplyTo ? { inReplyTo: m.inReplyTo, references: [m.inReplyTo] } : {})
	});
	return info.messageId;
}

const FREE = /^(gmail|googlemail|hotmail|outlook|live|yahoo|icloud|me|skynet|telenet|proximus|scarlet|voo|orange|free|laposte|wanadoo|hotmail\.fr|msn)\./i;

/**
 * Read the inbox since the oldest open conversation: a message from a contacted business (same address, or same company domain,
 * or a reply to our message) moves it to "Replied" and stops the follow-ups. Runs every few minutes at most.
 */
export async function syncReplies(force = false): Promise<number> {
	const b = getBox();
	if (!b) return 0;
	if (!force && b.lastSync && Date.now() - new Date(b.lastSync).getTime() < 5 * 60_000) return 0;
	const os = getOS();
	const open_ = os.pipeline.filter((p) => (p.stage === 'contacted' || p.stage === 'lost') && p.contactedAt && p.email);
	b.lastSync = new Date().toISOString();
	if (!open_.length) {
		writeData(FILE, b);
		return 0;
	}
	const since = new Date(Math.min(...open_.map((p) => new Date(p.contactedAt! + 'T00:00:00').getTime())));
	const byEmail = new Map(open_.map((p) => [p.email!.toLowerCase(), p]));
	const byDomain = new Map(open_.filter((p) => !FREE.test(p.email!.split('@')[1] + '.')).map((p) => [p.email!.split('@')[1].toLowerCase(), p]));
	const byMsgId = new Map(open_.flatMap((p) => (p.msgIds ?? []).map((id) => [id, p] as const)));
	const c = imapClient(b, open(b.pass));
	let moved = 0;
	try {
		await c.connect();
		const lock = await c.getMailboxLock('INBOX');
		try {
			const uids = (await c.search({ since }, { uid: true })) || [];
			for await (const msg of c.fetch(uids.slice(-400), { envelope: true, uid: true }, { uid: true })) {
				const from = msg.envelope?.from?.[0]?.address?.toLowerCase() ?? '';
				if (!from || from === b.email) continue;
				const p = byMsgId.get(msg.envelope?.inReplyTo ?? '') ?? byEmail.get(from) ?? byDomain.get(from.split('@')[1] ?? '');
				if (!p || p.stage === 'talking') continue;
				const when = msg.envelope?.date ? new Date(msg.envelope.date) : new Date();
				if (when.getTime() < new Date(p.contactedAt! + 'T00:00:00').getTime()) continue;
				Object.assign(p, { stage: 'talking', reply: { at: when.toISOString(), subject: msg.envelope?.subject ?? '', from }, updatedAt: new Date().toISOString() });
				delete p.next;
				moved++;
			}
		} finally {
			lock.release();
		}
		await c.logout();
		b.lastError = undefined;
	} catch (e) {
		b.lastError = e instanceof Error ? e.message.slice(0, 200) : 'imap';
	}
	if (moved) saveOS(os);
	writeData(FILE, b);
	return moved;
}
