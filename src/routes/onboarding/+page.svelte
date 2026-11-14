<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Logo from '#lib/components/Logo.svelte';
	let { data, form } = $props();

	const steps = ['Client', 'Google', 'Snippet', 'Done'];
	let type = $state<'web' | 'app' | 'both'>('web');
	let copied = $state(false);
	let checking = $state(false);
	let platform = $state('wordpress');
	const next = $derived(encodeURIComponent(`/onboarding?step=2&client=${data.client?.id ?? ''}`));

	const platforms: Record<string, { label: string; how: string[] }> = {
		wordpress: { label: 'WordPress', how: ['Install the free plugin “WPCode”', 'Code Snippets → Header & Footer', 'Paste in “Header” → Save'] },
		webflow: { label: 'Webflow', how: ['Site settings → Custom code', 'Paste in “Head code”', 'Save and publish'] },
		wix: { label: 'Wix', how: ['Settings → Custom code', 'Add code → paste → “Head”', 'Apply to all pages'] },
		shopify: { label: 'Shopify', how: ['Online store → Themes → Edit code', 'Open theme.liquid', 'Paste before </head> → Save'] },
		gtm: { label: 'Tag Manager', how: ['New tag → Custom HTML', 'Paste the snippet', 'Trigger: All pages → Publish'] },
		code: { label: 'Custom code', how: ['Open your main layout / index.html', 'Paste inside <head>', 'Deploy'] }
	};

	function copy() {
		navigator.clipboard?.writeText(data.snippet);
		copied = true;
		setTimeout(() => (copied = false), 1600);
	}
</script>

<svelte:head><title>Set up · Undercut</title></svelte:head>

<div class="min-h-dvh bg-paper px-4 py-5 sm:px-8">
	<header class="mx-auto flex max-w-3xl items-center justify-between">
		<a href="/"><Logo /></a>
		<a href="/app" class="text-sm text-muted hover:text-ink">Skip setup →</a>
	</header>

	<!-- progress -->
	<ol class="mx-auto mt-8 flex max-w-3xl items-center gap-2" aria-label="Progress">
		{#each steps as s, i (s)}
			{@const n = i + 1}
			<li class="flex flex-1 items-center gap-2">
				<span class="grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold {n < data.step ? 'bg-accent text-accent-ink' : n === data.step ? 'bg-ink text-white' : 'bg-white text-muted'}">{n < data.step ? '✓' : n}</span>
				<span class="hidden text-sm sm:block {n === data.step ? 'font-medium' : 'text-muted'}">{s}</span>
				{#if n < steps.length}<span class="h-px flex-1 {n < data.step ? 'bg-ink' : 'bg-line'}"></span>{/if}
			</li>
		{/each}
	</ol>

	<main class="mx-auto mt-8 max-w-3xl pb-16">
		{#if data.step === 1}
			<p class="label">Hi {data.account.name.split(' ')[0] || 'there'} 👋</p>
			<h1 class="display mt-2 text-[44px] leading-none sm:text-[56px]">Add your first <em>client</em></h1>
			<form method="POST" action="?/client" class="card mt-8 space-y-5">
				{#if form?.error}<p class="rounded-[16px] bg-bad-bg p-3 text-sm text-bad">{form.error}</p>{/if}
				<div>
					<span class="label">What do you manage for them?</span>
					<div class="mt-2 grid grid-cols-3 gap-2">
						{#each [['web', '🌐', 'Website'], ['app', '📱', 'App'], ['both', '✦', 'Both']] as [v, ico, l] (v)}
							<label class="cursor-pointer rounded-[18px] border-2 p-4 text-center transition-colors {type === v ? 'border-ink bg-white' : 'border-transparent bg-tile'}">
								<input type="radio" name="type" value={v} bind:group={type} class="sr-only" />
								<span class="block text-2xl">{ico}</span><span class="mt-1 block text-sm font-medium">{l}</span>
							</label>
						{/each}
					</div>
				</div>
				<label class="block"><span class="label">Client name</span><input class="input mt-1.5" name="name" value={form?.name ?? ''} placeholder="Maison Lou" required /></label>
				{#if type !== 'app'}
					<label class="block"><span class="label">Website</span><input class="input mt-1.5" name="domain" value={form?.domain ?? ''} placeholder="maisonlou.be" inputmode="url" required /></label>
				{/if}
				<button class="btn btn-primary w-full py-3 text-base">Continue →</button>
			</form>
		{:else if data.step === 2 && data.client}
			<p class="label">{data.client.name}</p>
			<h1 class="display mt-2 text-[44px] leading-none sm:text-[56px]">Connect <em>Google</em></h1>
			<p class="mt-3 text-ink-2">One sign-in. We find this client’s Analytics, Search Console, Maps and Tag Manager for you.</p>

			{#if data.google.error && data.google.error !== 'not_configured'}
				<p class="mt-6 rounded-[16px] bg-bad-bg p-3 text-sm text-bad">Google didn’t connect ({data.google.error}). Try again.</p>
			{/if}

			{#if data.google.connected && data.matches.length}
				<form method="POST" action="?/link" class="card mt-8">
					<input type="hidden" name="client" value={data.client.id} />
					<p class="flex items-center gap-2 text-sm font-medium"><span class="size-2 rounded-full bg-good"></span>Google connected — here’s what we found</p>
					<ul class="mt-4 grid gap-2 sm:grid-cols-2">
						{#each data.matches as m (m.key)}
							<li class="rounded-[18px] p-4 {m.option ? 'bg-[#E4F5B8]' : 'bg-tile'}">
								<p class="text-xs text-muted">{m.label}</p>
								<p class="mt-1 truncate font-medium">{m.option?.label ?? 'Not found'}</p>
								{#if m.option}<input type="hidden" name={m.key} value={m.option.value} />{/if}
							</li>
						{/each}
					</ul>
					<p class="mt-3 text-xs text-muted">Wrong match? Change it later in Setup & connections.</p>
					<button class="btn btn-primary mt-5 w-full py-3 text-base">Looks good →</button>
				</form>
			{:else}
				<div class="card mt-8 flex flex-col items-center gap-4 py-10 text-center">
					<div class="flex -space-x-2">
						{#each ['#4285F4', '#EA4335', '#FBBC05', '#34A853'] as c (c)}<span class="size-10 rounded-full border-4 border-white" style="background:{c}"></span>{/each}
					</div>
					{#if data.google.configured}
						<a href="/auth/google?next={next}" class="btn btn-primary px-6 py-3 text-base">
							<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#fff" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" /><path fill="#fff" opacity=".7" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" /></svg>
							Continue with Google
						</a>
						<p class="max-w-sm text-xs text-muted">Read-only access. We never change anything in your Google accounts.</p>
					{:else}
						<p class="max-w-sm text-sm text-ink-2">Google sign-in isn’t switched on for this workspace yet (missing GOOGLE_CLIENT_ID). You can still continue — the snippet alone already counts leads and visits.</p>
					{/if}
				</div>
				<a href="/onboarding?step={data.client.type === 'app' ? 4 : 3}&client={data.client.id}" class="mt-4 block text-center text-sm text-muted hover:text-ink">Skip for now</a>
			{/if}
		{:else if data.step === 3 && data.client}
			<p class="label">{data.client.name}</p>
			<h1 class="display mt-2 text-[44px] leading-none sm:text-[56px]">Paste one <em>line</em></h1>
			<p class="mt-3 text-ink-2">Leads, heatmaps and one-click fixes start the minute it’s live. No cookies, no banner needed.</p>

			<div class="card-dark mt-8">
				<pre class="overflow-x-auto rounded-[16px] bg-white/[.07] p-4 text-[13px] text-accent">{data.snippet}</pre>
				<button type="button" class="btn btn-accent mt-3" onclick={copy}>{copied ? 'Copied ✓' : 'Copy snippet'}</button>
			</div>

			<div class="card mt-4">
				<div class="flex flex-wrap gap-2">
					{#each Object.entries(platforms) as [k, p] (k)}
						<button type="button" class="pill {platform === k ? 'pill-active' : ''}" onclick={() => (platform = k)}>{p.label}</button>
					{/each}
				</div>
				<ol class="mt-5 grid gap-2 sm:grid-cols-3">
					{#each platforms[platform].how as h, i (h)}
						<li class="rounded-[18px] bg-tile p-4 text-sm"><span class="mb-2 grid size-6 place-items-center rounded-full bg-ink text-[11px] text-white">{i + 1}</span>{h}</li>
					{/each}
				</ol>
			</div>

			<form method="POST" action="?/check" class="mt-4" use:enhance={() => { checking = true; return async ({ update }) => { await update({ reset: false }); checking = false; }; }}>
				<input type="hidden" name="client" value={data.client.id} />
				{#if form?.check === 'ok' || data.installed}
					<div class="card flex items-center gap-4 bg-[#E4F5B8]">
						<span class="grid size-10 place-items-center rounded-full bg-ink text-accent">✓</span>
						<p class="flex-1 font-medium">Snippet found on {data.client.domain.replace(/^https?:\/\//, '')}</p>
						<a href="/onboarding?step=4&client={data.client.id}" class="btn btn-primary">Next →</a>
					</div>
				{:else}
					{#if form?.check === 'missing'}<p class="mb-3 rounded-[16px] bg-[#FFF3D6] p-3 text-sm">Not found yet. Published the site? Caches can take a minute.</p>{/if}
					{#if form?.check === 'unreachable'}<p class="mb-3 rounded-[16px] bg-[#FFF3D6] p-3 text-sm">We couldn’t open the site from here. You can continue — we’ll detect it with the first visit.</p>{/if}
					<div class="flex flex-col gap-2 sm:flex-row">
						<button class="btn btn-primary flex-1 py-3 text-base" disabled={checking}>{checking ? 'Checking…' : 'Check installation'}</button>
						<a href="/onboarding?step=4&client={data.client.id}" class="btn btn-ghost flex-1 py-3 text-base">I’ll do it later</a>
					</div>
				{/if}
			</form>
		{:else if data.step === 4 && data.client}
			<div class="card-dark relative overflow-hidden py-14 text-center">
				<div class="absolute -top-20 left-1/2 size-80 -translate-x-1/2 rounded-full bg-accent/60 blur-3xl"></div>
				<p class="relative text-5xl">✦</p>
				<h1 class="display relative mt-4 text-[44px] leading-none sm:text-[64px]">You’re <em>set</em></h1>
				<p class="relative mx-auto mt-3 max-w-md text-white/70">{data.client.name} is in Undercut. Data fills in as visits come in — the first report is ready on Monday.</p>
				<div class="relative mt-8 flex flex-col justify-center gap-2 sm:flex-row">
					<a href="/app/clients/{data.client.id}" class="btn btn-accent px-6 py-3 text-base">Open dashboard →</a>
					<a href="/onboarding" class="btn bg-white/10 px-6 py-3 text-base text-white">Add another client</a>
				</div>
			</div>
			<ul class="mt-4 grid gap-2 sm:grid-cols-3">
				{#each [[data.client.google.ga4PropertyId || data.client.google.gscSiteUrl, 'Google'], [data.installed, 'Snippet'], [true, 'Weekly report']] as [ok, l] (l)}
					<li class="card flex items-center gap-3 py-4"><span class="size-2.5 rounded-full {ok ? 'bg-good' : 'bg-[#E3A21A]'}"></span><span class="text-sm">{l}</span><span class="ml-auto text-xs text-muted">{ok ? 'On' : 'Later'}</span></li>
				{/each}
			</ul>
		{/if}
		<p class="mt-10 text-center text-xs text-muted">{data.agency} · {page.url.host}</p>
	</main>
</div>
