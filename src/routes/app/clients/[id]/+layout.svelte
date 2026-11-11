<script lang="ts">
	import { page } from '$app/state';
	let { data, children } = $props();
	const c = $derived(data.client);
	const days = $derived(Number(page.url.searchParams.get('days')) || 28);
	const base = $derived(`/app/clients/${c.id}`);
	const tabs = $derived([
		{ href: base, label: 'Dashboard' },
		{ href: `${base}/search-console`, label: 'Search Console' },
		{ href: `/app/ideas?client=${c.id}`, label: 'Content ideas' },
		{ href: `${base}/settings`, label: 'Connect data' }
	]);
	const isActive = (href: string) => page.url.pathname === href.split('?')[0];
	const showDays = $derived(!page.url.pathname.endsWith('/settings'));
</script>

<section class="flex flex-wrap items-end justify-between gap-6">
	<div class="min-w-0">
		<a href="/app" class="label hover:text-ink">← All clients</a>
		<h1 class="display mt-2 truncate text-[48px] sm:text-[76px]">{c.name}</h1>
		<a href={c.domain} target="_blank" rel="noreferrer" class="mt-1 inline-block text-sm text-muted hover:text-ink">{c.domain.replace(/^https?:\/\//, '')} ↗</a>
	</div>
	<div class="flex flex-wrap items-center gap-2">
		{#if showDays}
			<div class="flex rounded-full bg-white p-1 text-sm">
				{#each [7, 28, 90] as d (d)}
					<a href="?days={d}" data-sveltekit-noscroll class="rounded-full px-3.5 py-1.5 {days === d ? 'bg-ink text-white' : 'text-ink-2'}">{d} days</a>
				{/each}
			</div>
		{/if}
		<a href="/r/{c.id}?days={days}" class="btn btn-accent" target="_blank">Client report ↗</a>
	</div>
</section>

<nav class="scrollbar-none mt-6 -mx-3 flex gap-2 overflow-x-auto px-3">
	{#each tabs as t (t.href)}
		<a href={t.href} class="pill {isActive(t.href) ? 'pill-active' : ''}">{t.label}</a>
	{/each}
</nav>

<div class="mt-5">
	{@render children()}
</div>
