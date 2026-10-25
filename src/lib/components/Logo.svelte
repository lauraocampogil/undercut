<script lang="ts">
	import { onMount } from 'svelte';
	let { domain, size = 36 }: { domain: string; size?: number } = $props();
	let failed = $state(false);
	let img: HTMLImageElement | undefined = $state();
	// The image may fail before hydration attaches onerror: check once mounted.
	onMount(() => {
		if (img && img.complete && img.naturalWidth === 0) failed = true;
	});
</script>

{#if failed}
	<div
		class="grid shrink-0 place-items-center rounded-lg bg-ink font-semibold text-cream uppercase"
		style="width:{size}px;height:{size}px;font-size:{size * 0.42}px"
		aria-hidden="true"
	>
		{domain.slice(0, 1)}
	</div>
{:else}
	<img
		bind:this={img}
		src="https://www.google.com/s2/favicons?domain={domain}&sz=64"
		alt=""
		width={size}
		height={size}
		class="shrink-0 rounded-lg border border-line bg-white object-contain p-1"
		onerror={() => (failed = true)}
	/>
{/if}
