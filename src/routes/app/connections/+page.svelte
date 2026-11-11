<script lang="ts">
	import { page } from '$app/state';
	let { data } = $props();
	const g = $derived(data.google);
	const errors: Record<string, string> = {
		not_configured: 'Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file first (see README).',
		state: 'The login expired or was opened in another tab. Try again.',
		token: 'Google refused the login code. Check the redirect URI in Google Cloud.',
		access_denied: 'Access was not granted.'
	};
	const services = [
		{ name: 'Google Analytics 4', what: 'Visits, where people come from, top pages, contacts' },
		{ name: 'Search Console', what: 'What people search, clicks, position in Google' },
		{ name: 'Business Profile', what: 'Google Maps views, calls, route requests' },
		{ name: 'Tag Manager', what: 'Checks the tracking is installed correctly' },
		{ name: 'sitemap.xml', what: 'Always on, no login needed: pages listed, broken links' }
	];
</script>

<svelte:head><title>Connections · Undercut</title></svelte:head>

<div class="mx-auto max-w-2xl">
	<h1 class="display text-[48px] sm:text-[64px]">Connections</h1>
	<p class="mt-2 text-ink-2">Connect Google once. Then pick, per client, which property is theirs.</p>

	{#if page.url.searchParams.get('ok')}
		<p class="mt-5 rounded-xl bg-good-bg p-3 text-sm text-good">Google connected. Open a client → Connect data to link their properties.</p>
	{/if}
	{#if page.url.searchParams.get('error')}
		<p class="mt-5 rounded-xl bg-bad-bg p-3 text-sm text-bad">{errors[page.url.searchParams.get('error') ?? ''] ?? 'Something went wrong.'}</p>
	{/if}

	<div class="card mt-6 p-6">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div class="flex items-center gap-3">
				<svg width="36" height="36" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
				<div>
					<p class="font-semibold">Google</p>
					<p class="text-sm text-muted">{g.connected ? `Connected as ${g.email ?? 'your account'}` : 'Not connected — dashboards show demo data'}</p>
				</div>
			</div>
			{#if g.connected}
				<form method="POST" action="?/disconnect"><button class="btn btn-ghost">Disconnect</button></form>
			{:else}
				<a href="/auth/google" class="btn btn-primary" data-sveltekit-reload>Connect with Google</a>
			{/if}
		</div>
		<ul class="mt-6 divide-y divide-line border-t border-line">
			{#each services as s (s.name)}
				<li class="flex items-center justify-between gap-4 py-3">
					<div>
						<p class="text-sm font-medium">{s.name}</p>
						<p class="text-xs text-muted">{s.what}</p>
					</div>
					<span class="rounded-full px-2 py-0.5 text-[11px] font-medium {g.connected || s.name === 'sitemap.xml' ? 'bg-good-bg text-good' : 'bg-paper text-muted'}">
						{g.connected || s.name === 'sitemap.xml' ? 'Ready' : 'Waiting'}
					</span>
				</li>
			{/each}
		</ul>
	</div>

	{#if !g.configured}
		<details class="card mt-4 p-5 text-sm" open>
			<summary class="cursor-pointer font-medium">Developer setup (one time, ~10 min)</summary>
			<ol class="mt-3 list-decimal space-y-2 pl-5 text-ink-2">
				<li>Google Cloud Console → new project → enable <em>Google Analytics Data API, Analytics Admin API, Search Console API, Tag Manager API</em> and the <em>Business Profile</em> APIs.</li>
				<li>OAuth consent screen → External → add yourself as test user.</li>
				<li>Credentials → OAuth client ID → Web application → redirect URI:<br /><code class="num mt-1 inline-block rounded bg-paper px-2 py-1 text-xs">{data.redirectUri}</code></li>
				<li>Copy the client ID and secret into <code class="num">.env</code> and restart <code class="num">npm run dev</code>.</li>
			</ol>
		</details>
	{/if}
</div>
