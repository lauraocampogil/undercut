<script lang="ts">
	let { size = 24, color = '#FF6A3D', class: klass = '' }: { size?: number; color?: string; class?: string } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" class={klass} aria-hidden="true">
	<path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z" fill={color} />
</svg>
