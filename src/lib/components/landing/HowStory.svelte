<script lang="ts">
	// Landing section: how Undercut works, as a scroll story.
	import ScrollStory from '#lib/components/ScrollStory.svelte';
	import { SITE, type Lang } from '#lib/site-i18n.ts';
	let { lang = 'en' as Lang }: { lang?: Lang } = $props();
	const t = $derived(SITE[lang].how);
	// an example of what an analysis shows (illustration, not real data)
	const demo = [
		[12, 41, 18, 9],
		[6, 8, 37, 4],
		[21, 5, 7, 11]
	];
	const names = $derived([t.you, `${t.comp} A`, `${t.comp} B`, `${t.comp} C`]);
	const readCounts = [['App Store', 100], ['Google Play', 150], ['Hacker News', 31], ['GitHub', 64]] as const;
</script>

	{#snippet preview(i: number)}
		<div class="rounded-3xl border border-line bg-[#fafaf8] p-7 sm:p-9">
			{#if i === 0}
				<p class="mb-4 text-sm text-muted">{t.pasteAny}</p>
				<div class="flex items-center gap-2 rounded-2xl border border-line p-2">
					<span class="typing flex-1 overflow-hidden px-3 py-2 whitespace-nowrap">notion.so</span>
					<span class="btn btn-primary">{t.analyze}</span>
				</div>
				<div class="mt-6 flex flex-wrap items-center gap-2 text-sm text-ink-2">
					<span class="text-muted">{t.found}</span>
					{#each ['Notion', 'Obsidian', 'Evernote', 'Coda'] as n, k}<span class="pop rounded-full border border-line px-3 py-1" style="--d:{900 + k * 150}ms">{n}</span>{/each}
				</div>
			{:else if i === 1}
				<p class="mb-5 text-sm text-muted">{t.reading}</p>
				<div class="flex flex-col gap-4">
					{#each readCounts as [src, n], k}
						<div class="grid grid-cols-[110px_1fr_44px] items-center gap-3 text-sm">
							<span>{src}</span>
							<span class="h-2 overflow-hidden rounded-full bg-tile"><span class="fillbar block h-full rounded-full bg-ink" style="--w:{(n / 150) * 100}%; --d:{k * 150}ms"></span></span>
							<span class="num text-right text-ink-2">{n}</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="mb-5 text-sm text-muted">{t.perTopic}</p>
				<div class="grid grid-cols-[1.3fr_repeat(4,1fr)] gap-x-4 gap-y-5 text-sm">
					<span></span>
					{#each names as n, k}<span class="truncate text-xs {k === 0 ? 'font-semibold' : 'text-muted'}">{n}</span>{/each}
					{#each demo as row, r}
						<span class="font-medium">{t.topics[r]}</span>
						{#each row as v, k}
							<span class="flex items-center gap-1.5"><span class="fillbar h-2 rounded-full {k === 0 ? 'bg-ink' : 'bg-bad/60'}" style="--w:{(v / 41) * 56}px; --d:{r * 120 + k * 50}ms"></span><span class="num text-xs text-ink-2">{v}</span></span>
						{/each}
					{/each}
				</div>
			{/if}
		</div>
	{/snippet}

<ScrollStory steps={t.steps} visual={preview} />
