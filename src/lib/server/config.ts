import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { createFileRepo } from './db/file-repo';
import { createSupabaseRepo } from './db/supabase-repo';
import type { Repo } from './db/repo';

export const config = {
	appUrl: publicEnv.PUBLIC_APP_URL || 'http://localhost:5173',
	supabaseUrl: publicEnv.PUBLIC_SUPABASE_URL || '',
	supabaseAnonKey: publicEnv.PUBLIC_SUPABASE_ANON_KEY || '',
	supabaseServiceKey: env.SUPABASE_SERVICE_ROLE_KEY || '',
	serpApiKey: env.SERPAPI_KEY || '',
	braveKey: env.BRAVE_SEARCH_KEY || '',
	anthropicKey: env.ANTHROPIC_API_KEY || '',
	anthropicModel: env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
	resendKey: env.RESEND_API_KEY || '',
	emailFrom: env.EMAIL_FROM || 'Undercut <onboarding@resend.dev>',
	cronSecret: env.CRON_SECRET || '',
	fakeShopifyUrl: env.FAKE_SHOPIFY_URL || ''
};

/** Without Supabase configured, the app runs in demo mode (local JSON + login without verification). */
export const demoMode = !(config.supabaseUrl && config.supabaseAnonKey && config.supabaseServiceKey);

export const hasSearch = Boolean(config.serpApiKey || config.braveKey || config.fakeShopifyUrl);

let repo: Repo | null = null;
export function db(): Repo {
	if (!repo) {
		repo = demoMode
			? createFileRepo()
			: createSupabaseRepo(config.supabaseUrl, config.supabaseServiceKey);
	}
	return repo;
}
