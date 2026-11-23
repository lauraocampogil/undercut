// Form actions for the agency's mailbox: connect / disconnect (Settings), send from it (Today), check replies now.
import { fail, type RequestEvent } from '@sveltejs/kit';
import { connectMailbox, disconnectMailbox, sendFromMailbox, syncReplies, type Provider } from './mailbox.ts';
import { getOS, saveOS } from './agency-os.ts';
import { resolveItem, type InboxKind } from './inbox.ts';

type E = RequestEvent;
const str = (f: FormData, k: string, max = 500) => String(f.get(k) ?? '').trim().slice(0, max);

export const mailboxActions = {
	mailbox: async ({ request }: E) => {
		const f = await request.formData();
		const provider = (['gmail', 'icloud', 'yahoo', 'other'].includes(str(f, 'provider')) ? str(f, 'provider') : 'other') as Provider;
		const err = await connectMailbox({
			email: str(f, 'email', 160),
			pass: String(f.get('pass') ?? ''),
			provider,
			name: getOS().profile?.name,
			smtpHost: str(f, 'smtpHost', 120),
			smtpPort: Number(str(f, 'smtpPort')) || undefined,
			imapHost: str(f, 'imapHost', 120),
			imapPort: Number(str(f, 'imapPort')) || undefined
		});
		if (err) return fail(400, { mailboxError: err });
		return { mailboxOk: true };
	},
	mailboxOff: async () => {
		disconnectMailbox();
		return { mailboxOff: true };
	},
	syncNow: async () => ({ synced: await syncReplies(true) }),
	/** "Send": from the agency's own address, then the item moves on like any approved message. */
	send: async ({ request }: E) => {
		const f = await request.formData();
		const kind = str(f, 'kind') as InboxKind;
		const id = str(f, 'id');
		const to = str(f, 'to', 200);
		let subject = str(f, 'subject', 200);
		const text = String(f.get('message') ?? '').slice(0, 5000);
		if (!to || !text) return fail(400, { sendError: 'empty' });
		const os = getOS();
		const p = kind === 'payment' ? undefined : os.pipeline.find((x) => x.id === id);
		// follow-ups go in the same thread as the first message
		const inReplyTo = kind === 'followup' ? p?.msgIds?.[0] : undefined;
		if (inReplyTo && p?.subject) subject = `Re: ${p.subject}`;
		let msgId: string;
		try {
			msgId = await sendFromMailbox({ to, subject, text, inReplyTo, fromName: os.profile?.name });
		} catch {
			return fail(400, { sendError: 'smtp' });
		}
		if (p) {
			p.msgIds = [...(p.msgIds ?? []), msgId];
			if (kind === 'first') p.subject = subject;
			saveOS(os);
		}
		resolveItem(kind, id, true);
		return { sent: id };
	}
};
