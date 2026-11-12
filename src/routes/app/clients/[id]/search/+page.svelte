<script lang="ts">
	import BarChart from '#lib/components/BarChart.svelte';
	import Delta from '#lib/components/Delta.svelte';
	import SourceBadge from '#lib/components/SourceBadge.svelte';
	import WhyButton from '#lib/components/WhyButton.svelte';
	import { n, pct } from '#lib/format.ts';
	import type { GscRow } from '#lib/types.ts';
	let { data } = $props();
	const g = $derived(data.gsc);
	const t = $derived(g.totals);

	let tab = $state<'queries' | 'pages' | 'countries' | 'devices'>('queries');
	let search = $state('');
	let sort = $state<'clicks' | 'impressions' | 'ctr' | 'position'>('clicks');
	let metric = $state<'clicks' | 'impressions'>('clicks');

	const rows = $derived.by(() => {
		const list: GscRow[] = g[tab];
		const s = search.trim().toLowerCase();
		return list
			.filter((r) => !s || r.key.toLowerCase().includes(s))
			.toSorted((a, b) => (sort === 'position' ? a.position - b.position : b[sort] - a[sort]));
	});
	const chart = $derived(g.daily.map((d) => ({ date: d.date, value: d[metric] })));
	const ctrPct = (v: number) => `${(v * 100).toFixed(1)}%`;
	const opp = $derived([
		{ title: 'Page 2 → page 1', hint: 'Seen often, but on page 2 where nobody clicks. Add a section that answers this search.', rows: data.opportunities.page2, dark: true },
		{ title: 'Almost top 3', hint: 'On page 1 but below the top 3. Add internal links and update the page.', rows: data.opportunities.almostTop, dark: false },
		{ title: 'Seen, not clicked', hint: 'High in Google, few clicks. Rewrite the title and description.', rows: data.opportunities.lowCtr, dark: false }
	]);
</script>

<svelte:head><title>Search Console · {data.client.name}</title></svelte:head>

{#if g.error}<div class="mb-4 rounded-[20px] bg-bad-bg p-4 text-sm text-bad">Search Console error, demo numbers shown: {g.error}</div>{/if}

<section class="grid gap-4 lg:grid-cols-[1fr_2fr]">
	<div class="card grid grid-cols-2 gap-px overflow-hidden bg-line">
		{#each [
			{ l: 'Clicks', v: n(t.clicks), d: pct(t.clicks, t.prevClicks), inv: false, s: '%' },
			{ l: 'Times seen', v: n(t.impressions), d: pct(t.impressions, t.prevImpressions), inv: false, s: '%' },
			{ l: 'Click rate', v: ctrPct(t.ctr), d: 0, inv: false, s: '' },
			{ l: 'Avg. position', v: `#${t.position}`, d: +(t.position - t.prevPosition).toFixed(1), inv: true, s: '' }
		] as k (k.l)}
			<div class="bg-white p-5">
				<p class="text-sm text-muted">{k.l}</p>
				<p class="big mt-4 text-[40px]">{k.v}</p>
				{#if k.d}<div class="mt-2 flex items-center gap-2"><Delta value={k.d} invert={k.inv} suffix={k.s} />{#if k.l === 'Clicks'}<WhyButton clientId={data.client.id} metric="clicks" days={data.days} />{/if}</div>{/if}
			</div>
		{/each}
	</div>
	<div class="card p-6">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex items-center gap-3">
				<h2 class="text-lg font-medium">Per day</h2>
				<SourceBadge state={g.source} />
			</div>
			<div class="flex rounded-full bg-tile p-1 text-sm">
				<button class="rounded-full px-3 py-1 {metric === 'clicks' ? 'bg-ink text-white' : ''}" onclick={() => (metric = 'clicks')}>Clicks</button>
				<button class="rounded-full px-3 py-1 {metric === 'impressions' ? 'bg-ink text-white' : ''}" onclick={() => (metric = 'impressions')}>Times seen</button>
			</div>
		</div>
		<div class="mt-5"><BarChart data={chart} unit={metric} height={200} /></div>
	</div>
</section>

<section class="mt-10">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<h2 class="display text-[40px] sm:text-[48px]">Quick <em>wins</em></h2>
		<a href="/app/ideas?client={data.client.id}" class="btn btn-ghost">Find new keywords →</a>
	</div>
	<p class="text-sm text-muted">Searches where a small change brings the most new clicks.</p>
	<div class="mt-5 grid gap-4 lg:grid-cols-3">
		{#each opp as o (o.title)}
			<div class="flex flex-col p-6 {o.dark ? 'card-dark' : 'card'}">
				<h3 class="display text-[30px] leading-none">{o.title}</h3>
				<p class="mt-2 text-sm {o.dark ? 'text-white/60' : 'text-muted'}">{o.hint}</p>
				<ul class="mt-5 space-y-1.5">
					{#each o.rows as r (r.key)}
						<li class="flex items-center justify-between gap-3 rounded-full px-4 py-2 text-sm {o.dark ? 'bg-white/[.07]' : 'bg-tile'}">
							<span class="truncate">{r.key}</span>
							<span class="num shrink-0 text-xs {o.dark ? 'text-white/60' : 'text-muted'}">{n(r.impressions)} seen · #{r.position}</span>
						</li>
					{:else}
						<li class="text-sm {o.dark ? 'text-white/50' : 'text-muted'}">Nothing here right now.</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
</section>

{#if data.maps}
	{@const mp = data.maps}
	{@const total = mp.calls + mp.directions + mp.websiteClicks}
	<section id="maps" class="mt-10 scroll-mt-6">
		<h2 class="display text-[40px] sm:text-[48px]">Google <em>Maps</em></h2>
		<p class="text-sm text-muted">What people did on the Google Business profile.</p>
		<div class="mt-5 grid gap-4 lg:grid-cols-[1fr_2fr]">
			<div class="flex flex-col rounded-[28px] bg-[#E4F5B8] p-6">
				<div class="flex items-start justify-between gap-3">
					<p class="text-sm">{n(mp.views)} profile views</p>
					<SourceBadge state={data.mapsSource} />
				</div>
				<p class="mt-6 flex items-start gap-2"><span class="big text-[64px]">{n(total)}</span><Delta value={pct(total, mp.prevTotal)} /></p>
				<p class="text-sm text-ink-2/70">actions: someone called, asked for directions or opened the site</p>
			</div>
			<div class="card grid grid-cols-3 gap-px overflow-hidden bg-line">
				{#each [['Calls', mp.calls, 'tapped “Call”'], ['Route requests', mp.directions, 'asked for directions'], ['Website clicks', mp.websiteClicks, 'opened the site from Maps']] as [l, v, h] (l)}
					<div class="flex flex-col justify-between gap-6 bg-white p-6">
						<div><p class="text-sm font-medium">{l}</p><p class="text-xs text-muted">{h}</p></div>
						<p class="big text-[48px]">{n(Number(v))}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>
{/if}

<section class="card mt-10 p-4 sm:p-6">
	<div class="flex flex-wrap items-center gap-2">
		{#each [['queries', 'Searches'], ['pages', 'Pages'], ['countries', 'Countries'], ['devices', 'Devices']] as [id, label] (id)}
			<button class="pill {tab === id ? 'pill-active' : ''}" onclick={() => (tab = id as typeof tab)}>{label}<span class="num text-xs opacity-60">{g[id as typeof tab].length}</span></button>
		{/each}
		<input class="input ml-auto max-w-[260px] py-2 text-sm" placeholder="Filter…" bind:value={search} aria-label="Filter rows" />
	</div>
	<div class="mt-4 overflow-x-auto">
		<table class="w-full min-w-[560px] text-sm">
			<thead>
				<tr class="text-left text-xs text-muted">
					<th class="px-3 pb-3 font-medium">{tab === 'queries' ? 'Search' : tab === 'pages' ? 'Page' : tab === 'countries' ? 'Country' : 'Device'}</th>
					{#each [['clicks', 'Clicks'], ['impressions', 'Seen'], ['ctr', 'Click rate'], ['position', 'Position']] as [k, l] (k)}
						<th class="px-3 pb-3 text-right font-medium">
							<button class="hover:text-ink {sort === k ? 'text-ink' : ''}" onclick={() => (sort = k as typeof sort)}>{l}{sort === k ? ' ↓' : ''}</button>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each rows.slice(0, 50) as r (r.key)}
					<tr class="border-t border-line">
						<td class="max-w-[320px] truncate px-3 py-3">{r.key}</td>
						<td class="num px-3 py-3 text-right">
							{n(r.clicks)}
							{#if r.prevClicks !== undefined && tab === 'queries'}<span class="ml-1"><Delta value={pct(r.clicks, r.prevClicks)} /></span>{/if}
						</td>
						<td class="num px-3 py-3 text-right text-ink-2">{n(r.impressions)}</td>
						<td class="num px-3 py-3 text-right text-ink-2">{ctrPct(r.ctr)}</td>
						<td class="px-3 py-3 text-right">
							<span class="num rounded-full px-2.5 py-1 text-xs font-medium {r.position <= 3 ? 'bg-accent text-accent-ink' : r.position <= 10 ? 'bg-tile' : 'bg-warn-bg text-warn'}">#{r.position}</span>
						</td>
					</tr>
				{:else}
					<tr><td colspan="5" class="px-3 py-8 text-center text-muted">No rows match.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="mt-4 px-3 text-xs text-muted">Position 1–3 = top of Google · 4–10 = page 1 · above 10 = page 2, almost nobody clicks.</p>
</section>
