<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { identify, track } from '$lib/analytics';
	import { page } from '$app/state';
	import ChangeRow from '$lib/components/ChangeRow.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import { KIND_LABEL, money, relativeDay } from '$lib/format';
	import type { ChangeKind, FeedItem } from '$lib/types';

	let { data, form } = $props();
	onMount(() => {
		if (data.account) identify(data.account.id);
		if (data.welcome) track('signup_completed', { competitors: data.competitors.length });
		track('dashboard_viewed', { changes: data.total, days: data.days });
	});
	let refreshing = $state(false);
	let adding = $state(false);

	const groups = $derived.by(() => {
		const out: { day: string; items: FeedItem[] }[] = [];
		for (const item of data.feed) {
			const day = relativeDay(item.detected_at);
			const last = out.at(-1);
			if (last?.day === day) last.items.push(item);
			else out.push({ day, items: [item] });
		}
		return out;
	});

	/** Builds a link that toggles one filter and keeps the others. */
	const withParam = (key: string, value: string | null) => {
		const u = new URL(page.url);
		u.searchParams.delete('welcome');
		if (value === null || u.searchParams.get(key) === value) u.searchParams.delete(key);
		else u.searchParams.set(key, value);
		return u.pathname + u.search;
	};

	const PILLS: ChangeKind[] = ['price_down', 'sale_start', 'price_up', 'new_product', 'out_of_stock', 'restock', 'sale_end'];
</script>

<svelte:head><title>Changes · Undercut</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-4">
	<div>
		<p class="eyebrow">{data.own?.name ?? data.own?.domain ?? 'Your store'}</p>
		<h1 class="mt-1 font-display text-4xl">What your competitors changed</h1>
		<p class="mt-1 text-sm text-muted">
			Last {data.days} days{#if data.lastChecked}{" · "}checked {relativeDay(data.lastChecked).toLowerCase()}{/if}
		</p>
	</div>
	<form
		method="POST"
		action="?/refresh"
		use:enhance={() => {
			refreshing = true;
			track('refresh_clicked');
			return async ({ update }) => {
				await update();
				refreshing = false;
			};
		}}
	>
		<button class="btn-ghost" disabled={refreshing}>{refreshing ? 'Checking stores…' : '↻ Refresh now'}</button>
	</form>
</div>

{#if data.welcome}
	<div class="card mt-6 border-accent/30 bg-accent-soft p-5 text-sm">
		<strong>You’re all set!</strong> We saved your competitors’ current state. From tomorrow you’ll see every
		sale, price change and new product here. We’ll send you a weekly summary.
	</div>
{/if}
{#if form && 'refreshed' in form}
	<p class="mt-4 text-sm text-muted">Check finished: {form.refreshed} new change{form.refreshed === 1 ? '' : 's'}.</p>
{/if}

<section class="card mt-6 p-6">
	<p class="eyebrow">What matters most</p>
	{#if data.headlines.length}
		<ul class="mt-3 space-y-2">
			{#each data.headlines as h (h)}<li class="font-display text-2xl leading-snug">{h}</li>{/each}
		</ul>
	{:else}
		<p class="mt-3 font-display text-2xl text-muted">A quiet week: no big moves so far.</p>
	{/if}
	<div class="mt-5 flex flex-wrap gap-2">
		{#each PILLS as k (k)}
			{#if data.counts[k]}
				<a
					href={withParam('kind', k)}
					class="rounded-full border px-3 py-1 text-xs font-medium transition {data.kindFilter === k ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink/30'}"
				>
					{KIND_LABEL[k]} · {data.counts[k]}
				</a>
			{/if}
		{/each}
	</div>
</section>

<div class="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
	<section>
		<div class="flex flex-wrap items-center gap-2 text-sm">
			{#each [7, 30, 90] as d (d)}
				<a href={withParam('days', String(d))} class="rounded-lg px-3 py-1.5 {data.days === d ? 'bg-black/5 font-medium' : 'text-muted hover:text-ink'}">{d} days</a>
			{/each}
			{#if data.storeFilter || data.kindFilter}
				<a href="/dashboard?days={data.days}" class="ml-auto text-xs text-muted underline">Clear filters</a>
			{/if}
		</div>

		{#if groups.length}
			{#each groups as g (g.day)}
				<h3 class="mt-6 mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{g.day}</h3>
				<div class="card divide-y divide-line overflow-hidden">
					{#each g.items as item (item.id)}<ChangeRow {item} />{/each}
				</div>
			{/each}
		{:else}
			<div class="card mt-4 p-10 text-center">
				<p class="font-semibold">No changes yet{data.kindFilter || data.storeFilter ? ' with these filters' : ''}</p>
				<p class="mt-1 text-sm text-muted">We check your competitors every day. Changes will show up here.</p>
			</div>
		{/if}
	</section>

	<aside>
		<h2 class="text-sm font-semibold">Competitors ({data.competitors.length}/{data.max})</h2>
		<div class="mt-3 space-y-3">
			{#each data.competitors as c (c.id)}
				<div class="card p-4 {data.storeFilter === c.id ? 'ring-2 ring-ink' : ''}">
					<a href={withParam('store', c.id)} class="flex items-center gap-3">
						<Logo domain={c.domain} size={32} />
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-semibold">{c.name ?? c.domain}</p>
							<p class="truncate text-xs text-muted">{c.domain}</p>
						</div>
						{#if c.changes}<span class="rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-white">{c.changes}</span>{/if}
					</a>
					{#if c.blocked}
						<p class="mt-3 text-xs text-down">We couldn’t read their catalog during the last check.</p>
					{:else}
						<p class="mt-3 text-xs text-muted">
							{c.productCount} products · median {money(c.medianPrice, c.currency)}{#if c.onSale} · <span class="text-down">{c.onSale} on sale (−{c.avgDiscount}%)</span>{/if}
						</p>
					{/if}
					<form method="POST" action="?/remove" use:enhance class="mt-2">
						<input type="hidden" name="store_id" value={c.id} />
						<button class="text-xs text-muted hover:text-down">Stop tracking</button>
					</form>
				</div>
			{/each}

			{#if data.competitors.length < data.max}
				<form
					method="POST"
					action="?/add"
					class="card space-y-2 border-dashed p-4"
					use:enhance={() => {
						adding = true;
						return async ({ update }) => {
							await update();
							adding = false;
						};
					}}
				>
					<input name="url" class="input py-2 text-sm" placeholder="competitor.com" required disabled={adding} />
					<button class="btn-ghost w-full" disabled={adding}>{adding ? 'Reading catalog…' : '+ Add competitor'}</button>
					{#if form && 'addError' in form}<p class="text-xs text-down">{form.addError}</p>{/if}
				</form>
			{/if}
		</div>
	</aside>
</div>
