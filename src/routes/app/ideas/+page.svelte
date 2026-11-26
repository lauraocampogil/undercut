<script lang="ts">
	import { page } from '$app/state';
	import IdeaCard from '#lib/components/IdeaCard.svelte';
	import IdeaTile from '#lib/components/IdeaTile.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { PRICE } from '#lib/pricing.ts';
	import type { Idea } from '#lib/review-types.ts';
	let { data } = $props();

	const from = $derived(page.url.searchParams.get('from'));
	const mineCount = $derived(data.mine.reduce((s: number, m: { ideas: Idea[] }) => s + m.ideas.length, 0));
	let tab = $state<'mine' | 'all'>('mine');
	$effect.pre(() => {
		tab = from || data.mine.length ? 'mine' : 'all';
	});
	// the analysis you just came from goes first
	const groups = $derived([...data.mine].sort((a, b) => (a.id === from ? -1 : b.id === from ? 1 : 0)));

	let q = $state('');
	let genre = $state('');
	let sort = $state<'strength' | 'share'>('strength');
	const list = $derived(
		data.browse
			.filter((p) => !genre || p.genre === genre)
			.flatMap((p) => p.ideas.map((idea) => ({ p, idea })))
			.filter(({ p, idea }) => !q || `${p.name} ${idea.title} ${idea.problem} ${idea.topicLabel} ${idea.keywords.join(' ')}`.toLowerCase().includes(q.toLowerCase()))
			.sort((a, b) => (sort === 'share' ? b.idea.share - a.idea.share : b.idea.strength - a.idea.strength || b.idea.share - a.idea.share))
	);
	let showToday = $state(false);
	// the full idea opens in a side panel
	let open = $state<{ idea: Idea; product: string; href: string } | null>(null);
	$effect(() => {
		if (!open) return;
		const esc = (e: KeyboardEvent) => e.key === 'Escape' && (open = null);
		addEventListener('keydown', esc);
		return () => removeEventListener('keydown', esc);
	});
</script>

<svelte:head><title>Ideas · Undercut</title></svelte:head>

<div class="flex flex-col gap-8">
	<header class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-medium tracking-tight">Ideas</h1>
			<p class="mt-1 max-w-2xl text-sm text-ink-2">Opportunities found in bad reviews, each with its proof: how many users complain, the real reviews, and what you could build or write about it.</p>
		</div>
		<a href="/app/analyses" class="btn btn-ghost">New report</a>
	</header>

	<!-- idea of the day: one line, opens in place -->
	{#if data.today}
		<section class="card overflow-hidden">
			<button class="flex w-full items-center gap-4 p-5 text-left hover:bg-[#fafaf8]" onclick={() => (showToday = !showToday)} aria-expanded={showToday}>
				<span class="grid size-11 shrink-0 place-items-center rounded-2xl bg-ink text-white"><Icon name="flame" size={18} /></span>
				<span class="min-w-0 flex-1">
					<span class="block text-xs text-muted">Idea of the day · from {data.today.name}</span>
					<span class="block truncate font-medium">{data.today.idea.title}</span>
				</span>
				<span class="big hidden text-2xl sm:block">{data.today.idea.share}%</span>
				<span class="text-muted transition-transform duration-300 {showToday ? 'rotate-180' : ''}"><Icon name="chevron" size={16} /></span>
			</button>
			{#if showToday}<div class="border-t border-line p-4"><IdeaCard idea={data.today.idea} open product={data.today.name} href="/p/{data.today.slug}" /></div>{/if}
		</section>
	{/if}

	<!-- tabs -->
	<div class="flex items-center gap-1 self-start rounded-2xl border border-line bg-white p-1 text-sm" role="tablist">
		<button role="tab" aria-selected={tab === 'mine'} class="rounded-xl px-4 py-2 transition-colors {tab === 'mine' ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink'}" onclick={() => (tab = 'mine')}>From my analyses <span class="opacity-60">{mineCount}</span></button>
		<button role="tab" aria-selected={tab === 'all'} class="rounded-xl px-4 py-2 transition-colors {tab === 'all' ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink'}" onclick={() => (tab = 'all')}>All ideas <span class="opacity-60">{data.total}</span></button>
	</div>

	{#if tab === 'mine'}
		{#if groups.length}
			<div class="flex flex-col gap-10">
				{#each groups as m (m.id)}
					<section class="flex flex-col gap-4">
						<div class="flex flex-wrap items-center gap-3">
							{#if m.icon}<img src={m.icon} alt="" class="size-10 rounded-xl border border-line" />{/if}
							<div class="min-w-0 flex-1">
								<p class="font-medium">{m.name} {#if m.id === from}<span class="ml-1 rounded-full bg-good-bg px-2 py-0.5 text-[11px] text-good">New</span>{/if}</p>
								<p class="text-xs text-muted">{m.ideas.length} ideas from its reviews</p>
							</div>
							<a href="/app/analyses/{m.id}" class="text-sm underline">Open the analysis</a>
						</div>
						<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{#each m.ideas as idea (idea.id)}<IdeaTile {idea} product={m.name} icon={m.icon} fresh={m.id === from} onopen={() => (open = { idea, product: m.name, href: `/app/analyses/${m.id}` })} />{/each}</div>
					</section>
				{/each}
			</div>
		{:else}
			<div class="card flex flex-col items-start gap-3 p-8">
				<p class="text-lg font-medium">No ideas from your analyses yet</p>
				<p class="max-w-lg text-sm text-ink-2">Open an analysis (your product or a competitor’s) and click “Find ideas”. In a few seconds you get the opportunities hidden in its bad reviews.</p>
				<div class="flex gap-2"><a href="/app/analyses" class="btn btn-primary">My analyses</a><button class="btn btn-ghost" onclick={() => (tab = 'all')}>Browse all ideas</button></div>
			</div>
		{/if}
	{:else}
		<section class="flex flex-col gap-4">
			<div class="flex flex-wrap gap-2">
				<label class="relative min-w-[220px] flex-1">
					<span class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"><Icon name="search" size={16} /></span>
					<input class="input pl-10" placeholder="Search a problem, a product, a keyword" bind:value={q} />
				</label>
				<select class="select input w-auto" bind:value={sort} aria-label="Sort">
					<option value="strength">Strongest first</option>
					<option value="share">Most complaints first</option>
				</select>
			</div>
			<div class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Category">
				<button class="shrink-0 rounded-full border px-3.5 py-1.5 text-sm {genre === '' ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-2 hover:text-ink'}" onclick={() => (genre = '')}>All</button>
				{#each data.genres as g}<button class="shrink-0 rounded-full border px-3.5 py-1.5 text-sm {genre === g ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-2 hover:text-ink'}" onclick={() => (genre = genre === g ? '' : g)}>{g}</button>{/each}
			</div>
			<p class="text-sm text-muted" aria-live="polite">{list.length} ideas{genre ? ` in ${genre}` : ''}{q ? ` matching “${q}”` : ''}{#if q || genre} · <button class="underline" onclick={() => ((q = ''), (genre = ''))}>Clear</button>{/if}</p>
			{#if list.length}
				<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{#each list as { p, idea } (p.slug + idea.id)}<IdeaTile {idea} product={p.name} icon={p.icon} genre={p.genre} onopen={() => (open = { idea, product: p.name, href: `/p/${p.slug}` })} />{/each}</div>
			{:else}
				<p class="card p-8 text-center text-sm text-muted">{data.total ? 'No idea matches your search.' : 'New ideas are being found in the database. Come back in a few minutes.'}</p>
			{/if}
			{#if data.locked}
				<div class="card flex flex-wrap items-center justify-between gap-4 p-6">
					<div>
						<p class="font-medium">{data.lockedIdeas} more ideas from {data.locked} products</p>
						<p class="mt-1 text-sm text-ink-2">Unlock the database to browse every idea, with its proof.</p>
					</div>
					<a href="/app/settings/billing" class="btn btn-primary">Unlock · {PRICE.full}</a>
				</div>
			{/if}
		</section>
	{/if}
</div>

{#if open}
	<div class="fixed inset-0 z-50 flex justify-end bg-black/25" role="presentation" onclick={(e) => e.target === e.currentTarget && (open = null)}>
		<div class="panel-in flex h-full w-full max-w-[640px] flex-col overflow-y-auto bg-[#f3f3f1] p-4 sm:p-6" role="dialog" aria-modal="true" aria-label={open.idea.title}>
			<div class="mb-3 flex items-center justify-between gap-3">
				<a href={open.href} class="text-sm underline">Open {open.product} →</a>
				<button class="icon-btn size-9" onclick={() => (open = null)} aria-label="Close"><Icon name="x" /></button>
			</div>
			<IdeaCard idea={open.idea} open product={open.product} />
		</div>
	</div>
{/if}

<style>
	.panel-in {
		animation: panel-in 0.35s cubic-bezier(0.2, 0.75, 0.15, 1) both;
	}
	@keyframes panel-in {
		from {
			transform: translateX(40px);
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.panel-in {
			animation: none;
		}
	}
</style>
