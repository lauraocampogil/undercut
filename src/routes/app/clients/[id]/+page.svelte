<script lang="ts">
	import { enhance } from '$app/forms';
	import Delta from '#lib/components/Delta.svelte';
	import HealthRing from '#lib/components/HealthRing.svelte';
	import FixButton from '#lib/components/FixButton.svelte';
	let { data } = $props();
	const c = $derived(data.client);
	const open = $derived(data.tasks.filter((t) => !t.done && t.level !== 'good'));
	const done = $derived(data.tasks.filter((t) => t.done));
	const good = $derived(data.tasks.filter((t) => !t.done && t.level === 'good'));
	let showDone = $state(false);
	let showGood = $state(false);
	const dot = { good: 'bg-good', warn: 'bg-[#E3A21A]', bad: 'bg-bad' };
	const word = { good: 'On track', warn: 'Watch', bad: 'Act now' };
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
	const areaOf: Record<string, string> = { Traffic: 'Traffic', Conversions: 'Traffic', 'Google Search': 'Search', 'Google Maps': 'Maps', SEO: 'SEO', Sitemap: 'SEO', Tracking: 'Tracking', Behaviour: 'Behaviour', App: 'App' };
</script>

<svelte:head><title>{c.name} · Undercut</title></svelte:head>

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
		<p class="display text-[26px] leading-[1.2] sm:text-[30px]">{data.summary.text}</p>
		{#if data.summary.ai}<span class="self-start rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-ink">AI summary</span>{/if}
	</div>

	<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
		{#each data.areas as a (a.key)}
			<a href={a.href + (data.days !== 28 ? `?days=${data.days}` : '')} class="card group flex flex-col justify-between gap-5 p-5 transition-transform hover:-translate-y-0.5">
				<div class="flex items-center justify-between gap-2">
					<p class="text-sm font-medium">{a.label}</p>
					<span class="inline-flex items-center gap-1.5 rounded-full bg-tile px-2 py-0.5 text-[11px]"><span class="size-1.5 rounded-full {dot[a.level]}"></span>{word[a.level]}</span>
				</div>
				<div>
					<p class="flex items-start gap-1.5"><span class="big text-[40px]">{a.value}</span>{#if a.delta !== undefined}<Delta value={a.delta} invert={a.deltaInvert} suffix={a.deltaInvert ? '' : '%'} />{/if}</p>
					<p class="mt-1 truncate text-xs text-muted">{a.sub}</p>
				</div>
				<p class="flex items-center justify-between text-xs text-muted">
					<span>{a.open ? `${a.open} to do` : 'Nothing to do'}</span>
					<span class="transition-transform group-hover:translate-x-0.5">→</span>
				</p>
			</a>
		{/each}
	</div>
</section>

<!-- 2. What do we do? -->
<section class="mt-10">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h2 class="display text-[40px] sm:text-[48px]">To <em>fix</em></h2>
			<p class="text-sm text-muted">⚡ Fix = Undercut does it for you · How to fix = steps for the developer · ✓ = done</p>
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
				<form method="POST" action="?/toggle" use:enhance={() => async ({ update }) => update({ reset: false, invalidateAll: true })}>
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
					<form method="POST" action="?/toggle" use:enhance={() => async ({ update }) => update({ reset: false, invalidateAll: true })}>
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
