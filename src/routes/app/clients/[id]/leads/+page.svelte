<script lang="ts">
	import BarChart from '#lib/components/BarChart.svelte';
	import Delta from '#lib/components/Delta.svelte';
	import SourceBadge from '#lib/components/SourceBadge.svelte';
	import WhyButton from '#lib/components/WhyButton.svelte';
	import { n, pct } from '#lib/format.ts';
	let { data } = $props();
	const l = $derived(data.leads);
	const rate = (leads: number, visits: number) => (visits ? `${((leads / visits) * 100).toFixed(1)}%` : '—');
	const kindLabel = { form: 'Forms sent', phone: 'Phone calls', email: 'Emails', whatsapp: 'WhatsApp' };
	const kindIcon = {
		form: 'M4 4h16v16H4zM8 9h8M8 13h8M8 17h5',
		phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z',
		email: 'M4 4h16v16H4zM22 6l-10 7L2 6',
		whatsapp: 'M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.6A8.5 8.5 0 1 1 21 11.5z'
	};
	const maxLeads = $derived(Math.max(1, ...l.byChannel.map((c) => c.leads)));
	const ago = (ts: number) => {
		const h = Math.round((Date.now() - ts) / 3600_000);
		return h < 1 ? 'just now' : h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
	};
	let copied = $state(false);
</script>

<svelte:head><title>Leads · {data.client.name}</title></svelte:head>

{#if l.source === 'waiting'}
	<section class="card-dark grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_1.2fr]">
		<div>
			<h2 class="display text-[40px] leading-none">Count the leads, <em>automatically</em>.</h2>
			<p class="mt-3 text-white/60">With the snippet, Undercut counts every form sent, phone tap, email click and WhatsApp message — and credits it to the channel and landing page of the visit. Nothing to configure.</p>
		</div>
		<div class="flex flex-col justify-center gap-3">
			<pre class="overflow-x-auto rounded-[18px] bg-white/[.07] p-4 text-[13px] text-accent">{data.snippet}</pre>
			<button class="btn btn-accent self-start" onclick={() => { navigator.clipboard?.writeText(data.snippet); copied = true; }}>{copied ? 'Copied ✓' : 'Copy snippet'}</button>
		</div>
	</section>
{:else}
	<!-- 1. How many, and of what kind -->
	<section class="grid gap-4 lg:grid-cols-[1fr_2fr]">
		<div class="card-dark flex flex-col justify-between gap-6 p-6 sm:p-7">
			<div class="flex items-center justify-between">
				<p class="text-sm text-white/60">Leads · last {l.range.days} days</p>
				<SourceBadge state={l.source === 'live' ? 'tracking' : l.source === 'demo' ? 'demo' : 'off'} dark />
			</div>
			<div>
				<p class="flex items-start gap-2"><span class="big text-[80px] text-accent">{n(l.totals.leads)}</span><Delta value={pct(l.totals.leads, l.totals.prev)} dark /></p>
				<p class="mt-1 text-sm text-white/60">{rate(l.totals.leads, l.totals.visits)} of visits become a lead</p>
			</div>
			<div class="flex items-center justify-between gap-2">
				<p class="text-xs text-white/40">vs {n(l.totals.prev)} the period before</p>
				<WhyButton clientId={data.client.id} metric="leads" days={data.days} dark />
			</div>
		</div>
		<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
			{#each l.byKind as k (k.kind)}
				<div class="card flex flex-col justify-between gap-6 p-5">
					<span class="grid size-10 place-items-center rounded-full bg-tile">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d={kindIcon[k.kind]} /></svg>
					</span>
					<div>
						<p class="flex items-start gap-1.5"><span class="big text-[44px]">{n(k.n)}</span><Delta value={pct(k.n, k.prev)} /></p>
						<p class="text-sm text-muted">{kindLabel[k.kind]}</p>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- 2. Where do they come from -->
	<section class="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
		<div class="card p-6">
			<div class="flex items-start justify-between gap-3">
				<div>
					<h2 class="text-lg font-medium">Which channel brings clients?</h2>
					<p class="text-sm text-muted">Visits are nice — leads pay. Compare both.</p>
				</div>
			</div>
			<div class="mt-5 overflow-x-auto">
				<table class="w-full min-w-[520px] text-sm">
					<thead><tr class="text-left text-xs text-muted"><th class="pb-3 font-medium">Channel</th><th class="pb-3 font-medium">Leads</th><th class="pb-3 text-right font-medium">Visits</th><th class="pb-3 text-right font-medium">Rate</th><th class="pb-3 text-right font-medium">vs before</th></tr></thead>
					<tbody>
						{#each l.byChannel as c, i (c.channel)}
							<tr class="border-t border-line">
								<td class="py-3 pr-3 font-medium">{c.channel}</td>
								<td class="py-3 pr-3">
									<div class="flex items-center gap-2">
										<span class="h-2.5 rounded-full {i === 0 ? 'bg-accent' : 'bg-ink'}" style="width:{Math.max(4, (c.leads / maxLeads) * 140)}px"></span>
										<span class="font-medium">{c.leads}</span>
									</div>
								</td>
								<td class="py-3 text-right text-ink-2">{n(c.visits)}</td>
								<td class="py-3 text-right text-ink-2">{rate(c.leads, c.visits)}</td>
								<td class="py-3 text-right"><Delta value={pct(c.leads, c.prevLeads)} /></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
		<div class="card p-6">
			<h2 class="text-lg font-medium">Leads per day</h2>
			<div class="mt-5"><BarChart data={l.daily} unit="leads" height={200} /></div>
		</div>
	</section>

	<!-- 3. Which pages convert -->
	<section class="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
		<div class="card p-6">
			<h2 class="text-lg font-medium">Landing pages</h2>
			<p class="text-sm text-muted">Where visits start — and which pages turn them into contacts.</p>
			<div class="mt-5 overflow-x-auto">
				<table class="w-full min-w-[440px] text-sm">
					<thead><tr class="text-left text-xs text-muted"><th class="pb-3 font-medium">Page</th><th class="pb-3 text-right font-medium">Visits started</th><th class="pb-3 text-right font-medium">Leads</th><th class="pb-3 text-right font-medium">Rate</th></tr></thead>
					<tbody>
						{#each l.byLanding as p (p.path)}
							<tr class="border-t border-line">
								<td class="max-w-[220px] truncate py-3 font-medium">{p.path}</td>
								<td class="py-3 text-right text-ink-2">{n(p.entries)}</td>
								<td class="py-3 text-right font-medium">{p.leads}</td>
								<td class="py-3 text-right"><span class="rounded-full px-2 py-0.5 text-xs {p.entries >= 40 && p.leads === 0 ? 'bg-bad-bg text-bad' : 'bg-tile'}">{rate(p.leads, p.entries)}</span></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
		<div class="flex flex-col gap-4">
			<div class="card p-6">
				<h2 class="text-lg font-medium">Latest leads</h2>
				<ul class="mt-4 space-y-2">
					{#each l.recent as r, i (i)}
						<li class="flex items-center gap-3 rounded-[16px] bg-tile px-3 py-2.5 text-sm">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d={kindIcon[r.kind]} /></svg>
							<span class="min-w-0 flex-1 truncate">{kindLabel[r.kind].replace(/s$/, '')} · {r.channel} · {r.landing}</span>
							<span class="shrink-0 text-xs text-muted">{ago(r.ts)}</span>
						</li>
					{:else}
						<li class="text-sm text-muted">No leads yet in this period.</li>
					{/each}
				</ul>
			</div>
			<div class="card grid grid-cols-2 gap-4 p-6">
				<div>
					<h3 class="text-sm font-medium">Outbound clicks</h3>
					<ul class="mt-2 space-y-1 text-sm">{#each l.outbound as o (o.label)}<li class="flex justify-between gap-2"><span class="truncate text-ink-2">{o.label}</span><span>{o.n}</span></li>{:else}<li class="text-muted">—</li>{/each}</ul>
				</div>
				<div>
					<h3 class="text-sm font-medium">Downloads</h3>
					<ul class="mt-2 space-y-1 text-sm">{#each l.downloads as o (o.label)}<li class="flex justify-between gap-2"><span class="truncate text-ink-2">{o.label}</span><span>{o.n}</span></li>{:else}<li class="text-muted">—</li>{/each}</ul>
				</div>
			</div>
		</div>
	</section>
	<p class="mt-4 text-xs text-muted">Counted automatically by the snippet: form submissions, tel: / mailto: / WhatsApp links, outbound links and file downloads. Cookieless — nothing personal is stored. Add <code>data-undercut-ignore</code> to a form to skip it.</p>
{/if}
