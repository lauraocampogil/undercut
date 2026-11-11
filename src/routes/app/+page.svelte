<script lang="ts">
	import Delta from '#lib/components/Delta.svelte';
	import Sparkline from '#lib/components/Sparkline.svelte';
	import HealthRing from '#lib/components/HealthRing.svelte';
	import ArrowLink from '#lib/components/ArrowLink.svelte';
	import { n, pct } from '#lib/format.ts';
	let { data } = $props();

	type Row = (typeof data.rows)[number];
	let filter = $state<'all' | 'attention' | 'healthy' | 'apps'>('all');
	const dot = { good: 'bg-good', warn: 'bg-[#E3A21A]', bad: 'bg-bad' };
	const totals = $derived({
		visits: data.rows.reduce((s: number, r: Row) => s + (r.main?.label === 'visits' ? r.main.value : 0), 0),
		prev: data.rows.reduce((s: number, r: Row) => s + (r.main?.label === 'visits' ? r.main.prev : 0), 0),
		urgent: data.rows.reduce((s: number, r: Row) => s + r.tasks.filter((t) => t.level === 'bad').length, 0),
		attention: data.rows.filter((r: Row) => r.health.level !== 'good').length
	});
	const rows = $derived(
		data.rows.filter((r: Row) =>
			filter === 'attention' ? r.health.level !== 'good' : filter === 'healthy' ? r.health.level === 'good' : filter === 'apps' ? r.client.type !== 'web' : true
		)
	);
	const filters = $derived([
		{ id: 'all', label: 'All', count: data.rows.length },
		{ id: 'attention', label: 'Needs attention', count: totals.attention },
		{ id: 'healthy', label: 'Healthy', count: data.rows.length - totals.attention },
		{ id: 'apps', label: 'Apps', count: data.rows.filter((r: Row) => r.client.type !== 'web').length }
	] as const);
</script>

<svelte:head><title>Overview · Undercut</title></svelte:head>

<section class="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
	<div>
		<p class="label">Last 28 days · {data.rows.length} clients</p>
		<h1 class="display mt-2 text-[56px] sm:text-[84px]">Your <em>clients</em></h1>
	</div>
	<div class="flex flex-wrap gap-x-10 gap-y-4">
		<div>
			<p class="flex items-start gap-1.5"><span class="big text-5xl sm:text-6xl">{n(totals.visits)}</span><Delta value={pct(totals.visits, totals.prev)} /></p>
			<p class="mt-1 text-sm text-muted">visits, all sites</p>
		</div>
		<div>
			<p class="big text-5xl sm:text-6xl {totals.urgent ? 'text-bad' : ''}">{totals.urgent}</p>
			<p class="mt-1 text-sm text-muted">urgent fixes</p>
		</div>
		<div>
			<p class="big text-5xl sm:text-6xl">{totals.attention}<span class="text-2xl text-muted">/{data.rows.length}</span></p>
			<p class="mt-1 text-sm text-muted">need attention</p>
		</div>
	</div>
</section>

<div class="scrollbar-none mt-8 -mx-3 flex gap-2 overflow-x-auto px-3">
	{#each filters as f (f.id)}
		<button class="pill {filter === f.id ? 'pill-active' : ''}" onclick={() => (filter = f.id)}>
			{f.label}<span class="text-xs opacity-60">{f.count}</span>
		</button>
	{/each}
	<a href="/app/clients/new" class="pill ml-auto border-ink bg-ink text-white">+ Add client</a>
</div>

<section class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
	{#each rows as r, i (r.client.id)}
		{@const dark = i === 0 && r.health.level === 'bad' && filter !== 'healthy'}
		{@const top = r.tasks[0]}
		<article class="flex flex-col p-5 sm:p-6 {dark ? 'card-dark' : 'card'}">
			<div class="flex items-start justify-between gap-3">
				<div class="flex min-w-0 items-center gap-3">
					<span class="grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold text-white" style="background:{r.client.color}">{r.client.name.slice(0, 1)}</span>
					<div class="min-w-0">
						<h2 class="truncate font-medium">{r.client.name}</h2>
						<p class="truncate text-xs {dark ? 'text-white/50' : 'text-muted'}">{r.client.type === 'app' ? 'App' : r.client.domain.replace(/^https?:\/\//, '')}{r.client.type === 'both' ? ' + app' : ''}</p>
					</div>
				</div>
				<ArrowLink href="/app/clients/{r.client.id}" label="Open {r.client.name}" {dark} />
			</div>

			<div class="mt-8 flex items-end justify-between gap-4">
				{#if r.main}
					<div>
						<p class="flex items-start gap-1.5"><span class="big text-5xl">{n(r.main.value)}</span><Delta value={pct(r.main.value, r.main.prev)} {dark} /></p>
						<p class="mt-1 text-xs {dark ? 'text-white/50' : 'text-muted'}">{r.main.label}</p>
					</div>
				{/if}
				<HealthRing score={r.health.score} size={58} {dark} />
			</div>

			{#if r.main}
				<div class="mt-5"><Sparkline data={r.main.daily} color={dark ? '#C6F432' : '#0D0D0D'} width={320} height={42} /></div>
			{/if}

			<!-- one dot per area: the whole status at a glance -->
			<div class="mt-5 flex flex-wrap gap-1.5 border-t pt-4 {dark ? 'border-white/10' : 'border-line'}">
				{#each r.areas as a (a.key)}
					<a href={a.href} class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs {dark ? 'bg-white/10 text-white/80 hover:bg-white/20' : 'bg-tile text-ink-2 hover:bg-[#e6e6e1]'}" title="{a.label}: {a.value} {a.sub}">
						<span class="size-1.5 rounded-full {dot[a.level]}"></span>{a.label.replace('Google ', '').replace(' health', '')}
					</a>
				{/each}
			</div>
			{#if top}
				<a href="/app/clients/{r.client.id}" class="mt-3 truncate text-xs {dark ? 'text-accent' : 'text-ink-2'} hover:underline">→ {top.title}{r.tasks.length > 1 ? ` · +${r.tasks.length - 1}` : ''}</a>
			{/if}
		</article>
	{/each}
	<a href="/app/clients/new" class="grid min-h-[260px] place-items-center rounded-[28px] border-2 border-dashed border-[#d0d0ca] p-6 text-center transition-colors hover:border-ink">
		<span>
			<span class="mx-auto grid size-12 place-items-center rounded-full bg-ink text-2xl text-white">+</span>
			<span class="display mt-4 block text-3xl">Add a client</span>
			<span class="mt-1 block text-sm text-muted">Website, app or both.</span>
		</span>
	</a>
</section>
