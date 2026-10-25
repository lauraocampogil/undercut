import { config } from './config';

/** Sends with Resend. Without RESEND_API_KEY, prints the email to the console (demo mode). */
export async function sendEmail(to: string, subject: string, html: string, text: string) {
	if (!config.resendKey) {
		console.log(`\n📬 [demo email] To: ${to}\nSubject: ${subject}\n${text}\n`);
		return;
	}
	const res = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: { authorization: `Bearer ${config.resendKey}`, 'content-type': 'application/json' },
		body: JSON.stringify({ from: config.emailFrom, to, subject, html, text })
	});
	if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/**
 * Weekly summary email. Push notifications are the main channel (Phase 4);
 * this email stays as the fallback for users who don't enable push.
 */
export function reminderEmail(o: { count: number; competitors: number; headline: string | null; url: string }) {
	const subject =
		o.count === 0
			? 'A quiet week for your competitors'
			: `${o.count} change${o.count > 1 ? 's' : ''} from your competitors this week`;
	const lead =
		o.count === 0
			? `None of your ${o.competitors} competitors moved their prices this week.`
			: `Your ${o.competitors} competitors made ${o.count} change${o.count > 1 ? 's' : ''} in the last 7 days.`;
	const text = `${lead}\n${o.headline ?? ''}\n\nSee everything in your dashboard: ${o.url}`;
	const html = `<!doctype html><html><body style="margin:0;background:#FFF1D6;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFF8EA;border-radius:24px;padding:36px">
<tr><td style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#5C5140">Undercut · weekly summary</td></tr>
<tr><td style="padding-top:14px;font-size:26px;font-weight:800;line-height:1.2">${esc(subject)}</td></tr>
<tr><td style="padding-top:12px;font-size:16px;line-height:1.5;color:#333">${esc(lead)}</td></tr>
${o.headline ? `<tr><td style="padding-top:16px"><div style="border-radius:14px;padding:12px 16px;background:#FF6A3D;font-size:15px;font-weight:600;line-height:1.45">${esc(o.headline)}</div></td></tr>` : ''}
<tr><td style="padding-top:28px"><a href="${o.url}" style="display:inline-block;background:#111;color:#FFF1D6;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:700;font-size:15px">Open my dashboard →</a></td></tr>
<tr><td style="padding-top:28px;font-size:12px;color:#5C5140">You get this summary once a week. Change the day in Settings.</td></tr>
</table></td></tr></table></body></html>`;
	return { subject, html, text };
}
