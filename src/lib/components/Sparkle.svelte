<script lang="ts">
	let {
		size = 24,
		color = '#FF6A3D',
		twinkle = false,
		delay = 0,
		class: klass = ''
	}: { size?: number; color?: string; twinkle?: boolean; delay?: number; class?: string } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" class="sparkle {twinkle ? 'is-twinkling' : ''} {klass}" style="animation-delay:{delay}s" aria-hidden="true">
	<path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z" fill={color} />
</svg>

<style>
	@media (prefers-reduced-motion: no-preference) {
		.is-twinkling {
			animation: twinkle 2.4s ease-in-out infinite;
			transform-origin: center;
		}
	}
	@keyframes twinkle {
		0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
		50% { transform: scale(0.55) rotate(90deg); opacity: 0.7; }
	}
</style>
