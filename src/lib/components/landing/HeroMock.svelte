<script lang="ts">
	// Hero illustration: what an analysis looks like (example data, not a real product).
	import { SITE, type Lang } from '#lib/site-i18n.ts';
	let { lang = 'en' as Lang }: { lang?: Lang } = $props();
	const t = $derived(SITE[lang].mock);
	const vals = [
		[12, 41, 18, 9],
		[6, 8, 37, 4],
		[21, 5, 7, 11],
		[3, 19, 11, 26]
	];
	const cols = ['Y', 'A', 'B', 'C'];
</script>

<div class="relative mx-auto w-full max-w-[560px] pt-8 pb-28" aria-hidden="true">
	<!-- main card -->
	<div class="relative rounded-3xl border border-line bg-white p-6 text-left">
		<div class="flex items-center gap-3">
			<span class="grid size-10 place-items-center rounded-xl bg-ink text-sm font-semibold text-white">Y</span>
			<div class="flex-1"><p class="text-sm font-medium">{t.you}</p><p class="text-xs text-muted">{t.vs}</p></div>
			<span class="inline-flex rounded-[9px] border border-line p-0.5 text-xs"><span class="rounded-[7px] bg-black/[0.06] px-2 py-1 font-medium">{t.byTheme}</span><span class="px-2 py-1 text-muted">{t.all}</span></span>
		</div>
		<div class="mt-6 grid grid-cols-[1.4fr_repeat(4,1fr)] items-center gap-x-3 gap-y-4 text-sm">
			<span class="text-xs text-muted">{t.complaint}</span>
			{#each cols as c, i}<span class="text-xs {i === 0 ? 'font-semibold' : 'text-muted'}">{c}</span>{/each}
			{#each vals as row, r}
				<span class="truncate text-ink-2">{t.rows[r]}</span>
				{#each row as v, i}
					<span class="flex items-center gap-1.5"><span class="fillbar h-1.5 rounded-full {i === 0 ? 'bg-ink' : 'bg-bad/55'}" style="--w:{(v / 41) * 44}px; --d:{400 + r * 120 + i * 50}ms"></span><span class="num text-[11px] text-muted">{v}</span></span>
				{/each}
			{/each}
		</div>
	</div>

	<!-- review card -->
	<div class="float absolute bottom-0 left-6 w-64 rounded-2xl border border-line bg-white p-4 text-left text-sm sm:-left-10" style="--d:0.5s">
		<div class="flex items-center justify-between text-xs"><span class="text-bad">★★☆☆☆</span><span class="rounded-full bg-tile px-2 py-0.5 text-muted">App Store</span></div>
		<p class="mt-2 text-ink-2">{t.quote}</p>
		<p class="mt-2 text-xs text-muted">{t.topic}</p>
	</div>

	<!-- fix card -->
	<div class="float absolute -top-2 -right-3 w-48 rounded-2xl border border-line bg-white p-4 text-left text-sm sm:-right-8" style="--d:1.6s">
		<p class="text-xs text-muted">{t.fix}</p>
		<p class="mt-1 flex items-baseline gap-2"><span class="big text-3xl">58%</span><span class="text-xs text-good">{t.month}</span></p>
		<div class="mt-3 flex h-8 items-end gap-1">
			{#each [3, 4, 4, 5, 6, 6, 8, 9] as h, i}<span class="growh flex-1 rounded-sm {i > 5 ? 'bg-good/70' : 'bg-black/10'}" style="--h:{h * 3.5}px; --d:{600 + i * 60}ms"></span>{/each}
		</div>
	</div>
</div>
