<script lang="ts">
	import PriceChart from '$lib/components/PriceChart.svelte';
	import { KIND_LABEL, money, relativeDay, signedPct, thumb } from '$lib/format';

	let { data } = $props();
	const p = $derived(data.product);
	const cur = $derived(data.store.currency);
</script>

<svelte:head><title>{p.title} · Undercut</title></svelte:head>

<a href="/dashboard" class="text-sm text-muted hover:text-ink">← Changes</a>

<div class="mt-6 grid gap-8 md:grid-cols-[280px_1fr]">
	<div>
		{#if p.image}<img src={thumb(p.image, 600)} alt="" class="card aspect-square w-full object-cover" />{/if}
	</div>
	<div>
		<p class="eyebrow">{data.store.name ?? data.store.domain}</p>
		<h1 class="mt-1 font-display text-4xl leading-tight">{p.title}</h1>
		<p class="mt-4 text-2xl font-semibold">
			{money(p.price, cur)}
			{#if p.compare_at}<span class="ml-2 text-base font-normal text-muted line-through">{money(p.compare_at, cur)}</span>{/if}
		</p>
		<p class="mt-1 text-sm {p.available ? 'text-up' : 'text-down'}">{p.available ? 'In stock' : 'Sold out'}</p>
		<a href={p.url} target="_blank" rel="noopener" class="btn-ghost mt-5">View in their store ↗</a>

		<section class="card mt-8 p-5">
			<h2 class="text-sm font-semibold">Price history</h2>
			{#if data.snapshots.length > 1}
				<div class="mt-4"><PriceChart points={data.snapshots} currency={cur} /></div>
			{:else}
				<p class="mt-2 text-sm text-muted">We’ve tracked this product since {relativeDay(p.first_seen_at).toLowerCase()}. The chart appears after the next check.</p>
			{/if}
		</section>

		{#if data.changes.length}
			<section class="mt-6">
				<h2 class="text-sm font-semibold">Changes</h2>
				<ul class="card mt-3 divide-y divide-line text-sm">
					{#each data.changes as c (c.id)}
						<li class="flex items-center justify-between px-5 py-3">
							<span>{KIND_LABEL[c.kind]} <span class="text-muted">· {relativeDay(c.detected_at)}</span></span>
							<span class="font-medium">
								{#if c.old_value !== null && c.new_value !== null}{money(c.old_value, cur)} → {money(c.new_value, cur)}{/if}
								{#if c.pct !== null}<span class="ml-2 {c.pct < 0 ? 'text-down' : 'text-up'}">{signedPct(c.pct)}</span>{/if}
							</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>
</div>
