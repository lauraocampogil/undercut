// Monthly usage counters for Billing & usage (MVP: JSON file; production: Supabase table).
import { readData, writeData } from './store.ts';

export type UsageKind = 'ai' | 'audits' | 'fixes' | 'events' | 'reports';
const FILE = 'usage.json';
const month = () => new Date().toISOString().slice(0, 7);

function read(): Record<string, Partial<Record<UsageKind, number>>> {
	return readData(FILE, {});
}

export function track(kind: UsageKind, n = 1) {
	if (!n) return;
	const all = read();
	const m = (all[month()] ??= {});
	m[kind] = (m[kind] ?? 0) + n;
	writeData(FILE, all);
}

export function usageThisMonth(): Record<UsageKind, number> {
	const m = read()[month()] ?? {};
	return { ai: m.ai ?? 0, audits: m.audits ?? 0, fixes: m.fixes ?? 0, events: m.events ?? 0, reports: m.reports ?? 0 };
}
