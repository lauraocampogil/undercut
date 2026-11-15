<script lang="ts">
	import Linkify from '#lib/components/Linkify.svelte';
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	let { data, form } = $props();
	const c = $derived(data.client);
	let type = $state(untrack(() => data.client.type) ?? 'web');
	let copied = $state(false);
	const fields = [
		{ key: 'ga4', label: 'Google Analytics 4', help: 'Website visits — and app usage if Firebase is linked to it', placeholder: 'properties/123456789', current: () => c.google.ga4PropertyId, show: () => true },
		{ key: 'gsc', label: 'Search Console', help: 'Searches, clicks, position in Google', placeholder: 'sc-domain:example.be', current: () => c.google.gscSiteUrl, show: () => type !== 'app' },
		{ key: 'gbp', label: 'Business Profile', help: 'Google Maps: views, calls, routes', placeholder: 'locations/123456', current: () => c.google.gbpLocation, show: () => type !== 'app' },
		{ key: 'gtm', label: 'Tag Manager', help: 'Checks that the GA4 tag is installed', placeholder: 'accounts/1/containers/2', current: () => c.google.gtmContainer, show: () => type !== 'app' }
	] as const;
	function copy() {
		navigator.clipboard?.writeText(data.snippet);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<svelte:head><title>Setup · {c.name}</title></svelte:head>

{#if page.url.searchParams.get('new')}
	<p class="mb-4 rounded-[20px] bg-accent p-4 text-sm text-accent-ink">Client added. The SEO audit already runs on its website. Connect the data below — missing something? Create it here in one click.</p>
{/if}

<form method="POST" action="?/save" class="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
	<!-- left: who is this client -->
	<div class="flex flex-col gap-4">
		<div class="card space-y-5 p-6">
			<h2 class="display text-[32px] leading-none">1 · The client</h2>
			<label class="block"><span class="label">Name</span><input class="input mt-1.5" name="name" value={c.name} /></label>
			<fieldset>
				<legend class="label">What do you manage for them?</legend>
				<div class="mt-2 grid grid-cols-3 gap-2">
					{#each [['web', 'Website'], ['app', 'App'], ['both', 'Both']] as [val, l] (val)}
						<label class="cursor-pointer">
							<input type="radio" name="type" value={val} bind:group={type} class="peer sr-only" />
							<span class="block rounded-full border border-[#d6d6d0] py-2.5 text-center text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white">{l}</span>
						</label>
					{/each}
				</div>
			</fieldset>
			{#if type !== 'app'}
				<label class="block"><span class="label">Website</span><input class="input mt-1.5" name="domain" value={c.domain} /></label>
			{:else}
				<input type="hidden" name="domain" value={c.domain} />
			{/if}
			<label class="block"><span class="label">Colour on reports</span><input class="mt-1.5 block h-[46px] w-16 cursor-pointer rounded-full border border-line bg-white p-1" type="color" name="color" value={c.color} /></label>
		</div>

		{#if type !== 'web'}
			<div class="card space-y-4 p-6">
				<h2 class="display text-[32px] leading-none">The app</h2>
				<label class="block"><span class="label">App name</span><input class="input mt-1.5" name="appName" value={c.app?.name ?? ''} /></label>
				<label class="block">
					<span class="label">App Store ID</span>
					<input class="input mt-1.5" name="iosId" value={c.app?.iosId ?? ''} placeholder="e.g. 1459969523" />
					<span class="mt-1 block text-xs text-muted">The number in the App Store link (…/id<b>1459969523</b>). Ratings and reviews load automatically.</span>
				</label>
				<label class="block">
					<span class="label">Google Play package</span>
					<input class="input mt-1.5" name="androidPackage" value={c.app?.androidPackage ?? ''} placeholder="e.g. be.client.app" />
				</label>
				<p class="rounded-[16px] bg-tile p-3 text-xs text-ink-2">Usage, retention, screens and crashes come from Firebase: link the app's Firebase project to a GA4 property and pick that property on the right.</p>
			</div>
		{/if}
	</div>

	<!-- right: data sources -->
	<div class="flex flex-col gap-4">
		<div class="card divide-y divide-line">
			<div class="flex flex-wrap items-center justify-between gap-3 p-6">
				<h2 class="display text-[32px] leading-none">2 · Google data</h2>
				{#if !data.connected}<a href="/app/settings#connections" class="btn btn-primary">Connect Google</a>{:else}<span class="rounded-full bg-good-bg px-3 py-1 text-xs text-good">Google connected</span>{/if}
			</div>
			{#if form?.createError}
				<div class="bg-bad-bg p-4 text-sm text-bad"><Linkify text={form.createError} /></div>
			{/if}
			{#if form?.created}
				<div class="bg-good-bg p-4 text-sm text-good">
					{#if form.created === 'ga4'}GA4 property created ✓ · Measurement ID <b>{form.measurementId}</b>. Next: create the Tag Manager container — it gets the GA4 tag automatically.
					{:else if form.created === 'gtm'}Tag Manager container <b>{form.publicId}</b> created{form.published ? ' with the GA4 tag, and published' : ''} ✓ — the Undercut snippet now loads it on the site.
					{:else}Search Console verified and added ✓ ({form.gscId}). Google needs 2–3 days before the first numbers appear.{/if}
				</div>
			{/if}
			{#if form?.gsc?.token}
				<div class="space-y-3 bg-tile p-6 text-sm">
					{#if form.gsc.method === 'META'}
						<p class="font-medium">1. Paste this line in the &lt;head&gt; of {form.gsc.host} (next to the Undercut snippet) and publish the site:</p>
						<pre class="overflow-x-auto rounded-[14px] bg-ink p-3 text-xs text-accent">&lt;meta name="google-site-verification" content="{form.gsc.token}" /&gt;</pre>
					{:else}
						<p class="font-medium">1. Add this TXT record to the DNS of {form.gsc.host} (at the domain registrar):</p>
						<pre class="overflow-x-auto rounded-[14px] bg-ink p-3 text-xs text-accent">Type: TXT   Name: @   Value: {form.gsc.token}</pre>
					{/if}
					<input type="hidden" name="token" value={form.gsc.token} /><input type="hidden" name="host" value={form.gsc.host} />
					<p class="font-medium">2. Then:</p>
					<button formaction="?/gscVerify" name="method" value={form.gsc.method} class="btn btn-primary py-2 text-sm">Verify & add to Search Console</button>
				</div>
			{/if}
			{#if !data.canManage && data.connected}
				<p class="bg-tile px-6 py-3 text-xs text-muted">The first “Create” asks Google for permission to create properties for you (one time).</p>
			{/if}
			{#if data.options?.errors.length}
				<div class="space-y-1 bg-warn-bg p-4 text-sm text-warn">{#each data.options.errors as e, i (i)}<p><Linkify text={e} /></p>{/each}</div>
			{/if}
			{#each fields as f (f.key)}
				{#if f.show()}
					{@const opts = data.options?.[f.key] ?? []}
					{@const linked = f.current() ?? data.suggested[f.key]}
					<div class="grid items-center gap-3 p-6 sm:grid-cols-[1fr_1.2fr]">
						<span><span class="block font-medium">{f.label}</span><span class="block text-sm text-muted">{f.help}</span></span>
						<div class="flex flex-col gap-2">
							{#if opts.length}
								<select class="input" name={f.key} aria-label={f.label}>
									<option value="">Not used</option>
									{#each opts as o (o.value)}<option value={o.value} selected={o.value === linked}>{o.label}{!f.current() && o.value === data.suggested[f.key] ? ' (suggested)' : ''}</option>{/each}
								</select>
							{:else}
								<input class="input text-sm" name={f.key} value={f.current() ?? ''} placeholder={f.placeholder} aria-label={f.label} />
							{/if}
							{#if data.connected && !linked && c.domain}
								{#if f.key === 'ga4'}
									<button formaction="?/createGa4" class="btn btn-accent self-start py-2 text-sm">＋ Create a GA4 property for {c.name}</button>
								{:else if f.key === 'gtm'}
									<button formaction="?/createGtm" class="btn btn-accent self-start py-2 text-sm">＋ Create a Tag Manager container{c.google.measurementId ? ' (with GA4 inside)' : ''}</button>
								{:else if f.key === 'gsc'}
									<div class="flex flex-wrap gap-2">
										<button formaction="?/gscToken" name="method" value="META" class="btn btn-accent py-2 text-sm">＋ Add to Search Console</button>
										<button formaction="?/gscToken" name="method" value="DNS_TXT" class="pill py-2 text-sm">Use DNS instead</button>
									</div>
								{:else if f.key === 'gbp'}
									<a href="https://business.google.com/create" target="_blank" rel="noreferrer" class="pill self-start py-2 text-sm">Create a Business Profile ↗</a>
								{/if}
							{/if}
							{#if f.key === 'gtm' && c.google.gtmPublicId}
								<label class="flex items-start gap-2 text-xs text-ink-2"><input type="checkbox" name="loadGtm" checked={c.google.loadGtm} class="mt-0.5 accent-[#0D0D0D]" /><span>Load {c.google.gtmPublicId} through the Undercut snippet — GA4 works without touching the site. GA4 uses cookies: the site's cookie banner must allow it.</span></label>
							{/if}
						</div>
					</div>
				{:else}
					<input type="hidden" name={f.key} value={f.current() ?? ''} />
				{/if}
			{/each}
		</div>

		{#if type !== 'app'}
			<div class="card-dark p-6">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<h2 class="display text-[32px] leading-none">3 · Heatmaps</h2>
					<span class="rounded-full px-3 py-1 text-xs {data.trackingInstalled ? 'bg-accent text-accent-ink' : 'bg-white/10 text-white/70'}">{data.trackingInstalled ? 'Receiving data' : 'Not installed yet'}</span>
				</div>
				<p class="mt-3 text-sm text-white/60">Paste before &lt;/head&gt; on the client's site, or add it in Tag Manager as a Custom HTML tag. Cookieless — no banner needed.</p>
				<pre class="mt-4 overflow-x-auto rounded-[16px] bg-white/[.07] p-4 text-[13px] text-accent">{data.snippet}</pre>
				<button type="button" class="btn btn-accent mt-3" onclick={copy}>{copied ? 'Copied ✓' : 'Copy snippet'}</button>
			</div>
		{/if}

		<div class="flex flex-wrap items-center justify-between gap-3 px-2">
			<button formaction="?/delete" class="text-sm text-bad hover:underline" onclick={(e) => { if (!confirm(`Delete ${c.name}?`)) e.preventDefault(); }}>Delete client</button>
			<button class="btn btn-primary">Save →</button>
		</div>
	</div>
</form>
