<script lang="ts">
	// Landing section: what founders do on Undercut, as a scroll story.
	import ScrollStory from '#lib/components/ScrollStory.svelte';
	// illustration of a claimed product (not real data)
	const rows = [
		{ c: 'Sync fails', n: 42, s: 'Fixed · verified', tone: 'text-good' },
		{ c: 'Too expensive', n: 31, s: 'Working on it', tone: 'text-warn' },
		{ c: 'No dark mode', n: 12, s: 'Known', tone: 'text-muted' }
	];
	const story = [
		{ title: 'Claim your product', text: 'Analyze it on Undercut and click “Claim”. Its page becomes yours to answer.' },
		{ title: 'Mark every complaint', text: 'Known, Working on it or Fixed — with the date and the version. Everyone sees your answers.' },
		{ title: 'The reviews verify it', text: 'If a complaint comes up less than half as often after the fix date, the fix is verified and your fix score goes up.' }
	];
	// weekly mentions of one complaint, before and after the fix (illustration)
	const weeks = [9, 11, 8, 10, 9, 4, 3, 2, 2, 1];
</script>

	{#snippet preview(i: number)}
		<div class="rounded-3xl border border-line bg-[#fafaf8] p-7 sm:p-9">
			{#if i === 0}
				<div class="flex items-center gap-4">
					<span class="size-14 rounded-2xl bg-tile"></span>
					<div class="flex-1"><p class="font-medium">Your product</p><p class="text-sm text-muted">Productivity · 4 sources</p></div>
				</div>
				<div class="pop mt-6 flex items-center justify-between gap-3 rounded-2xl border border-line p-4" style="--d:400ms">
					<p class="text-sm">Is it your product?</p>
					<span class="btn btn-primary">Claim it</span>
				</div>
			{:else if i === 1}
				<div class="grid grid-cols-[1.4fr_0.7fr_1.3fr] pb-3 text-sm text-muted"><span>Complaint</span><span>Mentions</span><span>Status</span></div>
				{#each rows as r, k}
					<div class="pop grid grid-cols-[1.4fr_0.7fr_1.3fr] border-t border-line py-4 text-sm" style="--d:{k * 180}ms"><span class="font-medium">{r.c}</span><span class="num">{r.n}</span><span class={r.tone}>{r.s}</span></div>
				{/each}
			{:else}
				<div class="mb-5 flex items-center justify-between"><p class="text-sm text-muted">“Sync fails” — mentions per week</p><span class="pop rounded-full bg-good-bg px-3 py-1 text-xs text-good" style="--d:1100ms">Verified ✓</span></div>
				<div class="flex h-36 items-end gap-2">
					{#each weeks as w, k}
						<span class="relative flex-1"><span class="growh block rounded-t-md {k < 5 ? 'bg-bad/60' : 'bg-good/70'}" style="--h:{(w / 11) * 144}px; --d:{k * 70}ms"></span></span>
					{/each}
				</div>
				<div class="mt-2 flex justify-between text-xs text-muted"><span>Before the fix</span><span>After</span></div>
				<p class="mt-5 text-sm">Fix score <span class="big ml-2 text-3xl">58%</span></p>
			{/if}
		</div>
	{/snippet}

<ScrollStory steps={story} visual={preview} />
