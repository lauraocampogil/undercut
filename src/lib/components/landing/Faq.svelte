<script lang="ts">
	// Accordion: one answer open at a time, smooth open/close.
	import { slide } from 'svelte/transition';
	let { items }: { items: [string, string][] } = $props();
	let open = $state<number | null>(0);
</script>

<div class="flex flex-col divide-y divide-line border-y border-line">
	{#each items as [q, a], i}
		<div>
			<button class="flex w-full items-center justify-between gap-6 py-6 text-left text-lg font-medium" aria-expanded={open === i} onclick={() => (open = open === i ? null : i)}>
				{q}
				<span class="relative grid size-8 shrink-0 place-items-center rounded-full border transition-colors duration-300 {open === i ? 'border-ink bg-ink text-white' : 'border-line text-muted'}">
					<span class="absolute h-px w-3 bg-current"></span>
					<span class="absolute h-3 w-px bg-current transition-transform duration-300 {open === i ? 'scale-y-0' : ''}"></span>
				</span>
			</button>
			{#if open === i}
				<div transition:slide={{ duration: 350 }}><p class="max-w-2xl pr-14 pb-7 leading-relaxed text-ink-2">{a}</p></div>
			{/if}
		</div>
	{/each}
</div>
