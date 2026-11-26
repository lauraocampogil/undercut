<script lang="ts">
	// The report's main chart: each complaint topic, with one labelled bar per product (count of reviews).
	type R = { names: string[]; colors: string[]; topics: { id: string; label: string; counts: number[]; max: number }[]; praise: { label: string; counts: number[] }[] };
	let { r, onread }: { r: R; onread?: (id: string) => void } = $props();
</script>

{#if r.topics.length}
	<section id="proof" class="card flex scroll-mt-6 flex-col gap-5 p-6 sm:p-7">
		<div class="flex flex-wrap items-baseline justify-between gap-3">
			<h2 class="text-[22px] font-medium tracking-tight">What users complain about, side by side</h2>
			<div class="flex flex-wrap gap-3.5 text-[13px] text-ink-2">
				{#each r.names as n, i}<span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-[3px]" style="background:{r.colors[i]}"></span>{n}</span>{/each}
			</div>
		</div>
		{#each r.topics as t (t.id)}
			<div class="grid gap-3 border-t border-line pt-4 md:grid-cols-[220px_1fr] md:gap-5">
				<div>
					<p class="font-medium">{t.label}</p>
					{#if onread}<button class="mt-0.5 text-[13px] text-muted underline" onclick={() => onread(t.id)}>Read the {t.counts[0]} reviews</button>{/if}
				</div>
				<div class="flex flex-col gap-1.5">
					{#each t.counts as c, i}
						<div class="grid grid-cols-[120px_1fr_88px] items-center gap-2.5 text-[13px]">
							<span class="truncate text-ink-2">{r.names[i]}</span>
							<span class="h-3 overflow-hidden rounded-full bg-[#f1f1ee]"><span class="grow-bar block h-full rounded-full" style="width:{(c / t.max) * 100}%;background:{r.colors[i]}"></span></span>
							<span class="text-right {i === 0 ? 'font-semibold' : ''}">{c} reviews</span>
						</div>
					{/each}
				</div>
			</div>
		{/each}
		{#if r.praise.length}
			<details class="border-t border-line pt-4 text-sm">
				<summary class="cursor-pointer font-medium">What users love</summary>
				<ul class="mt-3 flex flex-col gap-2">
					{#each r.praise as t}<li class="flex flex-wrap gap-x-4 gap-y-1"><span class="w-52 font-medium">{t.label}</span>{#each t.counts as c, i}<span class="text-ink-2"><span class="mr-1 inline-block size-2 rounded-full" style="background:{r.colors[i]}"></span>{c}</span>{/each}</li>{/each}
				</ul>
			</details>
		{/if}
	</section>
{/if}

