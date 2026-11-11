<script lang="ts">
	import Delta from '#lib/components/Delta.svelte';
	import Sparkline from '#lib/components/Sparkline.svelte';
	import HealthRing from '#lib/components/HealthRing.svelte';
	import ArrowLink from '#lib/components/ArrowLink.svelte';
	import { n, pct } from '#lib/format.ts';
	let { data } = $props();

	let filter = $state<'all' | 'attention' | 'healthy' | 'live'>('all');
	const totals = $derived({
		visits: data.rows.reduce((s, r) => s + r.visits.total, 0),
		prev: data.rows.reduce((s, r) => s + r.visits.prev, 0),
		conv: data.rows.reduce((s, r) => s + r.conversions.total, 0),
		convPrev: data.rows.reduce((s, r) => s + r.conversions.prev, 0),
		todo: data.rows.reduce((s, r) => s + r.todoCount, 0),
		attention: data.rows.filter((r) => r.health.level !== 'good').length
	});
	const rows = $derived(
		data.rows.filter((r) =>
			filter === 'attention' ? r.health.level !== 'good' : filter === 'healthy' ? r.health.level === 'good' : filter === 'live' ? r.live : true
		)
	);
	const filters = $derived([
		{ id: 'all', label: 'All', count: data.rows.length },
		{ id: 'attention', label: 'Needs attention', count: totals.attention },
		{ id: 'healthy', label: 'Healthy', count: data.rows.length - totals.attention },
		{ id: 'live', label: 'Live Google data', count: data.rows.filter((r) => r.live).length }
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
			<p class="flex items-start gap-1.5"><span class="big text-5xl sm:text-6xl">{n(totals.conv)}</span><Delta value={pct(totals.conv, totals.convPrev)} /></p>
			<p class="mt-1 text-sm text-muted">contacts & sales</p>
		</div>
		<div>
			<p class="big text-5xl sm:text-6xl">{totals.todo}</p>
			<p class="mt-1 text-sm text-muted">actions to do</p>
		</div>
	</div>
</section>

<div class="scrollbar-none mt-8 -mx-3 flex gap-2 overflow-x-auto px-3">
	{#each filters as f (f.id)}
		<button class="pill {filter === f.id ? 'pill-active' : ''}" onclick={() => (filter = f.id)}>
			{f.label}<span class="num text-xs opacity-60">{f.count}</span>
		</button>
	{/each}
	<a href="/app/clients/new" class="pill ml-auto border-ink bg-ink text-white">+ Add client</a>
</div>

<section class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
	{#each rows as r, i (r.client.id)}
		{@const dark = i === 0 && r.health.level !== 'good' && filter !== 'healthy'}
		<article class="flex flex-col p-5 sm:p-6 {dark ? 'card-dark' : 'card'}">
			<div class="flex items-start justify-between gap-3">
				<div class="flex min-w-0 items-center gap-3">
					<span class="grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold text-white" style="background:{r.client.color}">{r.client.name.slice(0, 1)}</span>
					<div class="min-w-0">
						<h2 class="truncate font-medium">{r.client.name}</h2>
						<p class="truncate text-xs {dark ? 'text-white/50' : 'text-muted'}">{r.client.domain.replace(/^https?:\/\//, '')}</p>
					</div>
				</div>
				<ArrowLink href="/app/clients/{r.client.id}" label="Open {r.client.name}" {dark} />
			</div>

			<div class="mt-8 flex items-end justify-between gap-4">
				<div>
					<p class="flex items-start gap-1.5"><span class="big text-5xl">{n(r.visits.total)}</span><Delta value={pct(r.visits.total, r.visits.prev)} {dark} /></p>
					<p class="mt-1 text-xs {dark ? 'text-white/50' : 'text-muted'}">visits · {n(r.clicks)} from Google</p>
				</div>
				<HealthRing score={r.health.score} size={58} {dark} />
			</div>

			<div class="mt-5 {dark ? 'opacity-90' : ''}">
				<Sparkline data={r.visits.daily} color={dark ? '#C6F432' : '#0D0D0D'} width={320} height={42} />
			</div>

			<div class="mt-5 flex flex-wrap gap-1.5 border-t pt-4 {dark ? 'border-white/10' : 'border-line'}">
				{#if r.todoCount}
					{#each r.todo as t (t)}
						<span class="max-w-full truncate rounded-full px-2.5 py-1 text-xs {dark ? 'bg-white/10 text-white/80' : 'bg-tile text-ink-2'}">{t}</span>
					{/each}
					{#if r.todoCount > r.todo.length}<span class="rounded-full px-2.5 py-1 text-xs {dark ? 'text-white/50' : 'text-muted'}">+{r.todoCount - r.todo.length}</span>{/if}
				{:else}
					<span class="rounded-full bg-good-bg px-2.5 py-1 text-xs text-good">All good this week</span>
				{/if}
			</div>
		</article>
	{/each}
	<a href="/app/clients/new" class="grid min-h-[260px] place-items-center rounded-[28px] border-2 border-dashed border-[#d0d0ca] p-6 text-center transition-colors hover:border-ink">
		<span>
			<span class="mx-auto grid size-12 place-items-center rounded-full bg-ink text-2xl text-white">+</span>
			<span class="display mt-4 block text-3xl">Add a client</span>
			<span class="mt-1 block text-sm text-muted">Name + website. Sitemap checked instantly.</span>
		</span>
	</a>
</section>
