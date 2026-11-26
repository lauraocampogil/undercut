// Legal pages content. Fill in COMPANY once the studio's details are final (enterprise number, address).
// Not legal advice: have a lawyer review before charging customers.
export const COMPANY = {
	name: 'Unix Creative Studio',
	product: 'Undercut',
	form: '', // e.g. 'sole proprietorship (entreprise individuelle)'
	enterprise: '', // BCE/KBO number, e.g. 'BE 0123.456.789'
	address: '', // registered address
	country: 'Belgium',
	email: 'hello@getundercut.app',
	site: 'https://getundercut.app',
	updated: '2026-11-24'
};

export type Section = { id: string; h: string; p: (string | string[])[] };

export const SUBPROCESSORS = [
	['Hetzner Online (Germany)', 'Server hosting for the app', 'EU'],
	['Supabase (EU region)', 'Database for accounts, analyses and the public database', 'EU'],
	['Resend', 'Sending emails (welcome, password reset)', 'US — Standard Contractual Clauses'],
	['Stripe', 'Payments and invoices', 'EU / US — Standard Contractual Clauses'],
	['Google', 'Sign in with Google (only your name, email and profile picture)', 'EU / US — Standard Contractual Clauses'],
	['Anthropic', 'Grouping public reviews into topics. Only review texts are sent, never your account data. No data used for training.', 'US — Standard Contractual Clauses']
] as const;
