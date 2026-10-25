import { sentrySvelteKit } from '@sentry/sveltekit/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Source maps are uploaded to Sentry only when SENTRY_AUTH_TOKEN is set (e.g. on Vercel).
const uploadSourceMaps = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default defineConfig({
	plugins: [
		sentrySvelteKit({
			autoUploadSourceMaps: uploadSourceMaps,
			org: process.env.SENTRY_ORG,
			project: process.env.SENTRY_PROJECT,
			authToken: process.env.SENTRY_AUTH_TOKEN
		}),
		tailwindcss(),
		sveltekit()
	],
	test: { include: ['src/**/*.test.ts'] }
});
