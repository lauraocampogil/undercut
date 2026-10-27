<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { track } from '$lib/analytics';
	import Brand from '$lib/components/Brand.svelte';
	import DemoBanner from '$lib/components/DemoBanner.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import { money, signedPct, thumb } from '$lib/format';

	let { data, form } = $props();
	onMount(() => track('analysis_completed', { competitors: data.candidates.length, discovery: data.hasSearch }));
	let adding = $state(false);

	const cur = $derived(data.own.currency);
	const pos = $derived(data.position);
	const verdict = $derived(
		Math.abs(pos.diffPct) < 5 ? 'average' : pos.diffPct > 0 ? 'more expensive' : 'cheaper'
	);
</script>

<svelte:head><title>Your competitors · {data.own.name ?? data.own.domain}</title></svelte:head>

<DemoBanner demoMode={data.demoMode} hasSearch={data.hasSearch} />

<header class="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
	<Brand />
	<a href="/" class="text-sm text-muted hover:text-ink">Analyze another store</a>
</header>

<main class="mx-auto max-w-6xl px-4 pb-40 sm:px-6">
	<section class="pt-8">
		<div class="flex items-center gap-3">
			<Logo domain={data.own.domain} size={40} />
			<div>
				<p class="eyebrow">Analysis of</p>
				<p class="font-semibold">{data.own.name ?? data.own.domain} · {data.own.productCount} products</p>
			</div>
		</div>

		{#if data.candidates.length}
			<h1 class="mt-8 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">
				{#if !pos.comparable}
					We found <span class="text-accent">{data.candidates.length} {data.candidates.length === 1 ? 'competitor' : 'competitors'}</span> to watch for you.
				{:else if verdict === 'average'}
					Your prices are <span class="text-accent">right on average</span> with your competitors
					({signedPct(pos.diffPct)}).
				{:else}
					You are <span class={pos.diffPct > 0 ? 'text-down' : 'text-up'}>{Math.abs(pos.diffPct).toLocaleString('en')} %</span>
					{verdict} than your competitors.
				{/if}
			</h1>
			<p class="mt-3 text-muted">
				{#if pos.comparable}
					Your median price is {money(pos.ownMedian, cur)}; your competitors’ is {money(pos.marketMedian, cur)}.
				{:else}
					{pos.note ?? 'Here is what they sell and how they price it.'}
				{/if}
			</p>
		{:else}
			<h1 class="mt-8 font-display text-4xl sm:text-5xl">Add your competitors</h1>
			<p class="mt-3 text-muted">
				{data.hasSearch
					? 'We didn’t find Shopify stores similar enough. Add their URLs below.'
					: 'Automatic discovery isn’t set up. Paste the URLs of up to 5 stores.'}
			</p>
		{/if}
	</section>

	<section class="mt-10">
		<div class="flex items-baseline justify-between">
			<h2 class="text-lg font-semibold">Competitors ({data.candidates.length}/{data.max})</h2>
			<p class="text-sm text-muted">Not a competitor? Remove it.</p>
		</div>

		<div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.candidates as c (c.store_id)}
				<article class="card flex flex-col p-5">
					<div class="flex items-start gap-3">
						<Logo domain={c.store.domain} />
						<div class="min-w-0 flex-1">
							<h3 class="truncate font-semibold">{c.store.name ?? c.store.domain}</h3>
							<a href="https://{c.store.domain}" target="_blank" rel="noopener" class="truncate text-xs text-muted hover:underline">{c.store.domain}</a>
						</div>
						<span class="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">{Math.round(c.score * 100)}%</span>
					</div>

					<ul class="mt-4 space-y-1 text-xs text-muted">
						{#each c.reasons as r (r)}<li>· {r}</li>{/each}
					</ul>

					<dl class="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
						<div><dt class="text-xs text-muted">Products</dt><dd class="font-semibold">{c.productCount}</dd></div>
						<div><dt class="text-xs text-muted">Median price</dt><dd class="font-semibold">{money(c.medianPrice, c.store.currency)}</dd></div>
						<div>
							<dt class="text-xs text-muted">On sale</dt>
							<dd class="font-semibold {c.onSale ? 'text-down' : ''}">{c.onSale}{c.onSale ? ` · −${c.avgDiscount}%` : ''}</dd>
						</div>
						<div><dt class="text-xs text-muted">New (30 days)</dt><dd class="font-semibold">{c.newLast30}</dd></div>
					</dl>

					<form method="POST" action="?/remove" use:enhance={() => { track('competitor_removed', { from: 'analysis' }); }} class="mt-4">
						<input type="hidden" name="store_id" value={c.store_id} />
						<button class="text-xs font-medium text-muted hover:text-down">Remove</button>
					</form>
				</article>
			{/each}

			{#if data.candidates.length < data.max}
				<form
					method="POST"
					action="?/add"
					class="card flex flex-col justify-center gap-3 border-dashed p-5"
					use:enhance={() => {
						adding = true;
						track('competitor_added', { from: 'analysis' });
						return async ({ update }) => {
							await update();
							adding = false;
						};
					}}
				>
					<label for="add-url" class="font-semibold">Add a competitor</label>
					<input id="add-url" name="url" class="input" placeholder="competitor.com" value={form?.url ?? ''} required disabled={adding} />
					<button class="btn-ghost" disabled={adding}>{adding ? 'Reading catalog…' : 'Add'}</button>
					{#if form?.addError}<p class="text-xs text-down">{form.addError}</p>{/if}
				</form>
			{/if}
		</div>
	</section>

	{#if data.categories.length}
		<section class="mt-14">
			<h2 class="text-lg font-semibold">Your price by category</h2>
			<div class="card mt-4 overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="text-left text-xs text-muted">
						<tr class="border-b border-line">
							<th class="px-5 py-3 font-medium">Category</th>
							<th class="px-5 py-3 font-medium">You (median)</th>
							<th class="px-5 py-3 font-medium">Competitors</th>
							<th class="px-5 py-3 font-medium">Difference</th>
						</tr>
					</thead>
					<tbody>
						{#each data.categories as cat (cat.name)}
							<tr class="border-b border-line last:border-0">
								<td class="px-5 py-3 font-medium">{cat.name} <span class="text-xs text-muted">· {cat.ownCount} vs {cat.marketCount}</span></td>
								<td class="px-5 py-3">{money(cat.ownMedian, cur)}</td>
								<td class="px-5 py-3">{money(cat.marketMedian, cur)}</td>
								<td class="px-5 py-3 font-semibold {cat.diffPct > 5 ? 'text-down' : cat.diffPct < -5 ? 'text-up' : 'text-muted'}">{signedPct(cat.diffPct)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	{#if data.deals.length}
		<section class="mt-14">
			<h2 class="text-lg font-semibold">Your competitors’ biggest discounts right now</h2>
			<div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
				{#each data.deals as d (d.url)}
					<a href={d.url} target="_blank" rel="noopener" class="card group overflow-hidden">
						{#if d.image}<img src={thumb(d.image, 300)} alt="" class="aspect-square w-full object-cover" loading="lazy" />{/if}
						<div class="p-3">
							<p class="truncate text-xs text-muted">{d.store}</p>
							<p class="line-clamp-2 text-sm font-medium group-hover:underline">{d.title}</p>
							<p class="mt-1 text-sm">
								<span class="font-semibold">{money(d.price, d.currency)}</span>
								<span class="text-xs text-muted line-through">{money(d.compare_at, d.currency)}</span>
								<span class="text-xs font-semibold text-down">−{d.discount} %</span>
							</p>
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}
</main>

{#if data.candidates.length}
	<div class="fixed inset-x-0 bottom-0 border-t border-line bg-paper/90 backdrop-blur">
		<div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:px-6">
			<p class="text-sm">
				<strong>Want to know when they change?</strong>
				<span class="text-muted">We check your {data.candidates.length} competitors every day.</span>
			</p>
			{#if data.account}
				<form method="POST" action="/onboard/{data.analysisId}"><button class="btn">Track these competitors →</button></form>
			{:else}
				<a href="/login?analysis={data.analysisId}" class="btn" onclick={() => track('signup_started')}>Create a free account →</a>
			{/if}
		</div>
	</div>
{/if}
