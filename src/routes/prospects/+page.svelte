<script lang="ts">
	import { enhance } from '$app/forms';
	import Logo from '#lib/components/Logo.svelte';
	let { data, form } = $props();

	let loading = $state(false);
	let copied = $state('');
	const SERVICES = [
		['web', 'Websites'],
		['app', 'Apps'],
		['social', 'Social media'],
		['seo', 'SEO'],
		['branding', 'Branding'],
		['ads', 'Ads'],
		['video', 'Photo & video']
	] as const;
	const steps = ['Reading your site…', 'Understanding what you sell…', 'Looking at businesses around you…', 'Checking their websites…', 'Writing the first messages…'];
	let si = $state(0);
	$effect(() => {
		if (!loading) return;
		si = 0;
		const t = setInterval(() => (si = Math.min(steps.length - 1, si + 1)), 2600);
		return () => clearInterval(t);
	});
	const copy = async (id: string, text: string) => {
		await navigator.clipboard.writeText(text);
		copied = id;
		setTimeout(() => (copied = ''), 1600);
	};
	const url = $derived(form?.url ?? data.url);
	const run = $derived(form && 'run' in form ? form.run : null);
	const profile = $derived(form && 'profile' in form ? form.profile : null);
	const services = $derived<string[]>(profile?.services ?? []);
</script>

<svelte:head>
	<title>Find 5 clients for your agency — free · Undercut</title>
	<meta name="description" content="Paste your agency’s URL. Undercut finds 5 real local businesses that need what you sell, checks their website and writes the first message. Free." />
	<meta name="theme-color" content="#F7F7F5" />
</svelte:head>

<div class="min-h-dvh overflow-x-clip bg-paper text-ink">
	<header class="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-4 pt-5 sm:px-6">
		<a href="/" aria-label="Undercut home"><Logo size={28} /></a>
		<a href="/beta?from=prospects" class="btn btn-primary">Create free account →</a>
	</header>

	<section class="relative isolate mx-auto max-w-[1180px] px-4 pt-16 pb-10 sm:px-6 sm:pt-24">
		<div class="pointer-events-none absolute top-[-200px] left-1/2 -z-10 h-[600px] w-[1000px] -translate-x-1/2 bg-[radial-gradient(40%_50%_at_35%_45%,rgba(180,186,200,.45),transparent_70%),radial-gradient(35%_45%_at_70%_40%,rgba(214,208,198,.5),transparent_70%)] blur-[40px]" aria-hidden="true"></div>
		<p class="text-sm text-muted">Free tool · no account needed</p>
		<h1 class="mt-3 max-w-3xl text-[40px] leading-[1.05] font-medium tracking-tight sm:text-[64px]">Your next 5 clients are <em class="font-serif font-normal text-ink/45">around the corner.</em></h1>
		<p class="mt-4 max-w-xl text-lg text-ink-2">Paste your agency’s website. We figure out what you sell, find local businesses that need it, check their site and write the first message.</p>

		<form
			method="POST"
			class="mt-8 max-w-2xl"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					await update({ reset: false });
					loading = false;
				};
			}}
		>
			<div class="flex flex-col gap-2 rounded-[22px] border border-line bg-white p-1.5 shadow-[0_8px_30px_-12px_rgba(0,0,0,.15)] focus-within:border-ink/40 sm:flex-row">
				<input name="url" value={url} required autocomplete="url" inputmode="url" placeholder="youragency.com, or your Instagram, TikTok or LinkedIn" class="min-w-0 flex-1 bg-transparent px-4 py-3 text-base outline-none placeholder:text-muted" />
				<button class="btn btn-primary justify-center px-6 py-3" disabled={loading}>{loading ? 'Searching…' : 'Find my 5 clients →'}</button>
			</div>

			{#if form && 'ask' in form && form.ask}
				<div class="card mt-4 p-5">
					<p class="text-sm text-ink-2">{form.ask}</p>
					<label class="mt-3 block text-xs text-muted">City<input name="city" required value={profile?.city ?? ''} placeholder="Your city" class="mt-1 w-full rounded-2xl border border-line bg-white px-4 py-3 text-base outline-none placeholder:text-muted focus:border-ink/40" /></label>
					<p class="mt-4 text-xs text-muted">What do you sell?</p>
					<div class="mt-2 flex flex-wrap gap-2">
						{#each SERVICES as [k, l] (k)}
							<label class="cursor-pointer"><input type="checkbox" name="services" value={k} checked={services.includes(k)} class="peer sr-only" /><span class="inline-block rounded-full border border-line bg-white px-4 py-2 text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white">{l}</span></label>
						{/each}
					</div>
				</div>
			{:else if run && profile}
				<!-- let them correct what we understood, then search again -->
				<details class="mt-3 text-sm text-muted">
					<summary class="cursor-pointer">We understood: <b class="font-medium text-ink">{profile.name}</b> · {profile.services.join(', ')} · {profile.city}. <u>Change</u></summary>
					<div class="card mt-3 p-5">
						<label class="block text-xs">City<input name="city" value={profile.city} class="mt-1 w-full rounded-2xl border border-line bg-white px-4 py-3 text-base outline-none focus:border-ink/40" /></label>
						<div class="mt-3 flex flex-wrap gap-2">
							{#each SERVICES as [k, l] (k)}
								<label class="cursor-pointer"><input type="checkbox" name="services" value={k} checked={services.includes(k)} class="peer sr-only" /><span class="inline-block rounded-full border border-line bg-white px-4 py-2 text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white">{l}</span></label>
							{/each}
						</div>
						<button class="btn btn-primary mt-4">Search again</button>
					</div>
				</details>
			{/if}
			{#if form?.error}
				<p class="mt-3 text-sm text-bad">{form.error}{#if 'limit' in form && form.limit} <a href="/beta?from=prospects" class="underline">Create a free account</a>{/if}</p>
			{/if}
		</form>

		{#if loading}
			<div class="mt-10 flex items-center gap-3 text-ink-2" aria-live="polite">
				<span class="size-2.5 animate-ping rounded-full bg-ink"></span>{steps[si]}
			</div>
		{/if}
	</section>

	{#if run && !loading}
		<section class="mx-auto max-w-[1180px] px-4 pb-24 sm:px-6">
			{#if run.error}
				<p class="card p-5 text-ink-2">{run.error}</p>
			{:else if !run.prospects.length}
				<p class="card p-5 text-ink-2">We looked at {run.scanned} businesses around {profile?.city} and their online presence is already good. Try a nearby city or another service.</p>
			{:else}
				<p class="text-sm text-muted">{run.scanned} businesses around {run.center?.label.split(',')[0]} looked at · the {run.prospects.length} that need you most</p>
				<div class="mt-4 grid gap-4 lg:grid-cols-2">
					{#each run.prospects as p, i (p.id)}
						<article class="card flex flex-col p-5 sm:p-6">
							<div class="flex items-start justify-between gap-4">
								<div class="min-w-0">
									<p class="text-xs text-muted">{p.category}{p.address ? ` · ${p.address}` : ''}</p>
									<h2 class="mt-1 truncate text-xl font-medium">{p.name}</h2>
								</div>
								<div class="shrink-0 text-right">
									<p class="text-3xl font-medium">{p.score}</p>
									<p class="text-[10px] tracking-wide text-muted uppercase">needs you</p>
								</div>
							</div>
							<ul class="mt-4 flex flex-wrap gap-1.5">
								{#each p.issues as x (x.key)}<li class="rounded-full border border-line px-3 py-1 text-xs text-ink-2">{x.label}</li>{/each}
									{#if p.budget === 'high'}<li class="rounded-full bg-ink px-3 py-1 text-xs text-white">can afford an agency</li>{/if}
								</ul>
								{#if p.proof?.length}
									<p class="mt-3 text-xs text-muted">Check it yourself: {#each p.proof as pr, k (pr.url)}{k ? ' · ' : ''}<a class="underline hover:text-ink" href={pr.url} target="_blank" rel="noopener nofollow">{pr.label}</a>{/each}</p>
								{/if}
							<div class="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
								{#if p.website}<a href={p.website.startsWith('http') ? p.website : `https://${p.website}`} target="_blank" rel="noopener nofollow" class="hover:text-ink">↗ Website</a>{/if}
								{#if p.phone}<a href="tel:{p.phone}" class="hover:text-ink">☎ {p.phone}</a>{/if}
								{#if p.instagram}<span>Instagram ✓</span>{/if}
								<a href={p.osmUrl} target="_blank" rel="noopener" class="hover:text-ink">Map</a>
							</div>
							{#if i === 0}
								<div class="mt-5 rounded-[20px] bg-tile p-4">
									<p class="text-xs text-muted">First message — review it, then send it yourself</p>
									<p class="mt-2 text-sm whitespace-pre-line text-ink">{p.message}</p>
									<button type="button" class="btn btn-primary mt-3 text-sm" onclick={() => copy(p.id, p.message)}>{copied === p.id ? 'Copied ✓' : 'Copy message'}</button>
								</div>
							{:else}
								<a href="/beta?from=prospects" class="mt-5 block rounded-[20px] bg-tile p-4 text-sm text-muted hover:text-ink">
									<span class="block blur-[3px] select-none" aria-hidden="true">Hi {p.name}, I was looking at your website and noticed…</span>
									<span class="mt-2 block font-medium text-ink">Create a free account to see this message →</span>
								</a>
							{/if}
						</article>
					{/each}
				</div>

				<div class="mt-8 flex flex-col items-start justify-between gap-5 card-dark p-6 sm:flex-row sm:items-center sm:p-8">
					<div>
						<p class="text-2xl font-medium">Want 50 like these every month?</p>
						<p class="mt-1 text-white/60">Your own dashboard: new prospects every week, a simple pipeline, and your clients’ sites and apps in one place.</p>
					</div>
					<a href="/beta?from=prospects" class="btn shrink-0 bg-white text-ink hover:bg-white/90">Build my dashboard →</a>
				</div>
			{/if}
			<p class="mt-6 text-xs text-muted">Business data © <a href="https://www.openstreetmap.org/copyright" class="underline" target="_blank" rel="noopener">OpenStreetMap contributors</a> (ODbL), via <a href="https://www.geoapify.com/" class="underline" target="_blank" rel="noopener">Geoapify</a>. Websites checked live by Undercut. You send every message yourself.</p>
		</section>
	{/if}
</div>
