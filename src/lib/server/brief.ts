// The morning brief: one short email on weekdays with what Undercut prepared for today.
// It only goes out when there is something to do, and links straight to the "To approve" inbox.
import { getAccount } from './store.ts';
import { getOS } from './agency-os.ts';
import { agenda, getBiz, money, today } from './business.ts';
import { inboxItems } from './inbox.ts';
import { sendEmail } from './email.ts';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);

export function briefContent(base: string) {
	const os = getOS();
	const b = getBiz();
	const items = inboxItems({ payments: false, ui: os.ui ?? os.profile?.lang });
	const t = today();
	const plan = agenda(b, [], 0).filter((a) => a.kind === 'meeting' || a.kind === 'task'); // follow-ups and invoices are already in the inbox
	const m = money(b);
	const friday = new Date().getDay() === 5;
	const count = (k: string) => items.filter((i) => i.kind === k).length;
	const lines = [count('first') && `${count('first')} new prospect${count('first') > 1 ? 's' : ''} to write to`, count('followup') && `${count('followup')} follow-up${count('followup') > 1 ? 's' : ''} due`, count('payment') && `${count('payment')} payment reminder${count('payment') > 1 ? 's' : ''}`].filter(Boolean) as string[];
	const subject = items.length ? `Today: ${lines.join(', ')}` : plan.length ? `Today: ${plan.length} thing${plan.length > 1 ? 's' : ''} in your agenda` : '';
	const link = `${base.replace(/\/$/, '')}/app`;
	const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0d0d0d">
<p style="color:#6b6b6b;font-size:13px;margin:0 0 4px">${esc(os.profile?.name ?? 'Undercut')} · ${t}</p>
<h1 style="font-size:24px;font-weight:600;margin:0 0 16px">Good morning. ${items.length ? `${items.length} thing${items.length > 1 ? 's' : ''} to approve.` : 'Your day.'}</h1>
${items.length ? `<table style="width:100%;border-collapse:collapse">${items.slice(0, 8).map((i) => `<tr><td style="padding:10px 0;border-bottom:1px solid #eee"><b style="font-weight:600">${esc(i.title)}</b><br><span style="color:#6b6b6b;font-size:13px">${esc(i.why)}</span></td></tr>`).join('')}</table>` : ''}
${plan.length ? `<p style="margin:20px 0 6px;font-weight:600">In your agenda</p>${plan.map((a) => `<p style="margin:4px 0">${a.time ? esc(a.time) + ' · ' : ''}${esc(a.title)}${a.sub ? ` <span style="color:#6b6b6b">· ${esc(a.sub)}</span>` : ''}</p>`).join('')}` : ''}
${friday ? `<p style="margin:20px 0 6px;font-weight:600">Your week in numbers</p><p style="margin:4px 0">Paid this month: ${eur(m.paidMonth)} · Monthly retainers: ${eur(m.mrr)} · Waiting: ${eur(m.unpaid)}${m.overdue ? ` (${m.overdue} late)` : ''}</p>` : ''}
<p style="margin:24px 0"><a href="${link}" style="background:#0d0d0d;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;display:inline-block">Open and approve</a></p>
<p style="color:#9a9a9a;font-size:12px">Nothing is sent without your click. Turn this email off in Undercut → Today.</p></div>`;
	return { subject, html, items: items.length, plan: plan.length };
}

/** Weekdays, once a day, only when there is something to do and the brief is on. */
export async function sendMorningBrief(base: string) {
	const day = new Date().getDay();
	if (day === 0 || day === 6) return false;
	if (getOS().brief === false) return false;
	const to = getAccount().email;
	if (!to) return false;
	const c = briefContent(base);
	if (!c.subject) return false;
	return sendEmail(to, c.subject, c.html);
}
