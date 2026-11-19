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
	updated: '2026-11-19'
};

export type Section = { id: string; h: string; p: (string | string[])[] };

export const SUBPROCESSORS = [
	['Hetzner Online (Germany)', 'Server hosting for the app and its data', 'EU'],
	['Supabase (EU region)', 'Database for accounts and workspaces', 'EU'],
	['Resend', 'Sending emails (reports, alerts, invitations)', 'US — Standard Contractual Clauses'],
	['Stripe', 'Payments and invoices', 'EU / US — Standard Contractual Clauses'],
	['Google (APIs)', 'Reading Analytics, Search Console, Business Profile, Tag Manager and PageSpeed data you connect', 'EU / US — Standard Contractual Clauses'],
	['Anthropic', 'AI features (summaries, suggested fixes, messages). No data used for training.', 'US — Standard Contractual Clauses'],
	['OpenStreetMap services (Nominatim, Overpass)', 'Finding public business listings for prospects — only a city name and categories are sent', 'EU']
] as const;
