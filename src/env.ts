import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => value || undefined;

export const variables = defineEnvVars({
	GOOGLE_CLIENT_ID: { schema: optional, description: 'Google OAuth client ID (Web application)' },
	GOOGLE_CLIENT_SECRET: { schema: optional, description: 'Google OAuth client secret' },
	GOOGLE_REDIRECT_URI: { schema: optional, description: 'Defaults to <origin>/auth/google/callback' },
	ANTHROPIC_API_KEY: { schema: optional, description: 'Optional: AI weekly summaries' },
	SERPAPI_KEY: { schema: optional, description: 'Optional: Google Trends + top content (serpapi.com)' },
	ANTHROPIC_MODEL: { schema: optional, description: 'Optional: Claude model id' }
});
