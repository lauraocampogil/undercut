<script lang="ts">
	// Scroll story: steps on the left, a sticky preview on the right that changes with the step in view,
	// and a line that fills as you scroll. On phones each step shows its own preview under the text.
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	let { steps, visual }: { steps: { title: string; text: string }[]; visual: Snippet<[number]> } = $props();

	let active = $state(0);
	let progress = $state(0);
	let root = $state<HTMLElement>();
	let items: HTMLElement[] = $state([]);

	$effect(() => {
		if (!root) return;
		const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const onScroll = () => {
			const r = root!.getBoundingClientRect();
			const mid = innerHeight * 0.5;
			progress = Math.min(1, Math.max(0, (mid - r.top) / r.height));
			let idx = 0;
			items.forEach((el, i) => {
				if (el && el.getBoundingClientRect().top < mid) idx = i;
			});
			active = idx;
		};
		onScroll();
		addEventListener('scroll', onScroll, { passive: true });
		addEventListener('resize', onScroll);
		if (reduced) progress = 1;
		return () => {
			removeEventListener('scroll', onScroll);
			removeEventListener('resize', onScroll);
		};
	});
</script>

<div bind:this={root} class="relative grid gap-12 md:grid-cols-[1fr_1.1fr] md:gap-16">
	<!-- progress line -->
	<div class="absolute top-0 bottom-0 left-0 hidden w-px bg-black/10 md:block" aria-hidden="true">
		<div class="w-px bg-ink transition-[height] duration-150" style="height:{progress * 100}%"></div>
	</div>

	<ol class="flex flex-col md:pl-10">
		{#each steps as s, i}
			<li bind:this={items[i]} class="flex min-h-[55vh] flex-col justify-center gap-3 py-10 first:pt-0 md:min-h-[70vh]">
				<span class="num text-sm transition-colors duration-300 {active === i ? 'text-ink' : 'text-muted'}">0{i + 1}</span>
				<p class="display text-3xl transition-opacity duration-500 sm:text-4xl {active === i ? 'opacity-100' : 'md:opacity-30'}">{s.title}</p>
				<p class="max-w-md text-lg leading-relaxed text-ink-2 transition-opacity duration-500 {active === i ? 'opacity-100' : 'md:opacity-30'}">{s.text}</p>
				<div class="mt-6 md:hidden">{@render visual(i)}</div>
			</li>
		{/each}
	</ol>

	<div class="hidden md:block">
		<div class="sticky top-[18vh] flex h-[64vh] items-center">
			<div class="relative w-full">
				{#key active}
					<div in:fly={{ y: 24, duration: 600, delay: 120 }} out:fade={{ duration: 150 }} class="absolute inset-x-0 top-1/2 -translate-y-1/2">
						{@render visual(active)}
					</div>
				{/key}
			</div>
		</div>
	</div>
</div>
