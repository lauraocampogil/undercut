<script lang="ts">
	import { KIND_LABEL, KIND_TONE, money, signedPct, thumb } from '$lib/format';
	import type { FeedItem } from '$lib/types';
	import Logo from './Logo.svelte';

	let { item }: { item: FeedItem } = $props();

	const tone = $derived(KIND_TONE[item.kind]);
	const badge = $derived(
		{
			down: 'bg-down-soft text-down',
			up: 'bg-up-soft text-up',
			new: 'bg-accent-soft text-accent',
			neutral: 'bg-black/5 text-muted'
		}[tone]
	);
</script>

<div class="flex items-center gap-4 px-5 py-4">
	{#if item.product?.image}
		<img src={thumb(item.product.image, 120)} alt="" class="size-14 shrink-0 rounded-xl border border-line object-cover" loading="lazy" />
	{:else}
		<Logo domain={item.store.domain} size={56} />
	{/if}

	<div class="min-w-0 flex-1">
		<div class="flex flex-wrap items-center gap-2">
			<span class="rounded-full px-2 py-0.5 text-xs font-medium {badge}">{KIND_LABEL[item.kind]}</span>
			<span class="truncate text-xs text-muted">{item.store.name ?? item.store.domain}</span>
		</div>
		{#if item.product}
			<a href="/dashboard/product/{encodeURIComponent(item.product.id)}" class="mt-1 block truncate font-medium hover:underline">
				{item.product.title}
			</a>
		{/if}
	</div>

	<div class="shrink-0 text-right">
		{#if item.old_value !== null && item.new_value !== null}
			<div class="text-xs text-muted line-through">{money(item.old_value, item.store.currency)}</div>
			<div class="font-semibold">{money(item.new_value, item.store.currency)}</div>
		{:else if item.new_value !== null}
			<div class="font-semibold">{money(item.new_value, item.store.currency)}</div>
		{/if}
		{#if item.pct !== null}
			<div class="text-xs font-medium {item.pct < 0 ? 'text-down' : 'text-up'}">{signedPct(item.pct)}</div>
		{/if}
	</div>
</div>
