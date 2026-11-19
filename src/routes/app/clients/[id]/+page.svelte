<script lang="ts">
	import { act } from '#lib/act.ts';
	import { enhance } from '$app/forms';
	import Delta from '#lib/components/Delta.svelte';
	import HealthRing from '#lib/components/HealthRing.svelte';
	import FixButton from '#lib/components/FixButton.svelte';
	import WhyButton from '#lib/components/WhyButton.svelte';
	let { data } = $props();
	const c = $derived(data.client);
	const open = $derived(data.tasks.filter((t) => !t.done && t.level !== 'good'));
	const done = $derived(data.tasks.filter((t) => t.done));
	const good = $derived(data.tasks.filter((t) => !t.done && t.level === 'good'));
	let showDone = $state(false);
	let showGood = $state(false);
	const dot = { good: 'bg-good', warn: 'bg-[#E3A21A]', bad: 'bg-bad' };
	const word = { good: 'Good', warn: 'Keep an eye', bad: 'Needs action' };
	let openTask = $state<string | null>(null);
	import { canAutoFix } from '#lib/fixable.ts';
	import { invalidateAll } from '$app/navigation';
	const autoCount = $derived(open.filter((t) => canAutoFix(t.issueId)).length);
	let fixingAll = $state(false);
	async function fixEverything() {
		fixingAll = true;
		await fetch('/api/fix', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clientId: c.id, action: 'all' }) });
		await invalidateAll();
		fixingAll = false;
	}
	const areaOf: Record<string, string> = { Leads: 'Leads', Traffic: 'Traffic', Conversions: 'Traffic', 'Google Search': 'Search', 'Google Maps': 'Maps', SEO: 'SEO', Sitemap: 'SEO', Tracking: 'Tracking', Behaviour: 'Behaviour', App: 'App' };
</script>

<svelte:head><title>{c.name} · Undercut</title></svelte:head>

<!-- 0. The goal -->
{#if data.goals.length}
	<section class="mb-4 grid gap-3 {data.goals.length > 1 ? 'lg:grid-cols-2' : ''}">
		{#each data.goals as g (g.goal.id)}
			<a href="/app/clients/{c.id}/goals" class="group card flex flex-col gap-3 p-5 transition-transform hover:-translate-y-0.5">
				<div class="flex items-center justify-between gap-2 text-sm"><span class="text-muted">🎯 Goal · {g.label} by {g.goal.deadline}</span><span class="rounded-full px-2.5 py-0.5 text-[11px] font-medium {g.status === 'behind' ? 'bg-bad-bg text-bad' : g.status === 'no_data' ? 'bg-tile text-muted' : 'bg-good-bg text-good'}">{g.status === 'reached' ? 'Reached' : g.status === 'on_track' ? 'On track' : g.status === 'behind' ? 'Behind' : 'Not measured'}</span></div>
				<p class="flex items-baseline gap-2"><span class="big text-[36px]">{g.current == null ? '—' : g.money ? `€${Math.round(g.current).toLocaleString('en-US')}` : g.current}</span><span class="text-muted">/ {g.money ? `€${g.goal.target.toLocaleString('en-US')}` : g.goal.target}</span></p>
				<div class="h-2 overflow-hidden rounded-full bg-tile"><div class="h-full rounded-full bg-accent" style="width:{Math.max(2, g.pct)}%"></div></div>
				{#if g.actions[0]}<p class="text-sm text-ink-2"><b class="text-ink">Next:</b> {g.actions[0].title} <span class="text-muted transition-transform group-hover:translate-x-0.5">→</span></p>{/if}
			</a>
		{/each}
	</section>
{:else}
	<a href="/app/clients/{c.id}/goals" class="mb-4 flex items-center gap-3 rounded-[22px] border-2 border-dashed border-line px-5 py-3.5 text-sm text-ink-2 hover:border-ink"><span class="text-lg">🎯</span><span class="flex-1">Set a goal for {c.name} — e.g. 100 visits a day or €10k MRR — and Undercut helps you get there.</span><span class="font-medium text-ink">Set a goal →</span></a>
{/if}

<!-- 1. Where do we stand? -->
<section class="grid gap-4 lg:grid-cols-[1fr_2fr]">
	<div class="card-dark flex flex-col justify-between gap-6 p-6 sm:p-7">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm text-white/50">Health</p>
				<p class="mt-1 text-sm">{open.length ? `${open.length} thing${open.length > 1 ? 's' : ''} to do` : 'All clear'}</p>
			</div>
			<HealthRing score={data.health.score} size={64} dark />
		</div>
		<p class="text-[19px] leading-[1.45] sm:text-[21px]">{data.summary.text}</p>
		{#if data.summary.ai}<span class="self-start rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-ink">AI summary</span>{/if}
	</div>

	<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
		{#each data.areas as a (a.key)}
			{@const metric = a.key === 'traffic' ? 'visits' : a.key === 'search' ? 'clicks' : a.key === 'leads' ? 'leads' : null}
			<div class="group relative flex flex-col justify-between gap-5 p-5 transition-transform hover:-translate-y-0.5 {a.key === 'leads' ? 'card-dark' : 'card'}">
				<a href={a.href + (data.days !== 28 ? `?days=${data.days}` : '')} class="absolute inset-0 rounded-[28px]" aria-label="Open {a.label}"></a>
				<div class="flex items-center justify-between gap-2">
					<p class="text-sm font-medium">{a.label}</p>
					<span class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] {a.key === 'leads' ? 'bg-white/10' : 'bg-tile'}"><span class="size-1.5 rounded-full {a.waiting ? 'bg-[#bdbdb6]' : dot[a.level]}"></span>{a.waiting ? 'Not set up' : word[a.level]}</span>
				</div>
				<div>
					<p class="flex items-start gap-1.5"><span class="big text-[40px] {a.key === 'leads' ? 'text-accent' : ''}">{a.value}</span>{#if a.delta !== undefined}<Delta value={a.delta} invert={a.deltaInvert} suffix={a.deltaInvert ? '' : '%'} dark={a.key === 'leads'} />{/if}</p>
					<p class="mt-1 truncate text-xs {a.key === 'leads' ? 'text-white/50' : 'text-muted'}">{a.sub}</p>
				</div>
				<div class="relative flex items-center justify-between gap-2 text-xs {a.key === 'leads' ? 'text-white/50' : 'text-muted'}">
					<span>{a.open ? `${a.open} to fix` : 'Nothing to fix'}</span>
					{#if metric && a.delta !== undefined && a.delta !== 0}<WhyButton clientId={c.id} {metric} days={data.days} dark={a.key === 'leads'} />{:else}<span class="transition-transform group-hover:translate-x-0.5">→</span>{/if}
				</div>
			</div>
		{/each}
	</div>
</section>

<!-- 2. What do we do? -->
<section class="mt-10">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h2 class="display text-[40px] sm:text-[48px]">This week’s <em>to-do</em></h2>
			<p class="text-sm text-muted">Most important first. Click a line to see what to do · ⚡ Fix = Undercut does it for you · ✓ = done</p>
		</div>
		{#if autoCount}
			<button class="btn btn-accent" onclick={fixEverything} disabled={fixingAll}>⚡ {fixingAll ? 'Fixing…' : `Fix ${autoCount} automatically`}</button>
		{/if}
	</div>

	<ul class="card mt-5 divide-y divide-line">
		{#each open as t (t.id)}
			<li class="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-6">
				<span class="size-2.5 shrink-0 rounded-full {dot[t.level]}" title={t.level === 'bad' ? 'Urgent' : 'This week'}></span>
				<div class="min-w-0 flex-1">
					<p class="truncate font-medium">{t.title}</p>
					<p class="truncate text-xs text-muted">{areaOf[t.area]} · {t.meaning}</p>
				</div>
				<FixButton clientId={c.id} issueId={t.issueId} problem={t.title} detail={t.meaning} size="sm" />
				<form method="POST" action={act('toggle')} use:enhance={() => async ({ update }) => update({ reset: false, invalidateAll: true })}>
					<input type="hidden" name="id" value={t.id} />
					<button class="grid size-8 shrink-0 place-items-center rounded-full border-2 border-[#cfcfc9] text-xs text-transparent hover:border-ink hover:text-ink" aria-label="Mark “{t.title}” as done" title="Mark as done">✓</button>
				</form>
			</li>
		{:else}
			<li class="p-8 text-center">
				<p class="display text-3xl">All clear ✓</p>
				<p class="mt-1 text-sm text-muted">Nothing urgent for {c.name} this week.</p>
			</li>
		{/each}
	</ul>

	<div class="mt-4 flex flex-wrap gap-2">
		{#if done.length}<button class="pill" onclick={() => (showDone = !showDone)}>{showDone ? 'Hide' : 'Show'} done ({done.length})</button>{/if}
		{#if good.length}<button class="pill" onclick={() => (showGood = !showGood)}>{showGood ? 'Hide' : 'Show'} going well ({good.length})</button>{/if}
	</div>

	{#if showDone && done.length}
		<ul class="mt-3 space-y-2">
			{#each done as t (t.id)}
				<li class="flex items-center gap-3 rounded-full bg-white/60 px-4 py-2.5 text-sm text-muted">
					<form method="POST" action={act('toggle')} use:enhance={() => async ({ update }) => update({ reset: false, invalidateAll: true })}>
						<input type="hidden" name="id" value={t.id} />
						<button class="grid size-6 place-items-center rounded-full bg-ink text-xs text-accent" aria-label="Mark “{t.title}” as not done">✓</button>
					</form>
					<span class="line-through">{t.title}</span>
				</li>
			{/each}
		</ul>
	{/if}
	{#if showGood && good.length}
		<ul class="mt-3 grid gap-2 sm:grid-cols-2">
			{#each good as t (t.id)}
				<li class="rounded-[20px] bg-good-bg/70 p-4 text-sm">
					<p class="font-medium">{t.title}</p>
					<p class="mt-1 text-ink-2">{t.meaning}</p>
				</li>
			{/each}
		</ul>
	{/if}
</section>
