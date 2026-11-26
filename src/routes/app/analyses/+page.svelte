<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { kindOf } from '#lib/kinds.ts';
	import { appT } from '#lib/app-i18n.ts';
	let { data, form } = $props();
	const t = $derived(appT(data.lang));
	const H = $derived(t.home);
	let busy = $state(false);
	let formEl = $state<HTMLFormElement>();
	// the field shows what was just typed; a failed run keeps it so it can be corrected
	let url = $state('');
	$effect.pre(() => {
		url = form?.input ?? data.prefill ?? '';
	});
	let step = $state(0);
	$effect(() => {
		if (!busy) return;
		step = 0;
		const id = setInterval(() => (step = Math.min(step + 1, H.steps.length - 1)), 7000);
		return () => clearInterval(id);
	});
	// coming from the site or the database with ?url=…: start once, then remove ?url= so going back never re-runs an old link
	let autoDone = false;
	$effect(() => {
		if (autoDone || !data.prefill || form || !formEl) return;
		autoDone = true;
		const u = new URL(page.url.href);
		u.searchParams.delete('url');
		replaceState(u, {});
		formEl.requestSubmit();
	});
	const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));
	const stats = $derived([
		[fmt(data.overview.products), H.statProducts, '/app/following'],
		[fmt(data.overview.following), H.statFollowing, '/app/following'],
		[fmt(data.overview.reviews), H.statReviews, ''],
		[fmt(data.overview.asks), H.statAsks, '']
	] as [string, string, string][]);
</script>

<svelte:head><title>{t.nav.home} · Undercut</title></svelte:head>

<section class="flex flex-col gap-9">
	<!-- 1. the input: the one thing to do here -->
	<div class="flex flex-col gap-3.5">
		<p class="text-sm text-muted">{data.hello.date}{data.hello.name ? ` · ${H.hi} ${data.hello.name}` : ''}</p>
		<h1 class="text-[34px] font-medium tracking-tight sm:text-[40px]">{H.title}</h1>
		<form method="POST" action="?/analyze" bind:this={formEl} class="card flex flex-col gap-2 p-2 sm:flex-row" onsubmit={(e) => { if (busy) e.preventDefault(); else busy = true; }}>
			<label for="analyze-url" class="sr-only">{H.placeholder}</label>
			<input id="analyze-url" name="url" required bind:value={url} placeholder={H.placeholder} class="min-w-0 flex-1 rounded-2xl px-4 py-3.5 text-base outline-none" readonly={busy} />
			<button class="btn btn-primary min-h-12 px-6 text-[15px]" aria-busy={busy} disabled={busy}>{busy ? H.steps[step] + '…' : H.cta}</button>
		</form>
		{#if form?.error}<p class="rounded-2xl bg-bad-bg px-4 py-3 text-sm text-bad">{form.error}{#if form && 'limited' in form && form.limited} <a href="/app/settings/billing" class="font-medium underline">{H.unlock}</a>{/if}</p>{/if}
		<p class="text-[13px] text-muted">{busy ? H.reading : H.left(data.left, data.limit)}</p>
	</div>

	{#if data.overview.products}
		<!-- 2. the overview -->
		<dl class="grid grid-cols-2 gap-3 md:grid-cols-4">
			{#each stats as [n, label, href]}
				{#if href}
					<a {href} class="card p-5 hover:border-black/25"><dt class="text-xs text-muted">{label}</dt><dd class="big mt-1 text-3xl">{n}</dd></a>
				{:else}
					<div class="card p-5"><dt class="text-xs text-muted">{label}</dt><dd class="big mt-1 text-3xl">{n}</dd></div>
				{/if}
			{/each}
		</dl>

		<!-- 3. the biggest asks -->
		{#if data.asks.length}
			<section class="flex flex-col gap-3.5">
				<div class="flex items-baseline justify-between gap-3">
					<h2 class="text-xl font-medium tracking-tight">{H.asks}</h2>
					<a href="/app/following" class="text-[13px] text-muted hover:text-ink">{H.seeAll}</a>
				</div>
				<div class="card overflow-hidden">
					{#each data.asks as x (x.report + x.id)}
						{@const k = kindOf(x.kind)}
						<a href="/app/analyses/{x.report}/{x.id}" class="flex items-center gap-3.5 border-b border-line px-5 py-3.5 last:border-0 hover:bg-[#fafaf8]">
							<span class="w-[96px] shrink-0">{#if x.kind && x.kind !== 'other'}<span class="block rounded-full px-2 py-0.5 text-center text-xs font-medium" style="background:{k.bg};color:{k.fg}">{t.kinds[x.kind] ?? k.label}</span>{/if}</span>
							<span class="min-w-0 flex-1 truncate text-[15px] font-medium">{x.label}</span>
							<span class="hidden items-center gap-1.5 text-[13px] text-muted sm:flex">{#if x.icon}<img src={x.icon} alt="" class="size-5 rounded-md" />{/if}{x.product}</span>
							<span class="w-24 text-right text-[13px]"><b>{x.n}</b> {H.reviews}</span>
							{#if x.delta}<span class="w-12 text-right text-xs {x.delta > 0 ? 'text-bad' : 'text-good'}">{x.delta > 0 ? `▲${x.delta}` : `▼${-x.delta}`}</span>{/if}
						</a>
					{/each}
				</div>
			</section>
		{/if}
	{:else}
		<div class="card flex flex-col gap-2 p-6">
			<p class="font-medium">{H.emptyTitle}</p>
			<p class="max-w-2xl text-sm text-ink-2">{H.emptyText}</p>
			<a href="/app/database" class="mt-1 self-start text-sm font-medium underline">{H.tryOne}</a>
		</div>
	{/if}
</section>
