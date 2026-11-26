<script lang="ts">
	// One section of a public page: number + name + title on the left (sticky), content on the right.
	// Sections alternate between the page colour and white so each one reads as its own block.
	import type { Snippet } from 'svelte';
	import { reveal } from '#lib/motion.ts';
	let { id, num, label, title, intro = '', white = false, children }: { id: string; num: string; label: string; title: string; intro?: string; white?: boolean; children: Snippet } = $props();
</script>

<section {id} class="scroll-mt-4 border-t border-line {white ? 'bg-white' : ''}">
	<div class="mx-auto grid max-w-[1080px] gap-12 px-5 py-28 sm:px-8 md:grid-cols-[300px_1fr] md:gap-16">
		<div class="flex flex-col gap-4 self-start md:sticky md:top-10" use:reveal>
			<p class="flex items-center gap-3 text-sm text-muted"><span class="num">{num}</span><span class="h-px w-8 bg-black/20"></span>{label}</p>
			<h2 class="display text-4xl">{title}</h2>
			{#if intro}<p class="leading-relaxed text-ink-2">{intro}</p>{/if}
		</div>
		<div use:reveal={{ delay: 120 }}>{@render children()}</div>
	</div>
</section>
