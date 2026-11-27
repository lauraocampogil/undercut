// Shared types for Undercut's review database (safe to import in components).
export type Source = 'appstore' | 'googleplay' | 'reddit' | 'hackernews' | 'github' | 'trustpilot';
// Reddit stays in the type only for old data; it is not a source any more.
export const SOURCES: Partial<Record<Source, string>> = { appstore: 'App Store', googleplay: 'Google Play', hackernews: 'Hacker News', github: 'GitHub', trustpilot: 'Trustpilot' };

/** A product: an app, a website or a SaaS. Store ids when it has apps. */
export type StoreApp = {
	id: string;
	name: string;
	icon: string;
	seller: string;
	genre: string;
	genreId: string;
	rating: number; // 0 = no store rating
	count: number;
	version: string;
	updated: string;
	notes: string;
	price: string;
	url: string; // best public link (store page or website)
	iosId?: string;
	playId?: string;
	domain?: string;
	screenshots?: string[]; // the app's own store screenshots
};
export type FixStatus = 'none' | 'known' | 'working' | 'fixed';
/** A store review (1-5★) or a forum mention (stars 0: Reddit, Hacker News). */
export type Review = { id: string; source?: Source; stars: number; title: string; text: string; date: string; version: string; url?: string; theme?: string };
export type ThemeKind = 'feature' | 'pricing' | 'ux' | 'reliability' | 'support' | 'content' | 'other';
/** A complaint topic is a concrete improvement users ask for ("Add CSV export"); `kind` says what sort. */
export type Theme = { id: string; type: 'complaint' | 'praise'; label: string; kind?: ThemeKind };
export type ProductData = {
	app: StoreApp;
	reviews: Review[];
	sources?: Partial<Record<Source, number>>; // how many items each source gave
	badShare?: number; // % of 1-3★ among ALL store reviews read (we keep mostly the bad ones, so this is counted before trimming)
	fixes?: Record<string, { status: FixStatus; at?: string; version?: string }>; // theme id → fix (owner only)
};
export type Analysis = {
	id: string;
	input: string;
	createdAt: string;
	refreshedAt: string;
	themes: Theme[]; // one shared list, so the 4 products can be compared theme by theme
	main: ProductData;
	competitors: ProductData[];
	claimed?: boolean;
	claimVerified?: { method: 'email' | 'meta' | 'dns'; at: string; email?: string }; // how the claim was proven
	published?: string; // legacy
	themeNote?: string; // set when themes come from the keyword fallback instead of AI
	cached?: boolean; // copied from the database (no AI cost, not counted in the daily limit)
	ideas?: Idea[]; // opportunities found in the main product's complaints
	watch?: { since: string; counts: Record<string, number>; lastDigest?: string };
	tr?: Record<string, { labels: Record<string, string>; texts: Record<string, { title: string; text: string }> }>; // translations per language, made once
	insights?: Record<string, Insight>;
	how?: Record<string, How>; // per topic|lang: how the similar product with fewer complaints handles it // per complaint topic: the full analysis, made on first open // weekly email: complaint counts at the last email (key: product index|theme id)
	ideasAt?: string;
};

/** An opportunity found in bad reviews: the proof comes from the data, the idea from AI. */
export type Idea = {
	id: string;
	topic: string;
	topicLabel: string;
	product: string;
	title: string;
	problem: string;
	build: string;
	improve: string;
	audience: string;
	seo: string[];
	keywords: string[];
	strength: number; // 1-5
	count: number;
	total: number;
	share: number; // % of all complaints about the product
	best: { name: string; share: number; mine?: number } | null; // shares of each product's reviews // the competitor with the fewest complaints on it
	quotes: { text: string; stars: number; source: string; url: string; date: string }[];
};

/** Database row (no reviews), for the TrustMRR-style tables. */
export type DbStats = { reviews: number; complaintRate: number | null; topComplaint: { label: string; share: number } | null };
export type DbRow = { slug: string; app: StoreApp; owner: boolean; score: number | null; updatedAt: string; stats: DbStats; competitors: { slug: string; name: string; icon: string }[]; locked?: boolean };

/** The full analysis of one thing users want (made by AI from its reviews, cached). */
export type Insight = { mean: string[]; todo: string; why: string; whyNow: string; who: string; pitch: string; at: string };

/** How a similar product handles a thing users want, from its store page and its users' reviews. */
export type How = { name: string; points: string[]; proof: string[]; thin: boolean; at: string };
