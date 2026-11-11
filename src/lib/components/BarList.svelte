<script lang="ts">
	import { n } from '#lib/format.ts';
	let { items, highlight = 0 }: { items: { label: string; value: number; extra?: string }[]; highlight?: number } = $props();
	const max = $derived(Math.max(1, ...items.map((i) => i.value)));
</script>

<ul class="space-y-2">
	{#each items as it, i (it.label)}
		<li class="relative flex items-center justify-between gap-3 overflow-hidden rounded-full px-4 py-2.5 text-sm">
			<span class="absolute inset-y-0 left-0 rounded-full {i === highlight ? 'bg-accent' : 'bg-tile'}" style="width: max(12%, {(it.value / max) * 100}%)"></span>
			<span class="relative truncate">{it.label}</span>
			<span class="relative flex shrink-0 items-center gap-2">
				{#if it.extra}<span class="text-xs text-muted">{it.extra}</span>{/if}
				<span class="num font-medium">{n(it.value)}</span>
			</span>
		</li>
	{/each}
</ul>
