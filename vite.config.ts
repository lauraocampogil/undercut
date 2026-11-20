import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Node server: runs anywhere with a disk (Coolify / Docker / any VPS). Data lives in ./.data (mount a volume).
			adapter: adapter(),
			// forms on the marketing domain (beta, free tool) post to the same app
			csrf: { trustedOrigins: ['https://getundercut.app', 'https://www.getundercut.app'] }
		})
	]
});
