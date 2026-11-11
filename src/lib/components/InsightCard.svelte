<script lang="ts">
	import type { Insight } from '#lib/types.ts';
	let { insight, featured = false }: { insight: Insight; featured?: boolean } = $props();
	const tone = {
		good: { dot: 'bg-good', label: 'Going well' },
		warn: { dot: 'bg-[#E3A21A]', label: 'Worth a look' },
		bad: { dot: 'bg-bad', label: 'Fix this' }
	};
	const t = $derived(tone[insight.level]);
</script>

<article class="flex flex-col gap-3 p-5 {featured ? 'card-dark' : 'card'}">
	<div class="flex items-center justify-between gap-2">
		<span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium {featured ? 'bg-white/10' : 'bg-tile'}">
			<span class="size-1.5 rounded-full {t.dot}"></span>{t.label}
		</span>
		<span class="text-xs {featured ? 'text-white/50' : 'text-muted'}">{insight.area}</span>
	</div>
	<h3 class="display mt-1 text-[26px] leading-[1.05]">{insight.title}</h3>
	<p class="text-sm leading-relaxed {featured ? 'text-white/70' : 'text-ink-2'}">{insight.meaning}</p>
	<div class="mt-auto flex items-start gap-3 rounded-[18px] p-3.5 text-sm {featured ? 'bg-accent text-accent-ink' : 'bg-tile'}">
		<span class="grid size-6 shrink-0 place-items-center rounded-full {featured ? 'bg-ink text-accent' : 'bg-ink text-white'} text-xs">→</span>
		<p>{insight.action}</p>
	</div>
</article>
