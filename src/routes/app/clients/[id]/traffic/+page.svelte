<script lang="ts">
	import BarChart from '#lib/components/BarChart.svelte';
	import BarList from '#lib/components/BarList.svelte';
	import Delta from '#lib/components/Delta.svelte';
	import Heatmap from '#lib/components/Heatmap.svelte';
	import SourceBadge from '#lib/components/SourceBadge.svelte';
	import WhyButton from '#lib/components/WhyButton.svelte';
	import { n, pct, secs } from '#lib/format.ts';
	let { data } = $props();
	const m = $derived(data.metrics);
	const kpis = $derived([
		{ label: 'Visits', hint: 'times the site was opened', v: n(m.visits.total), d: pct(m.visits.total, m.visits.prev) },
		{ label: 'People', hint: 'different visitors', v: n(m.users.total), d: pct(m.users.total, m.users.prev) },
		{ label: 'Contacts & sales', hint: 'forms, calls, purchases', v: n(m.conversions.total), d: pct(m.conversions.total, m.conversions.prev) },
		{ label: 'Time on site', hint: 'average per visit', v: secs(m.engagementSec.value), d: pct(m.engagementSec.value, m.engagementSec.prev) }
	]);
	const conversionRate = $derived(m.visits.total ? ((m.conversions.total / m.visits.total) * 100).toFixed(1) : '0');
</script>

<svelte:head><title>Traffic · {data.client.name}</title></svelte:head>

{#if m.errors.length}<div class="mb-4 rounded-[20px] bg-bad-bg p-4 text-sm text-bad">Some Google data could not be loaded, demo numbers shown: {m.errors.join(' · ')}</div>{/if}

<section class="card grid grid-cols-2 gap-px overflow-hidden bg-line lg:grid-cols-4">
	{#each kpis as k (k.label)}
		<div class="flex flex-col justify-between gap-6 bg-white p-5 sm:p-6">
			<div>
				<p class="text-sm font-medium">{k.label}</p>
				<p class="text-xs text-muted">{k.hint}</p>
			</div>
			<div>
				<p class="big text-[40px] sm:text-[52px]">{k.v}</p>
				<div class="mt-2 flex items-center gap-2"><Delta value={k.d} />{#if k.label === 'Visits'}<WhyButton clientId={data.client.id} metric="visits" days={data.days} />{/if}</div>
			</div>
		</div>
	{/each}
</section>

<section class="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
	<div class="card p-6">
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-lg font-medium">Visits per day</h2>
				<p class="text-sm text-muted">Best day in lime. Hover any bar.</p>
			</div>
			<SourceBadge state={m.sources.ga4} />
		</div>
		<div class="mt-6"><BarChart data={m.visits.daily} /></div>
	</div>
	<div class="card p-6">
		<h2 class="text-lg font-medium">Busiest days</h2>
		<p class="text-sm text-muted">Plan posts and ads on the black days.</p>
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
		<h2 class="text-lg font-medium">Turning visits into clients</h2>
		<p class="text-sm text-white/50">Contacts ÷ visits</p>
		<p class="big mt-6 text-[64px] text-accent">{conversionRate}%</p>
		<p class="mt-1 text-sm text-white/60">{n(m.conversions.total)} contacts from {n(m.visits.total)} visits. 2–5% is a healthy range for a local business.</p>
		{#if m.tags}
			<div class="mt-auto flex items-center justify-between gap-3 rounded-full bg-white/[.07] px-4 py-2.5 pt-2.5 text-sm">
				<span>GA4 tag via {m.tags.container}</span>
				<span class="rounded-full px-2 py-0.5 text-xs {m.tags.googleTagFound ? 'bg-accent text-accent-ink' : 'bg-[#ff6b5e]/20 text-[#ff8a80]'}">{m.tags.googleTagFound ? 'Installed' : 'Missing'}</span>
			</div>
		{/if}
	</div>
</section>
