<!--
  Unix Studio logo: rounded five-petal flower with two oval eyes + chunky wordmark.
  Brand colors: blue #94ADFF, beige #FDFBF4.
  TODO: replace the inline drawing with the final logo SVG from the Unix Studio project.
-->
<script lang="ts">
	let { size = 28, class: klass = '' }: { size?: number; class?: string } = $props();
	const petals = [0, 72, 144, 216, 288];
</script>

<span class="inline-flex items-center gap-2 {klass}">
	<svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" class="unix-flower overflow-visible">
		<g class="unix-petals">
			{#each petals as a (a)}
				<circle cx={50 + 24 * Math.sin((a * Math.PI) / 180)} cy={50 - 24 * Math.cos((a * Math.PI) / 180)} r="24" fill="#94ADFF" />
			{/each}
		</g>
		<circle cx="50" cy="50" r="26" fill="#94ADFF" />
		<ellipse cx="42" cy="48" rx="5" ry="8" fill="#111111" />
		<ellipse cx="58" cy="48" rx="5" ry="8" fill="#111111" />
	</svg>
	<span class="unix-word" style="font-size:{size * 0.78}px">unix studio</span>
</span>

<style>
	.unix-word {
		font-family: var(--font-display);
		font-weight: 800;
		letter-spacing: -0.03em;
		color: #94adff;
		line-height: 1;
	}
	@media (prefers-reduced-motion: no-preference) {
		.unix-petals {
			transform-origin: 50px 50px;
			animation: unix-spin 14s linear infinite;
		}
	}
	@keyframes unix-spin {
		to { transform: rotate(360deg); }
	}
</style>
