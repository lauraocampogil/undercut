<script lang="ts">
	// Renders text with URLs as clickable links (used for Google error messages).
	let { text }: { text: string } = $props();
	const parts = $derived(text.split(/(https?:\/\/[^\s]+)/g));
</script>

{#each parts as p, i (i)}{#if /^https?:\/\//.test(p)}<a href={p} target="_blank" rel="noreferrer" class="font-medium underline">open Google Cloud ↗</a>{:else}{p}{/if}{/each}
