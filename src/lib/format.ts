export const n = (v: number) => Math.round(v).toLocaleString('en-US');
export const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : 0);
export const secs = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, '0')}s` : `${Math.round(s)}s`);
export const day = (iso: string) => {
	const d = new Date(iso + 'T00:00:00Z');
	return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};
