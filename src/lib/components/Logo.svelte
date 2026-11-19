<script lang="ts">
	// Mark: a "u" sliced on the diagonal, the lower half slid forward — the cut that moves things up.
	let { size = 30, light = false, wordmark = true }: { size?: number; light?: boolean; wordmark?: boolean } = $props();
	const uid = $props.id();
	const U = 'M7.5 6.5h5.5v10.5a3 3 0 0 0 6 0V6.5h5.5v10.5a8.5 8.5 0 0 1-17 0z';
</script>

<span class="group/logo inline-flex items-center gap-2">
	<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" class="shrink-0">
		<defs>
			<clipPath id="t{uid}"><path d="M0 0H32V9L0 19Z" /></clipPath>
			<clipPath id="b{uid}"><path d="M0 20.8L32 10.8V32H0Z" /></clipPath>
		</defs>
		<rect width="32" height="32" rx="9" fill={light ? '#FFFFFF' : '#0D0D0D'} />
		<path d={U} fill={light ? '#0D0D0D' : '#FFFFFF'} clip-path="url(#t{uid})" />
		<g class="transition-transform duration-300 group-hover/logo:translate-x-[1px]" transform="translate(1.6 0)">
			<path d={U} fill={light ? '#0D0D0D' : '#FFFFFF'} clip-path="url(#b{uid})" />
		</g>
	</svg>
	{#if wordmark}<span class="text-[22px] leading-none font-semibold tracking-[-0.05em] {light ? 'text-white' : ''}">undercut</span>{/if}
</span>
