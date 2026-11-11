<script lang="ts">
	import BarChart from '#lib/components/BarChart.svelte';
	import SourceBadge from '#lib/components/SourceBadge.svelte';
	import { navigating } from '$app/state';
	let { data } = $props();
	const r = $derived(data.ideas);
	let showAlpha = $state(false);
	let copied = $state<string | null>(null);

	function copy(text: string) {
		navigator.clipboard?.writeText(text);
		copied = text;
		setTimeout(() => (copied = null), 1200);
	}
	function exportCsv() {
		if (!r) return;
		const rows: string[][] = [['type', 'group', 'idea']];
		r.questions.forEach((g) => g.items.forEach((i) => rows.push(['question', g.group, i])));
		r.prepositions.forEach((g) => g.items.forEach((i) => rows.push(['preposition', g.group, i])));
		r.comparisons.forEach((i) => rows.push(['comparison', '', i]));
		r.alphabet.forEach((g) => g.items.forEach((i) => rows.push(['alphabet', g.letter, i])));
		r.rising.forEach((i) => rows.push(['rising', i.value, i.query]));
		r.content.items.forEach((i) => rows.push(['top content', i.domain, `${i.title} — ${i.url}`]));
		const csv = rows.map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
		const a = document.createElement('a');
		a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
		a.download = `undercut-ideas-${r.keyword.replace(/\s+/g, '-')}.csv`;
		a.click();
	}
	const flagged = $derived(r ? r.questions.reduce((s, g) => s + g.items.length, 0) : 0);
</script>

<svelte:head><title>{r ? `${r.keyword} · Ideas` : 'Content ideas'} · Undercut</title></svelte:head>

<section class="card-dark relative overflow-hidden p-6 sm:p-10">
	<div class="pointer-events-none absolute -right-20 -bottom-32 size-[380px] rounded-full bg-accent/90 blur-[2px]"></div>
	<div class="relative max-w-3xl">
		<p class="label text-white/50!">{data.client ? `Ideas for ${data.client.name}` : 'Content ideas'}</p>
		<h1 class="display mt-3 text-[48px] sm:text-[80px]">Find what people <em>ask</em>.</h1>
		<p class="mt-3 max-w-xl text-white/60">Type a topic. Get the real questions people search on Google, whether interest is rising, and the pages that already rank — ready to turn into blog posts and pages.</p>

		<form method="GET" class="mt-7">
			{#if data.client}<input type="hidden" name="client" value={data.client.id} />{/if}
			<div class="flex gap-2 rounded-full bg-white p-1.5">
				<input name="q" value={data.q} placeholder="e.g. boulangerie bruxelles" class="min-w-0 flex-1 bg-transparent px-4 text-base text-ink outline-none" aria-label="Topic" />
				<button class="btn btn-primary shrink-0">{navigating.to ? 'Searching…' : 'Find ideas'}</button>
			</div>
			<div class="mt-3 flex flex-wrap items-center gap-2">
				{#each data.langs as l (l)}
					<label class="cursor-pointer">
						<input type="radio" name="lang" value={l} checked={data.lang === l} class="peer sr-only" />
						<span class="pill border-white/20 uppercase peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-ink">{l}</span>
					</label>
				{/each}
				<select name="geo" class="rounded-full border border-white/20 bg-transparent px-3 py-2 text-sm" aria-label="Country">
					{#each data.geos as g (g)}<option value={g} selected={data.geo === g} class="text-ink">{g}</option>{/each}
				</select>
			</div>
		</form>
		{#if !r}
			<div class="mt-6 flex flex-wrap gap-2">
				<span class="text-sm text-white/50">Try:</span>
				{#each data.seeds as s (s)}
					<a href="?q={encodeURIComponent(s)}&lang={data.lang}&geo={data.geo}{data.client ? `&client=${data.client.id}` : ''}" class="rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/20">{s}</a>
				{/each}
			</div>
		{/if}
	</div>
</section>

{#if r}
	<!-- Trend + rising + totals -->
	<section class="mt-4 grid gap-4 lg:grid-cols-[1.7fr_1fr]">
		<div class="card-dark p-6 sm:p-7">
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p class="text-sm text-white/50">Google Trends · {r.geo} · 12 months</p>
					<p class="mt-3 flex items-baseline gap-3">
						<span class="big text-[56px] {r.trend.change >= 0 ? 'text-accent' : 'text-[#ff8a80]'}">{r.trend.change >= 0 ? '+' : ''}{r.trend.change}%</span>
						<span class="text-sm text-white/60">last 2 months vs the 2 before</span>
					</p>
					{#if r.trend.peakMonth}<p class="mt-1 text-sm text-white/60">Peak interest in <span class="text-white">{r.trend.peakMonth}</span> — publish 4–6 weeks before.</p>{/if}
				</div>
				<SourceBadge state={r.trend.source} dark />
			</div>
			<div class="mt-6"><BarChart data={r.trend.points} unit="interest" height={180} dark /></div>
		</div>
		<div class="flex flex-col gap-4">
			<div class="card flex items-end justify-between gap-4 p-6">
				<div>
					<p class="text-sm text-muted">Ideas found</p>
					<p class="big mt-3 text-[64px]">{r.total}</p>
					<p class="text-xs text-muted">{flagged} questions · <SourceBadge state={r.suggestSource} /></p>
				</div>
				<button class="btn btn-ghost" onclick={exportCsv}>Export CSV</button>
			</div>
			<div class="flex-1 rounded-[28px] bg-[#E4F5B8] p-6">
				<div class="flex items-center justify-between gap-3">
					<h2 class="text-lg font-medium">Rising searches</h2>
					<SourceBadge state={r.trend.source} />
				</div>
				<ul class="mt-4 space-y-1.5">
					{#each r.rising as x (x.query)}
						<li class="flex items-center justify-between gap-3 rounded-full bg-white/70 px-4 py-2 text-sm">
							<a class="truncate hover:underline" href="?q={encodeURIComponent(x.query)}&lang={r.lang}&geo={r.geo}">{x.query}</a>
							<span class="num shrink-0 rounded-full bg-ink px-2 py-0.5 text-[11px] text-accent">{x.value}</span>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</section>

	<!-- Questions -->
	<section class="mt-10">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<div>
				<h2 class="display text-[40px] sm:text-[52px]">Questions people <em>ask</em></h2>
				<p class="text-sm text-muted">Straight from Google's autocomplete. Each one can be a blog post, an FAQ entry or a page section. Click to copy.</p>
			</div>
		</div>
		<div class="mt-5 columns-1 gap-4 sm:columns-2 xl:columns-3">
			{#each r.questions as g, gi (g.group)}
				<div class="mb-4 break-inside-avoid p-5 {gi === 0 ? 'card-dark' : 'card'}">
					<p class="display text-[30px] leading-none {gi === 0 ? 'text-accent' : ''}">{g.group}…</p>
					<ul class="mt-4 space-y-1">
						{#each g.items as it (it)}
							<li>
								<button class="w-full rounded-2xl px-3 py-2 text-left text-sm transition-colors {gi === 0 ? 'hover:bg-white/10' : 'hover:bg-tile'}" onclick={() => copy(it)}>
									{copied === it ? 'Copied ✓' : it}
								</button>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	</section>

	<!-- Prepositions + comparisons -->
	<section class="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
		<div class="card p-6">
			<h2 class="text-lg font-medium">With, for, near…</h2>
			<p class="text-sm text-muted">How people narrow the search — great for landing pages.</p>
			<div class="mt-5 grid gap-4 sm:grid-cols-2">
				{#each r.prepositions as g (g.group)}
					<div>
						<p class="label">{r.keyword} <span class="text-ink">{g.group}</span>…</p>
						<div class="mt-2 flex flex-wrap gap-1.5">
							{#each g.items as it (it)}<button class="rounded-full bg-tile px-3 py-1.5 text-sm hover:bg-ink hover:text-white" onclick={() => copy(it)}>{it}</button>{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
		<div class="card p-6">
			<h2 class="text-lg font-medium">Comparisons</h2>
			<p class="text-sm text-muted">"X vs Y" pages convert well.</p>
			<div class="mt-5 flex flex-wrap gap-1.5">
				{#each r.comparisons as it (it)}<button class="rounded-full border border-line px-3 py-1.5 text-sm hover:border-ink" onclick={() => copy(it)}>{it}</button>{:else}<p class="text-sm text-muted">None found.</p>{/each}
			</div>
		</div>
	</section>

	<!-- Top content -->
	<section class="mt-10">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<div>
				<h2 class="display text-[40px] sm:text-[52px]">What already <em>ranks</em></h2>
				<p class="text-sm text-muted">The pages Google shows first for "{r.keyword}" in {r.geo}. Beat them with a better, more local answer.</p>
			</div>
			<SourceBadge state={r.content.source} />
		</div>
		<ol class="card mt-5 divide-y divide-line">
			{#each r.content.items as it, i (it.url + i)}
				<li class="flex items-start gap-4 p-5 sm:gap-6 sm:p-6">
					<span class="big w-10 shrink-0 text-[40px] {i === 0 ? '' : 'text-[#c4c4bf]'}">{i + 1}</span>
					<div class="min-w-0 flex-1">
						<p class="text-xs text-muted">{it.domain}{it.date ? ` · ${it.date}` : ''}</p>
						<h3 class="mt-0.5 font-medium">{it.title}</h3>
						<p class="mt-1 line-clamp-2 text-sm text-ink-2">{it.snippet}</p>
					</div>
					{#if it.url !== '#'}
						<a href={it.url} target="_blank" rel="noreferrer" class="icon-btn shrink-0" aria-label="Open {it.title}">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 17 17 7M8 7h9v9" /></svg>
						</a>
					{/if}
				</li>
			{/each}
		</ol>
	</section>

	<!-- Alphabet -->
	<section class="mt-6">
		<button class="pill" onclick={() => (showAlpha = !showAlpha)}>{showAlpha ? 'Hide' : 'Show'} A–Z ideas ({r.alphabet.reduce((s, g) => s + g.items.length, 0)})</button>
		{#if showAlpha}
			<div class="card mt-4 grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-4">
				{#each r.alphabet as g (g.letter)}
					<div>
						<p class="display text-3xl uppercase">{g.letter}</p>
						<ul class="mt-1 space-y-0.5 text-sm text-ink-2">
							{#each g.items as it (it)}<li><button class="text-left hover:text-ink hover:underline" onclick={() => copy(it)}>{it}</button></li>{/each}
						</ul>
					</div>
				{/each}
			</div>
		{/if}
	</section>
{/if}
