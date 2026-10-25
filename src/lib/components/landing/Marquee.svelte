<script lang="ts">
	import Sparkle from '../Sparkle.svelte';
	let { items, class: klass = '', speed = 28 }: { items: string[]; class?: string; speed?: number } = $props();
</script>

<div class="marquee overflow-hidden {klass}" aria-hidden="true">
	<div class="marquee-track flex w-max" style="animation-duration:{speed}s">
		{#each [0, 1] as copy (copy)}
			<div class="flex shrink-0 items-center">
				{#each items as item (item)}
					<span class="display px-6 text-[clamp(28px,3.4vw,48px)] whitespace-nowrap">{item}</span>
					<Sparkle size={26} color="currentColor" />
				{/each}
			</div>
		{/each}
	</div>
</div>

<style>
	.marquee-track {
		animation: marquee linear infinite;
	}
	@media (prefers-reduced-motion: reduce) {
		.marquee-track {
			animation: none;
		}
	}
	@keyframes marquee {
		to { transform: translateX(-50%); }
	}
</style>
