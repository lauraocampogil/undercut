<script lang="ts">
	import { page } from '$app/state';
	let { data } = $props();
	const c = $derived(data.client);
	const fields = [
		{ key: 'ga4', label: 'Google Analytics 4', help: 'Visits, sources, pages, contacts', placeholder: 'properties/123456789', current: () => c.google.ga4PropertyId },
		{ key: 'gsc', label: 'Search Console', help: 'Searches, clicks, position in Google', placeholder: 'sc-domain:example.be', current: () => c.google.gscSiteUrl },
		{ key: 'gbp', label: 'Business Profile', help: 'Maps views, calls, route requests', placeholder: 'locations/123456', current: () => c.google.gbpLocation },
		{ key: 'gtm', label: 'Tag Manager', help: 'Checks the GA4 tag is installed', placeholder: 'accounts/1/containers/2', current: () => c.google.gtmContainer }
	] as const;
</script>

<svelte:head><title>Connect data · {c.name}</title></svelte:head>

<div class="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
	<div class="card-dark flex flex-col gap-4 p-7">
		<h2 class="display text-[44px] leading-none">One login,<br /><em>every</em> source.</h2>
		<p class="text-white/60">Pick which Google property belongs to {c.name}. Leave a field empty if the client does not use it.</p>
		{#if page.url.searchParams.get('new')}
			<p class="rounded-[18px] bg-accent p-4 text-sm text-accent-ink">Client added. The sitemap is already being checked. Link Google here, or skip and open the dashboard with demo numbers.</p>
		{/if}
		{#if !data.connected}
			<a href="/app/connections" class="btn btn-accent mt-auto self-start">Connect Google first</a>
		{/if}
		{#if data.options?.errors.length}
			<div class="rounded-[18px] bg-white/10 p-4 text-sm text-white/80">
				{#each data.options.errors as e (e)}<p>{e}</p>{/each}
			</div>
		{/if}
	</div>

	<form method="POST" action="?/save" class="card divide-y divide-line">
		<div class="grid gap-4 p-6 sm:grid-cols-[1fr_auto]">
			<label class="block">
				<span class="label">Client name</span>
				<input class="input mt-1.5" name="name" value={c.name} />
			</label>
			<label class="block">
				<span class="label">Colour</span>
				<input class="mt-1.5 block h-[46px] w-16 cursor-pointer rounded-full border border-line bg-white p-1" type="color" name="color" value={c.color} />
			</label>
		</div>
		{#each fields as f (f.key)}
			{@const opts = data.options?.[f.key] ?? []}
			<label class="grid items-center gap-3 p-6 sm:grid-cols-[1fr_1.3fr]">
				<span>
					<span class="block font-medium">{f.label}</span>
					<span class="block text-sm text-muted">{f.help}</span>
				</span>
				{#if opts.length}
					<select class="input" name={f.key}>
						<option value="">Not used</option>
						{#each opts as o (o.value)}<option value={o.value} selected={o.value === f.current()}>{o.label}</option>{/each}
					</select>
				{:else}
					<input class="input text-sm" name={f.key} value={f.current() ?? ''} placeholder={f.placeholder} />
				{/if}
			</label>
		{/each}
		<div class="flex flex-wrap items-center justify-between gap-3 p-6">
			<button formaction="?/delete" class="text-sm text-bad hover:underline" onclick={(e) => { if (!confirm(`Delete ${c.name}?`)) e.preventDefault(); }}>Delete client</button>
			<button class="btn btn-primary">Save and open dashboard →</button>
		</div>
	</form>
</div>
