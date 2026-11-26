<script lang="ts">
	// TrustMRR-style ranked list: the top 100. Locked rows come blurred (no real data) with one unlock bar.
	import type { DbRow } from '#lib/review-types.ts';
	import { SITE, fill, type Lang } from '#lib/site-i18n.ts';
	let { rows, unlockHref = '/signup', total = 0, lang = 'en' as Lang }: { rows: DbRow[]; unlockHref?: string; total?: number; lang?: Lang } = $props();
	const L = $derived(SITE[lang].list);
	// how many products are hidden in the whole database (not only in this list)
	const lockedCount = $derived(Math.max(rows.filter((r) => r.locked).length, total - rows.filter((r) => !r.locked).length));
	const MEDAL = ['#C9A227', '#A7A9AC', '#B0764A'];
</script>

<ol class="overflow-hidden rounded-2xl border border-line bg-white">
	<li class="hidden grid-cols-[48px_minmax(0,2fr)_minmax(0,2fr)_110px_100px] gap-4 border-b border-line px-4 py-3 text-xs text-muted md:grid">
		<span>#</span><span>{L.product}</span><span>{L.complaint}</span><span>{L.bad}</span><span>{L.fix}</span>
	</li>
	{#each rows as r, i (r.slug)}
		{#if r.locked && (i === 0 || !rows[i - 1].locked)}
			<li class="border-b border-line bg-[#fafaf8]">
				<a href={unlockHref} class="flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm">
					<span><span class="font-medium">{fill(L.more, { n: lockedCount })}</span> <span class="text-ink-2">{L.moreText}</span></span>
					<span class="btn btn-primary">{L.unlock}</span>
				</a>
			</li>
		{/if}
		{#if r.locked}
			<li class="grid grid-cols-[48px_minmax(0,1fr)_90px] items-center gap-4 border-b border-line px-4 py-3 text-sm select-none last:border-0 md:grid-cols-[48px_minmax(0,2fr)_minmax(0,2fr)_110px_100px]" aria-hidden="true">
				<span class="num text-muted">{i + 1}</span>
				<span class="flex items-center gap-3 blur-[5px]"><span class="size-10 rounded-xl bg-black/10"></span><span><span class="block font-medium">{L.hidden}</span><span class="block text-xs text-muted">{r.app.genre}</span></span></span>
				<span class="hidden blur-[5px] md:block">{L.hiddenComplaint}</span>
				<span class="num blur-[5px]">{r.stats.complaintRate ?? 0}%</span>
				<span class="hidden text-xs blur-[5px] md:block">{L.notClaimed}</span>
			</li>
		{:else}
			<li class="border-b border-line last:border-0">
				<a href="/p/{r.slug}" class="grid grid-cols-[48px_minmax(0,1fr)_90px] items-center gap-4 px-4 py-3 text-sm md:grid-cols-[48px_minmax(0,2fr)_minmax(0,2fr)_110px_100px]">
					{#if i < 3}
						<span class="grid size-7 place-items-center rounded-full text-xs font-semibold text-white" style="background:{MEDAL[i]}">{i + 1}</span>
					{:else}
						<span class="num text-muted">{i + 1}</span>
					{/if}
					<span class="flex min-w-0 items-center gap-3">
						{#if r.app.icon}<img src={r.app.icon} alt="" class="size-10 shrink-0 rounded-xl border border-line" loading="lazy" />{:else}<span class="size-10 shrink-0 rounded-xl bg-tile"></span>{/if}
						<span class="min-w-0"><span class="block truncate font-medium">{r.app.name}</span><span class="block truncate text-xs text-muted">{r.app.genre}{r.app.rating ? ` · ★ ${r.app.rating}` : ''}</span></span>
					</span>
					<span class="hidden truncate text-ink-2 md:block">{r.stats.topComplaint ? `${r.stats.topComplaint.label} (${r.stats.topComplaint.share}%)` : '—'}</span>
					<span class="flex items-center gap-2 num">
						{#if r.stats.complaintRate !== null}<span class="hidden h-1.5 w-12 overflow-hidden rounded-full bg-tile sm:block"><span class="block h-full bg-bad/70" style="width:{r.stats.complaintRate}%"></span></span>{r.stats.complaintRate}%{:else}—{/if}
					</span>
					<span class="hidden md:block">{#if r.score !== null}<span class="font-medium">{r.score}%</span>{:else}<span class="text-xs text-muted">{L.notClaimed}</span>{/if}</span>
				</a>
			</li>
		{/if}
	{:else}
		<li class="px-4 py-10 text-center text-sm text-muted">{L.empty}</li>
	{/each}
</ol>
