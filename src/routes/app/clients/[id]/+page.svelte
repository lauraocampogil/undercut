<script lang="ts">
	import BarChart from '#lib/components/BarChart.svelte';
	import BarList from '#lib/components/BarList.svelte';
	import Delta from '#lib/components/Delta.svelte';
	import HealthRing from '#lib/components/HealthRing.svelte';
	import Heatmap from '#lib/components/Heatmap.svelte';
	import InsightCard from '#lib/components/InsightCard.svelte';
	import SourceBadge from '#lib/components/SourceBadge.svelte';
	import ArrowLink from '#lib/components/ArrowLink.svelte';
	import { n, pct, secs } from '#lib/format.ts';
	let { data } = $props();

	const m = $derived(data.metrics);
	const c = $derived(data.client);
	const mapsActions = $derived(m.maps ? m.maps.calls + m.maps.directions + m.maps.websiteClicks : 0);
	let showGood = $state(false);
	const todo = $derived(data.insights.filter((i) => i.level !== 'good'));
	const good = $derived(data.insights.filter((i) => i.level === 'good'));
	const kpis = $derived([
		{ label: 'Visits', hint: 'times the site was opened', v: n(m.visits.total), d: pct(m.visits.total, m.visits.prev) },
		{ label: 'People', hint: 'different visitors', v: n(m.users.total), d: pct(m.users.total, m.users.prev) },
		{ label: 'Contacts', hint: 'forms, calls, sales', v: n(m.conversions.total), d: pct(m.conversions.total, m.conversions.prev) },
		{ label: 'Time on site', hint: 'average per visit', v: secs(m.engagementSec.value), d: pct(m.engagementSec.value, m.engagementSec.prev) }
	]);
</script>

<svelte:head><title>{c.name} · Undercut</title></svelte:head>

{#if m.errors.length}
	<div class="mb-4 rounded-[20px] bg-bad-bg p-4 text-sm text-bad">Some Google data could not be loaded, demo numbers shown instead: {m.errors.join(' · ')}</div>
{/if}

<!-- Summary + KPIs -->
<section class="grid gap-4 lg:grid-cols-[1.1fr_1.9fr]">
	<div class="card-dark flex flex-col justify-between gap-6 p-6 sm:p-7">
		<div class="flex items-center justify-between">
			<span class="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-ink">{data.summary.ai ? 'AI summary' : 'This week'}</span>
			<HealthRing score={data.health.score} size={64} dark />
		</div>
		<p class="display text-[28px] leading-[1.15] sm:text-[32px]">{data.summary.text}</p>
	</div>
	<div class="card grid grid-cols-2 gap-px overflow-hidden bg-line p-0 sm:grid-cols-4">
		{#each kpis as k (k.label)}
			<div class="flex flex-col justify-between gap-6 bg-white p-5 sm:p-6">
				<div>
					<p class="text-sm font-medium">{k.label}</p>
					<p class="text-xs text-muted">{k.hint}</p>
				</div>
				<div>
					<p class="big text-[40px] sm:text-[48px]">{k.v}</p>
					<div class="mt-2"><Delta value={k.d} /></div>
				</div>
			</div>
		{/each}
	</div>
</section>

<!-- Actions -->
<section class="mt-10">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h2 class="display text-[40px] sm:text-[48px]">What to do <em>now</em></h2>
			<p class="text-sm text-muted">Every number explained, one action each. Most urgent first.</p>
		</div>
		{#if good.length}
			<button class="pill" onclick={() => (showGood = !showGood)}>{showGood ? 'Hide' : 'Show'} {good.length} things going well</button>
		{/if}
	</div>
	<div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
		{#each todo as i, idx (i.area + i.title)}<InsightCard insight={i} featured={idx === 0} />{/each}
		{#if showGood || !todo.length}
			{#each good as i (i.area + i.title)}<InsightCard insight={i} />{/each}
		{/if}
	</div>
</section>

<!-- Traffic -->
<section class="mt-10 grid gap-4 lg:grid-cols-[2fr_1fr]">
	<div class="card p-6">
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-lg font-medium">Visits per day</h2>
				<p class="text-sm text-muted">Best day highlighted. Hover any bar.</p>
			</div>
			<SourceBadge state={m.sources.ga4} />
		</div>
		<div class="mt-6"><BarChart data={m.visits.daily} /></div>
	</div>
	<div class="card p-6">
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-lg font-medium">Busiest days</h2>
				<p class="text-sm text-muted">Black = busy, lime = record.</p>
			</div>
		</div>
		<div class="mt-6"><Heatmap data={m.visits.daily} /></div>
	</div>
</section>

<section class="mt-4 grid gap-4 lg:grid-cols-3">
	<div class="card p-6">
		<div class="flex items-start justify-between gap-3">
			<h2 class="text-lg font-medium">Where visitors come from</h2>
			<SourceBadge state={m.sources.ga4} />
		</div>
		<div class="mt-5"><BarList items={m.channels.map((ch) => ({ label: ch.name, value: ch.visits }))} /></div>
	</div>
	<div class="card p-6">
		<div class="flex items-start justify-between gap-3">
			<h2 class="text-lg font-medium">Most visited pages</h2>
			<SourceBadge state={m.sources.ga4} />
		</div>
		<div class="mt-5"><BarList items={m.topPages.map((p) => ({ label: p.path, value: p.views, extra: `${p.change >= 0 ? '+' : ''}${p.change}%` }))} /></div>
	</div>
	<div class="card-dark flex flex-col p-6">
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-lg font-medium">Google Search</h2>
				<p class="text-sm text-white/50">What people typed to find the site</p>
			</div>
			<ArrowLink href="/app/clients/{c.id}/search-console?days={data.days}" label="Open Search Console" dark />
		</div>
		<div class="mt-6 grid grid-cols-2 gap-4">
			<div>
				<p class="big text-[44px]">{n(m.search.clicks)}</p>
				<p class="mt-1 flex items-center gap-2 text-xs text-white/50">clicks <Delta value={pct(m.search.clicks, m.search.prevClicks)} dark /></p>
			</div>
			<div>
				<p class="big text-[44px]">#{m.search.position}</p>
				<p class="mt-1 flex items-center gap-2 text-xs text-white/50">avg. position <Delta value={+(m.search.position - m.search.prevPosition).toFixed(1)} invert suffix="" dark /></p>
			</div>
		</div>
		<ul class="mt-6 space-y-1.5 text-sm">
			{#each m.search.queries.slice(0, 4) as q (q.query)}
				<li class="flex items-center justify-between gap-3 rounded-full bg-white/[.06] px-4 py-2">
					<span class="truncate">{q.query}</span>
					<span class="num shrink-0 rounded-full px-2 text-xs {q.position <= 3 ? 'bg-accent text-accent-ink' : 'text-white/60'}">#{q.position}</span>
				</li>
			{/each}
		</ul>
	</div>
</section>

<!-- Maps + technical -->
<section class="mt-4 grid gap-4 lg:grid-cols-3">
	{#if m.maps}
		<div class="flex flex-col rounded-[28px] bg-[#E4F5B8] p-6">
			<div class="flex items-start justify-between gap-3">
				<div>
					<h2 class="text-lg font-medium">Google Maps</h2>
					<p class="text-sm text-ink-2/70">{n(m.maps.views)} profile views</p>
				</div>
				<SourceBadge state={m.sources.gbp} />
			</div>
			<p class="mt-6 flex items-start gap-2"><span class="big text-[56px]">{mapsActions}</span><Delta value={pct(mapsActions, m.maps.prevTotal)} /></p>
			<p class="text-sm text-ink-2/70">actions from the Business profile</p>
			<div class="mt-auto grid grid-cols-3 gap-2 pt-6 text-center">
				<div class="rounded-2xl bg-white/70 p-3"><p class="big text-2xl">{m.maps.calls}</p><p class="text-[11px] text-muted">calls</p></div>
				<div class="rounded-2xl bg-white/70 p-3"><p class="big text-2xl">{m.maps.directions}</p><p class="text-[11px] text-muted">routes</p></div>
				<div class="rounded-2xl bg-white/70 p-3"><p class="big text-2xl">{m.maps.websiteClicks}</p><p class="text-[11px] text-muted">site clicks</p></div>
			</div>
		</div>
	{/if}

	<div class="card p-6">
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-lg font-medium">Sitemap</h2>
				<p class="text-sm text-muted">Pages Google should index</p>
			</div>
			<SourceBadge state={c.demo ? 'demo' : 'google'} />
		</div>
		{#if data.sitemap?.found}
			<p class="mt-6 big text-[56px]">{data.sitemap.urlCount}</p>
			<p class="text-sm text-muted">pages listed · found via {data.sitemap.via}</p>
			<div class="mt-6 grid grid-cols-2 gap-2">
				<div class="tile p-3 {data.sitemap.broken ? 'bg-bad-bg! text-bad' : ''}"><p class="big text-2xl">{data.sitemap.broken}</p><p class="text-[11px]">broken (sample)</p></div>
				<div class="tile p-3"><p class="big text-2xl">{data.sitemap.stale}</p><p class="text-[11px] text-muted">not updated 1y+</p></div>
			</div>
			{#if data.sitemap.broken}
				<ul class="mt-3 space-y-1 text-xs">
					{#each data.sitemap.checked.filter((x) => x.status === 0 || x.status >= 400) as b (b.url)}
						<li class="flex justify-between gap-3"><span class="truncate text-ink-2">{b.url}</span><span class="num text-bad">{b.status || 'timeout'}</span></li>
					{/each}
				</ul>
			{/if}
		{:else}
			<p class="mt-6 rounded-[18px] bg-bad-bg p-4 text-sm text-bad">{data.sitemap?.error ?? 'Could not check the sitemap.'}</p>
		{/if}
	</div>

	<div class="card p-6">
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-lg font-medium">Tracking</h2>
				<p class="text-sm text-muted">Is Tag Manager sending data?</p>
			</div>
			<SourceBadge state={m.sources.gtm} />
		</div>
		{#if m.tags}
			<div class="mt-6 flex items-center gap-3">
				<span class="grid size-14 place-items-center rounded-full text-xl {m.tags.googleTagFound ? 'bg-accent text-accent-ink' : 'bg-bad-bg text-bad'}">{m.tags.googleTagFound ? '✓' : '!'}</span>
				<div>
					<p class="display text-3xl">{m.tags.googleTagFound ? 'Installed' : 'GA4 tag missing'}</p>
					<p class="text-sm text-muted">Google tag (GA4)</p>
				</div>
			</div>
			<div class="mt-6 grid grid-cols-2 gap-2">
				<div class="tile p-3"><p class="truncate text-sm font-medium">{m.tags.container}</p><p class="text-[11px] text-muted">container</p></div>
				<div class="tile p-3"><p class="big text-2xl">{m.tags.tagCount}</p><p class="text-[11px] text-muted">tags</p></div>
			</div>
		{/if}
	</div>
</section>
