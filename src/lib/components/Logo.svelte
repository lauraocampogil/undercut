<script lang="ts">
	// Mark: cut, cut, point — two strokes (the reviews you cut through) and a dot (the answer at the end).
	let { size = 30, light = false, wordmark = true }: { size?: number; light?: boolean; wordmark?: boolean } = $props();
	const bg = $derived(light ? '#FFFFFF' : '#0B0B0B');
	const fg = $derived(light ? '#0B0B0B' : '#FFFFFF');
</script>

<span class="group/logo inline-flex items-center gap-2">
	<svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" class="shrink-0">
		<rect width="64" height="64" rx="15" fill={bg} />
		<g transform="translate(9 14) scale(0.41)" stroke={fg} stroke-width="19" stroke-linecap="round">
			<line x1="16" y1="88" x2="58" y2="12" />
			<line x1="58" y1="88" x2="74" y2="60" />
		</g>
		<circle cx="48.4" cy="48.4" r="4" fill={fg} class="transition-transform duration-300 group-hover/logo:translate-x-[1.5px]" />
	</svg>
	{#if wordmark}<span class="text-[22px] leading-none font-extrabold tracking-[-0.05em] {light ? 'text-white' : ''}">undercut</span>{/if}
</span>
