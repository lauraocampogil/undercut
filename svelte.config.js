import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Frankfurt, next to the Supabase database. Node 22 like local dev and CI.
		adapter: adapter({ runtime: 'nodejs22.x', regions: ['fra1'] })
	}
};

export default config;
