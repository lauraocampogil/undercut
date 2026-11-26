<script lang="ts">
	// Compact idea card for grids (Ideas page, Home). Click opens the full idea.
	import type { Idea } from '#lib/review-types.ts';
	let { idea, product = '', icon = '', genre = '', fresh = false, onopen }: { idea: Idea; product?: string; icon?: string; genre?: string; fresh?: boolean; onopen: () => void } = $props();
</script>

<button class="card group flex h-full flex-col gap-3 p-5 text-left transition-colors hover:border-black/25" onclick={onopen}>
	<span class="flex items-center gap-2 text-xs text-muted">
		{#if icon}<img src={icon} alt="" class="size-5 rounded-md border border-line" loading="lazy" />{/if}
		<span class="truncate">{product || idea.product}</span>
		{#if genre}<span class="truncate">· {genre}</span>{/if}
		{#if fresh}<span class="ml-auto rounded-full bg-good-bg px-2 py-0.5 text-[10px] text-good">New</span>{/if}
	</span>
	<span class="text-[17px] leading-snug font-medium tracking-tight group-hover:underline">{idea.title}</span>
	<span class="line-clamp-2 text-sm text-ink-2">{idea.problem}</span>
	<span class="mt-auto flex items-center gap-3 border-t border-line pt-3 text-xs text-muted">
		<span><b class="text-ink">{idea.share}%</b> of complaints</span>
		<span>· {idea.quotes.length} proofs</span>
		<span class="ml-auto flex gap-0.5" title="Strength {idea.strength}/5" aria-label="Strength {idea.strength} of 5">{#each [1, 2, 3, 4, 5] as k}<span class="h-3 w-1 rounded-full {k <= idea.strength ? 'bg-ink' : 'bg-line'}"></span>{/each}</span>
	</span>
</button>
