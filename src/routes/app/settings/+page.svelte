<script lang="ts">
	import { page } from '$app/state';
	let { data, form } = $props();
	const g = $derived(data.google);
	const errors: Record<string, string> = {
		not_configured: 'Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the .env file first (see the developer setup below).',
		state: 'The login expired or was opened in another tab. Try again.',
		token: 'Google refused the login code. Check the redirect URI in Google Cloud.',
		access_denied: 'Access was not granted.'
	};
	const sources = [
		{ name: 'Google Analytics 4', what: 'Website visits + app usage (Firebase)' },
		{ name: 'Search Console', what: 'Searches, clicks, position' },
		{ name: 'Business Profile', what: 'Google Maps actions' },
		{ name: 'Tag Manager', what: 'Tracking installed correctly' }
	];
	const optional = $derived([
		{ name: 'Trends & ranking pages', env: 'SERPAPI_KEY', on: data.keys.serpapi, what: 'Content ideas: Google Trends and the pages that rank' },
		{ name: 'PageSpeed', env: 'PAGESPEED_API_KEY', on: data.keys.pagespeed, what: 'Speed checks work without; a key raises the quota' },
		{ name: 'AI summaries', env: 'ANTHROPIC_API_KEY', on: data.keys.anthropic, what: 'Weekly summaries written by Claude, in FR/NL/EN' }
	]);
</script>

<svelte:head><title>Settings · Undercut</title></svelte:head>


{#if page.url.searchParams.get('ok')}<p class="mt-5 rounded-[20px] bg-good-bg p-4 text-sm text-good">Google connected. Open a client → Setup to pick its properties.</p>{/if}
{#if page.url.searchParams.get('error')}<p class="mt-5 rounded-[20px] bg-bad-bg p-4 text-sm text-bad">{errors[page.url.searchParams.get('error') ?? ''] ?? 'Something went wrong.'}</p>{/if}

<form method="POST" action="?/save" class="grid gap-4 lg:grid-cols-2">
	<section id="agency" class="card scroll-mt-6 space-y-5 p-6 sm:p-7">
		<div>
			<h2 class="display text-[34px] leading-none">Your agency</h2>
			<p class="mt-2 text-sm text-muted">Shown in the workspace and on every report you send.</p>
		</div>
		<label class="block"><span class="label">Agency name</span><input class="input mt-1.5" name="name" value={data.agency.name} /></label>
		<label class="block"><span class="label">Agency colour</span><input class="mt-1.5 block h-[46px] w-16 cursor-pointer rounded-full border border-line bg-white p-1" type="color" name="color" value={data.agency.color} /></label>
		{#if form?.saved}<p class="rounded-[16px] bg-good-bg p-3 text-sm text-good">Saved.</p>{/if}
		<button class="btn btn-primary">Save</button>
	</section>

	<section id="reports" class="card-dark scroll-mt-6 flex flex-col gap-5 p-6 sm:p-7">
		<div>
			<h2 class="display text-[34px] leading-none">Client reports</h2>
			<p class="mt-2 text-sm text-white/60">Each client gets a one-page report in plain words — with <b class="text-white">your</b> agency name, never "Undercut" (white-label). Open it from any client with “Client report”, then send the link or save it as PDF.</p>
		</div>
		<!-- mini preview -->
		<div class="rounded-[22px] bg-white p-4 text-ink">
			<div class="rounded-[16px] bg-ink p-4 text-white">
				<span class="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-ink">{data.agency.name}</span>
				<p class="display mt-6 text-3xl">Client name</p>
				<p class="text-[11px] text-white/60">Your website, the last 28 days</p>
			</div>
			<div class="mt-2 grid grid-cols-4 gap-1.5">{#each ['Visits', 'People', 'Clicks', 'Contacts'] as k (k)}<div class="rounded-xl bg-tile p-2"><p class="text-[9px] text-muted">{k}</p><p class="big text-lg">—</p></div>{/each}</div>
		</div>
		<label class="block"><span class="label text-white/60!">Message at the bottom of each report</span><textarea class="input mt-1.5 text-ink" rows="2" name="reportFooter">{data.agency.reportFooter}</textarea></label>
		<div class="flex flex-wrap gap-2">
			<button class="btn btn-accent">Save</button>
			{#if data.exampleClient}<a href="/r/{data.exampleClient}" target="_blank" class="btn btn-ghost border-white/30 text-white">See an example ↗</a>{/if}
		</div>
	</section>
</form>

<section id="connections" class="mt-4 grid scroll-mt-6 gap-4 lg:grid-cols-2">
	<div class="card p-6 sm:p-7">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<h2 class="display text-[34px] leading-none">Google</h2>
				<p class="mt-2 text-sm text-muted">{g.connected ? `Connected as ${g.email ?? 'your account'}` : 'One login for every client. Until then, dashboards show example data.'}</p>
			</div>
			{#if g.connected}
				<form method="POST" action="?/disconnect"><button class="btn btn-ghost">Disconnect</button></form>
			{:else}
				<a href="/auth/google" class="btn btn-primary" data-sveltekit-reload>Connect with Google</a>
			{/if}
		</div>
		{#if g.connected}
			<div class="mt-5 flex flex-wrap items-center gap-2 rounded-[18px] p-3 text-sm {data.health.ok ? 'bg-good-bg text-good' : 'bg-bad-bg text-bad'}">
				<span class="size-2 rounded-full {data.health.ok ? 'bg-good' : 'bg-bad'}"></span>
				<span class="flex-1">{data.health.ok ? `Working${data.health.lastOk ? ` · last data ${new Date(data.health.lastOk).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}` : data.health.lastError}</span>
				<form method="POST" action="?/test"><button class="rounded-full bg-white px-3 py-1 text-xs text-ink">Test connection</button></form>
				<form method="POST" action="?/refresh"><button class="rounded-full bg-white px-3 py-1 text-xs text-ink">Refresh data</button></form>
			</div>
			{#if form?.test}<p class="mt-2 text-sm {form.test.ok ? 'text-good' : 'text-bad'}">{form.test.ok ? `Connection OK (${form.test.ms} ms)` : form.test.error}</p>{/if}
			{#if form?.refreshed}<p class="mt-2 text-sm text-good">Cache cleared — dashboards will load fresh numbers.</p>{/if}
		{:else if data.health.revoked}
			<p class="mt-5 rounded-[18px] bg-bad-bg p-3 text-sm text-bad">{data.health.lastError}</p>
		{/if}
		<ul class="mt-5 space-y-1.5">
			{#each sources as s (s.name)}
				<li class="flex items-center justify-between gap-4 rounded-full bg-tile px-4 py-2.5 text-sm">
					<span><span class="font-medium">{s.name}</span> <span class="hidden text-muted sm:inline">· {s.what}</span></span>
					<span class="size-2 shrink-0 rounded-full {g.connected ? 'bg-good' : 'bg-[#c4c4bf]'}"></span>
				</li>
			{/each}
		</ul>
		{#if !g.configured}
			<details class="mt-5 text-sm">
				<summary class="cursor-pointer font-medium">Developer setup (one time, ~10 min)</summary>
				<ol class="mt-3 list-decimal space-y-2 pl-5 text-ink-2">
					<li>Google Cloud Console → new project → enable Analytics Data, Analytics Admin, Search Console, Tag Manager and the Business Profile APIs.</li>
					<li>OAuth consent screen → External → add yourself as test user.</li>
					<li>Credentials → OAuth client ID → Web application → redirect URI <code class="rounded bg-tile px-1.5 py-0.5 text-xs">{data.redirectUri}</code></li>
					<li>Put the ID and secret in <code>.env</code> and restart.</li>
				</ol>
			</details>
		{/if}
	</div>

	<div class="card p-6 sm:p-7">
		<h2 class="display text-[34px] leading-none">Extras</h2>
		<p class="mt-2 text-sm text-muted">Optional keys in <code>.env</code>. Everything works without them, with example data where needed.</p>
		<ul class="mt-5 space-y-1.5">
			{#each optional as o (o.env)}
				<li class="flex items-center justify-between gap-4 rounded-[18px] bg-tile px-4 py-3 text-sm">
					<span><span class="block font-medium">{o.name}</span><span class="block text-xs text-muted">{o.what}</span></span>
					<span class="shrink-0 rounded-full px-2.5 py-1 text-[11px] {o.on ? 'bg-good-bg text-good' : 'bg-white text-muted'}">{o.on ? 'On' : o.env}</span>
				</li>
			{/each}
			<li class="flex items-center justify-between gap-4 rounded-[18px] bg-tile px-4 py-3 text-sm">
				<span><span class="block font-medium">sitemap.xml, SEO audit, questions</span><span class="block text-xs text-muted">Always on, nothing to set up</span></span>
				<span class="rounded-full bg-good-bg px-2.5 py-1 text-[11px] text-good">On</span>
			</li>
		</ul>
	</div>
</section>
