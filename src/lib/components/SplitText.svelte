<script lang="ts">
	// Headline whose words rise one by one when scrolled into view. Wrap words in *stars* for the serif italic.
	import { inview } from '#lib/motion.ts';
	let { text, as = 'h2', class: cls = '', delay = 0, emClass = '' }: { text: string; as?: string; class?: string; delay?: number; emClass?: string } = $props();
	const lines = $derived.by(() => {
		let em = false;
		let k = 0;
		return text.split('\n').map((line) =>
			line.split(/\s+/).filter(Boolean).map((w) => {
				if (w.startsWith('*')) em = true;
				const word = { t: w.replace(/\*/g, ''), em, k: k++ };
				if (w.length > 1 && w.endsWith('*')) em = false;
				return word;
			})
		);
	});
</script>

<svelte:element this={as} class="split {cls}" use:inview={{ delay }} aria-label={text.replace(/\*/g, '').replace(/\n/g, ' ')}>
	{#each lines as words, li (li)}
		{#if li > 0}<br />{/if}
		{#each words as w, wi (wi)}<span class="w" aria-hidden="true"><span style="--i:{w.k}">{#if w.em}<em class={emClass}>{w.t}</em>{:else}{w.t}{/if}</span></span>{' '}{/each}
	{/each}
</svelte:element>
