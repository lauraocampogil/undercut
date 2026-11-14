<script lang="ts">
	import { page } from '$app/state';
	let { data, children } = $props();
	const c = $derived(data.client);
	const days = $derived(Number(page.url.searchParams.get('days')) || 28);
	const showDays = $derived(!/\/(settings|seo|heatmaps)$/.test(page.url.pathname));
	const section = $derived(
		({ leads: 'Leads', traffic: 'Traffic', search: 'Search & Maps', seo: 'SEO & fixes', keywords: 'Keywords', campaigns: 'Campaigns', heatmaps: 'Heatmaps', app: 'App analytics', settings: 'Setup & connections' } as Record<string, string>)[page.url.pathname.split('/')[4] ?? ''] ?? 'Summary'
	);
	const kind = $derived(data.web && data.app ? 'Website + app' : data.app ? 'App' : 'Website');
</script>

<section class="flex flex-wrap items-end justify-between gap-6">
	<div class="min-w-0">
		<p class="label">{section}</p>
		<h1 class="display truncate text-[44px] sm:text-[64px]">{c.name}</h1>
		<div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
			<span class="rounded-full bg-white px-3 py-1 text-xs font-medium">{kind}</span>
			{#if data.web}<a href={c.domain} target="_blank" rel="noreferrer" class="text-muted hover:text-ink">{c.domain.replace(/^https?:\/\//, '')} ↗</a>{/if}
			{#if c.demo}<span class="rounded-full bg-[#E4F5B8] px-3 py-1 text-xs">Example client · demo data</span>{/if}
		</div>
	</div>
	<div class="flex flex-wrap items-center gap-2">
		{#if showDays}
			<div class="flex rounded-full bg-white p-1 text-sm">
				{#each [7, 28, 90] as d (d)}
					<a href="?days={d}" data-sveltekit-noscroll class="rounded-full px-3.5 py-1.5 {days === d ? 'bg-ink text-white' : 'text-ink-2'}">{d}d</a>
				{/each}
			</div>
		{/if}
		<a href="/r/{c.id}?days={days}" class="btn btn-accent" target="_blank">Client report ↗</a>
	</div>
</section>



<div class="mt-6">
	{@render children()}
</div>
