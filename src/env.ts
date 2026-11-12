import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => value || undefined;

export const variables = defineEnvVars({
	GOOGLE_CLIENT_ID: { schema: optional, description: 'Google OAuth client ID (Web application)' },
	GOOGLE_CLIENT_SECRET: { schema: optional, description: 'Google OAuth client secret' },
	GOOGLE_REDIRECT_URI: { schema: optional, description: 'Defaults to <origin>/auth/google/callback' },
	ANTHROPIC_API_KEY: { schema: optional, description: 'Optional: AI weekly summaries' },
	SERPAPI_KEY: { schema: optional, description: 'Optional: Google Trends + top content (serpapi.com)' },
	PAGESPEED_API_KEY: { schema: optional, description: 'Optional: higher quota for PageSpeed Insights (works without)' },
	PUBLIC_BASE_URL: { schema: optional, description: 'Public URL of this app, used in the tracking snippet (e.g. https://app.undercut.be)' },
	DATAFORSEO_LOGIN: { schema: optional, description: 'Optional: real search volumes in Keyword research (dataforseo.com)' },
	DATAFORSEO_PASSWORD: { schema: optional, description: 'Optional: DataForSEO API password' },
	STRIPE_SECRET_KEY: { schema: optional, description: 'Optional: Stripe secret key for plans & billing' },
	STRIPE_PRICE_FREELANCE: { schema: optional, description: 'Stripe price id, Freelance plan' },
	STRIPE_PRICE_AGENCY: { schema: optional, description: 'Stripe price id, Agency plan' },
	STRIPE_PRICE_STUDIO: { schema: optional, description: 'Stripe price id, Studio plan' },
	ANTHROPIC_MODEL: { schema: optional, description: 'Optional: Claude model id' }
});
