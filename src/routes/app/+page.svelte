<script lang="ts">
	import { enhance } from '$app/forms';
	import HealthRing from '#lib/components/HealthRing.svelte';
	let { data } = $props();

	type Row = (typeof data.rows)[number];
	const AREA: Record<string, string> = { Traffic: 'Traffic', Conversions: 'Traffic', 'Google Search': 'Search', 'Google Maps': 'Maps', SEO: 'SEO', Sitemap: 'SEO', Tracking: 'Tracking', Behaviour: 'Behaviour', App: 'App' };
	const dot = { good: 'bg-good', warn: 'bg-[#E3A21A]', bad: 'bg-bad' };

	let filter = $state('All');
	const all = $derived(data.rows.flatMap((r: Row) => r.tasks.map((t) => ({ ...t, client: r.client }))));
	const areas = $derived(['All', ...new Set(all.map((t) => AREA[t.area]))]);
	const visible = $derived(all.filter((t) => filter === 'All' || AREA[t.area] === filter));
	const groups = $derived(
		data.rows
			.map((r: Row) => {
				const list = r.tasks.filter((t) => filter === 'All' || AREA[t.area] === filter);
				return { client: r.client, tasks: list.slice(0, 2), more: Math.max(0, list.length - 2) };
			})
			.filter((g) => g.tasks.length)
	);
	const attention = $derived(data.rows.filter((r: Row) => r.health.level !== 'good').length);
	const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
</script>

<svelte:head><title>Overview · Undercut</title></svelte:head>

<section class="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
	<div>
		<p class="label">{today}</p>
		<h1 class="display mt-2 text-[56px] sm:text-[84px]">This <em>week</em></h1>
	</div>
	<div class="flex flex-wrap gap-x-10 gap-y-4">
		<div><p class="big text-5xl sm:text-6xl text-bad">{all.filter((t) => t.level === 'bad').length}</p><p class="mt-1 text-sm text-muted">urgent</p></div>
		<div><p class="big text-5xl sm:text-6xl">{all.length}</p><p class="mt-1 text-sm text-muted">tasks in total</p></div>
		<div><p class="big text-5xl sm:text-6xl">{attention}<span class="text-2xl text-muted">/{data.rows.length}</span></p><p class="mt-1 text-sm text-muted">clients need you</p></div>
	</div>
</section>

<div class="mt-8 grid gap-4 xl:grid-cols-[1.7fr_1fr]">
	<!-- Priority inbox -->
	<section class="card p-4 sm:p-6">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h2 class="text-lg font-medium">Priorities across clients</h2>
			<div class="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1">
				{#each areas as a (a)}<button class="pill py-1.5 text-[13px] {filter === a ? 'pill-active' : ''}" onclick={() => (filter = a)}>{a}</button>{/each}
			</div>
		</div>

		<p class="mt-1 text-sm text-muted">The 2 most urgent things per client. Tick when done.</p>
		{#each groups as g (g.client.id)}
			<div class="mt-5">
				<div class="flex items-center justify-between gap-3">
					<a href="/app/clients/{g.client.id}" class="flex items-center gap-2 font-medium hover:underline">
						<span class="grid size-6 place-items-center rounded-full text-[11px] text-white" style="background:{g.client.color}">{g.client.name.slice(0, 1)}</span>{g.client.name}
					</a>
					{#if g.more}<a href="/app/clients/{g.client.id}" class="text-xs text-muted hover:text-ink">+{g.more} more →</a>{/if}
				</div>
				<ul class="mt-2 divide-y divide-line rounded-[20px] bg-tile/60 px-4">
					{#each g.tasks as t (t.id)}
						<li class="flex items-start gap-3 py-3">
							<form method="POST" action="?/toggle" use:enhance={() => async ({ update }) => update({ reset: false, invalidateAll: true })}>
								<input type="hidden" name="client" value={g.client.id} />
								<input type="hidden" name="id" value={t.id} />
								<button class="mt-0.5 grid size-6 place-items-center rounded-full border-2 border-[#cfcfc9] bg-white hover:border-ink" aria-label="Mark “{t.title}” as done"></button>
							</form>
							<div class="min-w-0 flex-1">
								<p class="leading-snug font-medium">
									<span class="mr-1 inline-block size-2 rounded-full align-middle {dot[t.level]}"></span>{t.title}
									<span class="ml-1 rounded-full border border-line bg-white px-2 py-0.5 align-middle text-[11px] font-normal text-muted">{AREA[t.area]}</span>
								</p>
								<p class="mt-0.5 text-sm text-muted">→ {t.action}</p>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
		{#if !visible.length}
			<div class="py-12 text-center"><p class="display text-3xl">All clear ✓</p><p class="text-sm text-muted">Nothing to do here this week.</p></div>
		{/if}
	</section>

	<!-- Clients -->
	<section class="flex flex-col gap-3">
		<div class="flex items-center justify-between px-1">
			<h2 class="text-lg font-medium">Clients</h2>
			<a href="/app/clients/new" class="btn btn-primary py-2">+ Add client</a>
		</div>
		{#each data.rows as r, i (r.client.id)}
			{@const dark = i === 0 && r.health.level === 'bad'}
			<a href="/app/clients/{r.client.id}" class="group flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5 {dark ? 'card-dark' : 'card'}">
				<HealthRing score={r.health.score} size={52} {dark} />
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<p class="truncate font-medium">{r.client.name}</p>
						<span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] {dark ? 'bg-white/10' : 'bg-tile'}">{r.client.type === 'both' ? 'Web + app' : r.client.type === 'app' ? 'App' : 'Web'}</span>
					</div>
					<div class="mt-2 flex flex-wrap gap-x-3 gap-y-1">
						{#each r.areas as a (a.key)}
							<span class="inline-flex items-center gap-1 text-[11px] {dark ? 'text-white/60' : 'text-muted'}" title="{a.label}: {a.value} {a.sub}"><span class="size-1.5 rounded-full {dot[a.level]}"></span>{a.label.replace('Google ', '')}</span>
						{/each}
					</div>
				</div>
				<div class="hidden text-right sm:block">
					<p class="big text-2xl">{r.tasks.length}</p>
					<p class="text-[11px] {dark ? 'text-white/50' : 'text-muted'}">to do</p>
				</div>
			</a>
		{/each}
	</section>
</div>
