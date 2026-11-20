// Small display helpers for the agency business pages (clients, tasks, invoices).
export const eur = (n: number, currency = 'EUR') => new Intl.NumberFormat('en-IE', { style: 'currency', currency, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n || 0);
export const dayLabel = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
export const short = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const todayIso = () => new Date().toISOString().slice(0, 10);
export const host = (u?: string) => (u ?? '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
export const href = (u: string) => (/^https?:\/\//.test(u) ? u : `https://${u}`);
export const STATUS_LABEL: Record<string, string> = { active: 'Active', paused: 'Paused', ended: 'Ended', draft: 'Draft', sent: 'Sent', accepted: 'Accepted', declined: 'Declined', paid: 'Paid' };
