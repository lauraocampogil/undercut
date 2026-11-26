// How much to trust an idea or a finding: how many reviews back it.
export const MIN_PROOF = 10;
export type Signal = { label: 'Strong' | 'Medium' | 'Low'; bg: string; fg: string };
export function signalOf(n: number): Signal {
	if (n >= 20) return { label: 'Strong', bg: '#e6f4ea', fg: '#1e6b3a' };
	if (n >= MIN_PROOF) return { label: 'Medium', bg: '#fff4e0', fg: '#8a5300' };
	return { label: 'Low', bg: '#efefec', fg: '#555555' };
}
