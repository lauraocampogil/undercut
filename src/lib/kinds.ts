// What sort of thing users want, with its colour. Reliability (bugs, sync, login) is real but not strategy: shown last, folded.
import type { ThemeKind } from './review-types.ts';
export const KINDS: Record<ThemeKind, { label: string; bg: string; fg: string }> = {
	feature: { label: 'Feature', bg: '#e8f0fe', fg: '#1a56db' },
	pricing: { label: 'Pricing', bg: '#fff1e0', fg: '#b45f06' },
	ux: { label: 'Experience', bg: '#f1ecfd', fg: '#6a43d6' },
	support: { label: 'Support', bg: '#e6f4ea', fg: '#1e7a3e' },
	content: { label: 'Content', bg: '#fdf2f8', fg: '#a3306f' },
	other: { label: 'Other', bg: '#f1f1ee', fg: '#555555' },
	reliability: { label: 'Reliability', bg: '#f1f1ee', fg: '#555555' }
};
export const kindOf = (k?: string) => KINDS[(k as ThemeKind) ?? 'other'] ?? KINDS.other;
export const ORDER: ThemeKind[] = ['feature', 'pricing', 'ux', 'support', 'content', 'other', 'reliability'];
