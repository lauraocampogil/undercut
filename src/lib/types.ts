export type Client = {
	id: string;
	name: string;
	domain: string; // e.g. https://example.be
	color: string; // brand colour used on reports
	createdAt: string;
	demo?: boolean; // seeded example client: data is simulated
	type?: 'web' | 'app' | 'both'; // what the agency manages for this client
	app?: { name?: string; iosId?: string; androidPackage?: string };
	google: {
		ga4PropertyId?: string; // "properties/123456"
		gscSiteUrl?: string; // "sc-domain:example.be" or "https://example.be/"
		gbpLocation?: string; // "locations/123"
		gtmContainer?: string; // "accounts/1/containers/2"
	};
};

export type Agency = {
	name: string;
	color: string;
	reportFooter: string;
	alerts?: {
		email?: string;
		slackWebhook?: string;
		digest?: boolean; // weekly summary every Monday
		rules?: Partial<Record<AlertRule, boolean>>;
	};
};

export type AlertRule = 'leads_drop' | 'no_leads' | 'traffic_drop' | 'site_down' | 'console_errors' | 'seo_drop' | 'app_crashes' | 'bad_reviews';

export type Point = { date: string; value: number };

export type Source = 'demo' | 'google';

export type Metrics = {
	range: { start: string; end: string; days: number };
	sources: Record<'ga4' | 'gsc' | 'gbp' | 'gtm', Source | 'error' | 'off'>;
	visits: { total: number; prev: number; daily: Point[] };
	users: { total: number; prev: number };
	engagementSec: { value: number; prev: number };
	conversions: { total: number; prev: number };
	channels: { name: string; visits: number }[];
	topPages: { path: string; views: number; change: number }[];
	search: {
		clicks: number;
		prevClicks: number;
		impressions: number;
		position: number;
		prevPosition: number;
		queries: { query: string; clicks: number; impressions: number; position: number }[];
	};
	maps: {
		views: number;
		calls: number;
		directions: number;
		websiteClicks: number;
		prevTotal: number;
	} | null;
	tags: { container: string; googleTagFound: boolean; tagCount: number } | null;
	errors: string[];
};

export type Level = 'good' | 'warn' | 'bad';

export type Area = 'Leads' | 'Traffic' | 'Google Search' | 'Google Maps' | 'Conversions' | 'Tracking' | 'Sitemap' | 'SEO' | 'App' | 'Behaviour';

export type Insight = {
	id: string; // stable rule id, used to tick tasks off
	issueId?: string; // SEO audit issue it comes from (to fix it in one click)
	level: Level;
	area: Area;
	title: string;
	meaning: string;
	action: string;
};

export type SitemapReport = {
	url: string;
	found: boolean;
	sitemapUrl: string | null;
	via: 'robots.txt' | 'default' | null;
	urlCount: number;
	childSitemaps: number;
	withLastmod: number;
	newestLastmod: string | null;
	stale: number; // urls with lastmod older than 12 months
	httpUrls: number;
	duplicates: number;
	checked: { url: string; status: number }[];
	broken: number;
	error?: string;
};

export type GscRow = { key: string; clicks: number; impressions: number; ctr: number; position: number; prevClicks?: number };

export type SearchConsoleDetail = {
	source: Source | 'error';
	error?: string;
	range: { start: string; end: string; days: number };
	totals: { clicks: number; impressions: number; ctr: number; position: number; prevClicks: number; prevImpressions: number; prevPosition: number };
	daily: { date: string; clicks: number; impressions: number }[];
	queries: GscRow[];
	pages: GscRow[];
	countries: GscRow[];
	devices: GscRow[];
};
