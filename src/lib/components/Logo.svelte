<script lang="ts">
	let { size = 30, light = false }: { size?: number; light?: boolean } = $props();
</script>

<span class="inline-flex items-center gap-2">
	<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
		<circle cx="16" cy="16" r="16" fill={light ? '#C6F432' : '#0D0D0D'} />
		<path d="M10 9.5v7a6 6 0 0 0 12 0v-7" stroke={light ? '#0D0D0D' : '#C6F432'} stroke-width="3" fill="none" stroke-linecap="round" />
		<path d="M7 22.5 25 13.5" stroke={light ? '#C6F432' : '#0D0D0D'} stroke-width="2.2" />
	</svg>
	<span class="display text-[26px] leading-none">undercut</span>
</span>
