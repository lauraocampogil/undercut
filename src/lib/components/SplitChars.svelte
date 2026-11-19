<script lang="ts">
	// Headline whose letters rise out of a blur, one by one, when scrolled into view.
	import { inview } from '#lib/motion.ts';
	let { text, as = 'span', class: cls = '', delay = 0, step = 22 }: { text: string; as?: string; class?: string; delay?: number; step?: number } = $props();
	const words = $derived(text.split(' '));
</script>

<svelte:element this={as} class="chars {cls}" use:inview={{ delay }} aria-label={text}>
	{#each words as w, wi (wi)}<span class="inline-block whitespace-nowrap" style={wi < words.length - 1 ? 'margin-right:0.26em' : ''} aria-hidden="true">{#each [...w] as ch, ci (ci)}<span class="ch" style="--i:{words.slice(0, wi).join('').length + ci};--st:{step}ms">{ch}</span>{/each}</span>{/each}
</svelte:element>
