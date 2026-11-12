<script lang="ts">
	import { page } from '$app/state';
	let { data, children } = $props();
	const c = $derived(data.client);
	const days = $derived(Number(page.url.searchParams.get('days')) || 28);
	const base = $derived(`/app/clients/${c.id}`);
	const q = $derived(days !== 28 ? `?days=${days}` : '');
	type Tab = { href: string; label: string; group?: string };
	const tabs = $derived(
		[
			{ href: base, label: 'Summary' },
			...(data.web
				? [
						{ href: `${base}/leads`, label: 'Leads', group: 'Website' },
						{ href: `${base}/traffic`, label: 'Traffic', group: 'Website' },
						{ href: `${base}/search`, label: 'Search & Maps', group: 'Website' },
						{ href: `${base}/seo`, label: 'SEO', group: 'Website' },
						{ href: `${base}/heatmaps`, label: 'Heatmaps', group: 'Website' }
					]
				: []),
			...(data.app ? [{ href: `${base}/app`, label: 'App', group: 'App' }] : []),
			{ href: `${base}/settings`, label: 'Setup' }
		] as Tab[]
	);
	const isActive = (href: string) => page.url.pathname === href;
	const showDays = $derived(!/\/(settings|seo|heatmaps)$/.test(page.url.pathname));
	const kind = $derived(data.web && data.app ? 'Website + app' : data.app ? 'App' : 'Website');
</script>

<section class="flex flex-wrap items-end justify-between gap-6">
	<div class="min-w-0">
		<a href="/app" class="label hover:text-ink">← All clients</a>
		<h1 class="display mt-2 truncate text-[48px] sm:text-[72px]">{c.name}</h1>
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

<nav class="scrollbar-none mt-6 -mx-3 flex items-center gap-1.5 overflow-x-auto px-3" aria-label="Client sections">
	{#each tabs as t, i (t.href)}
		{#if t.group && tabs[i - 1]?.group !== t.group}
			<span class="ml-2 mr-0.5 shrink-0 text-[11px] font-medium tracking-wide text-muted uppercase">{t.group}</span>
		{/if}
		<a href={t.href + (t.label === 'Setup' ? '' : q)} class="pill {isActive(t.href) ? 'pill-active' : ''} {t.label === 'Setup' ? 'ml-2' : ''}">{t.label}</a>
	{/each}
</nav>

<div class="mt-5">
	{@render children()}
</div>
