<script lang="ts">
	// Mark: a circle cut in two, the lower half slid sideways — the "under cut".
	let { size = 30, light = false, wordmark = true }: { size?: number; light?: boolean; wordmark?: boolean } = $props();
</script>

<span class="inline-flex items-center gap-2">
	<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" class="shrink-0">
		<path d="M1.5 14.5a13 13 0 0 1 26 0Z" fill={light ? '#fff' : '#0D0D0D'} />
		<path d="M4.5 17.5h26a13 13 0 0 1-26 0Z" fill="#C6F432" />
	</svg>
	{#if wordmark}<span class="text-[22px] leading-none font-semibold tracking-[-0.05em] {light ? 'text-white' : ''}">undercut</span>{/if}
</span>
