// Transactional email through Resend (optional). Returns false when not configured, so callers can show a link instead.
import * as env from '$app/env/private';

export const emailReady = () => Boolean(env.RESEND_API_KEY);

/** `unsubscribe`: the link to stop these emails (shown by Gmail and Outlook next to the sender, one click). */
export async function sendEmail(to: string, subject: string, html: string, unsubscribe?: string) {
	if (!env.RESEND_API_KEY) return false;
	try {
		const res = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
			body: JSON.stringify({ from: env.ALERTS_FROM || 'Undercut <onboarding@resend.dev>', to: [to], subject, html, ...(unsubscribe ? { headers: { 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } } : {}) })
		});
		return res.ok;
	} catch {
		return false;
	}
}
