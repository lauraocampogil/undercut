<script lang="ts">
	import BarChart from '#lib/components/BarChart.svelte';
	import SdkSetup from '#lib/components/SdkSetup.svelte';
	let { data } = $props();
	const r = $derived(data.r);
	const money = (v: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: r.currency, maximumFractionDigits: v >= 1000 ? 0 : 2 }).format(v);
	const maxConv = $derived(Math.max(1, ...r.rows.map((x) => x.conv)));
	const dot = { good: 'bg-good', warn: 'bg-[#E3A21A]', bad: 'bg-bad' };
</script>

<svelte:head><title>Paywall · {data.client.name}</title></svelte:head>

{#if r.source === 'waiting'}
	<SdkSetup api={data.api} site={data.client.id} focus="paywall" />
	<p class="mt-4 text-center text-sm text-muted">Once the app sends its first paywall view, you’ll see here: how many people see each paywall, how many start a trial or pay, revenue, and which variant wins.</p>
{:else}
	<!-- funnel -->
	<section class="grid gap-3 lg:grid-cols-4">
		{#each [['Saw the paywall', r.totals.viewers, 'people'], ['Started a trial', r.totals.trials, 'trials'], ['Paid', r.totals.purchases, 'purchases']] as [l, v, u], i (l)}
			<div class="card p-5">
				<p class="text-sm text-muted">{i + 1} · {l}</p>
				<p class="big mt-3 text-[48px]">{(v as number).toLocaleString('en-US')}</p>
				<p class="text-xs text-muted">{u}{i > 0 && r.totals.viewers ? ` · ${(((v as number) / r.totals.viewers) * 100).toFixed(1)}% of viewers` : ` · ${r.totals.views.toLocaleString('en-US')} views`}</p>
			</div>
		{/each}
		<div class="card-dark p-5">
			<p class="text-sm text-white/60">Revenue · {r.days} days</p>
			<p class="big mt-3 text-[48px] text-accent">{money(r.totals.revenue)}</p>
			<p class="text-xs text-white/50">{r.totals.conv}% of viewers convert{r.source === 'demo' ? ' · example data' : ''}</p>
		</div>
	</section>

	{#if data.tasks.length}
		<ul class="card mt-4 divide-y divide-line">
			{#each data.tasks as k (k.title)}
				<li class="flex items-start gap-3 px-5 py-4"><span class="mt-1.5 size-2.5 shrink-0 rounded-full {dot[k.level]}"></span><div><p class="font-medium">{k.title}</p><p class="text-sm text-ink-2">{k.meaning}</p><p class="mt-1 text-sm"><b>What to do:</b> {k.action}</p></div></li>
			{/each}
		</ul>
	{/if}

	<!-- A/B -->
	<section class="card mt-4 p-4 sm:p-6">
		<div class="px-2">
			<h2 class="text-lg font-medium">Paywalls & variants</h2>
			<p class="text-sm text-muted">Each line is one paywall (where it shows) and one variant (A/B test). Conversion = trials + purchases ÷ people who saw it.</p>
		</div>
		{#if r.winner}
			<p class="mx-2 mt-4 rounded-[16px] p-3 text-sm {r.winner.enough ? 'bg-accent-soft' : 'bg-tile'}">
				{#if r.winner.enough}🏆 On “{r.winner.paywall}”, <b>{r.winner.best}</b> converts <b>{r.winner.lift}%</b> better than {r.winner.worst}.
				{:else}On “{r.winner.paywall}”, <b>{r.winner.best}</b> is ahead (+{r.winner.lift}%) — wait for 100 viewers per variant before deciding.{/if}
			</p>
		{/if}
		<div class="mt-4 overflow-x-auto">
			<table class="w-full min-w-[640px] text-sm">
				<thead><tr class="text-left text-xs text-muted"><th class="px-3 pb-2 font-medium">Paywall</th><th class="px-3 pb-2 font-medium">Variant</th><th class="px-3 pb-2 font-medium">Viewers</th><th class="px-3 pb-2 font-medium">Trials</th><th class="px-3 pb-2 font-medium">Paid</th><th class="px-3 pb-2 font-medium">Conversion</th><th class="px-3 pb-2 text-right font-medium">Revenue</th></tr></thead>
				<tbody>
					{#each r.rows as x (x.paywall + x.variant)}
						<tr class="border-t border-line">
							<td class="px-3 py-2.5 font-medium">{x.paywall}</td>
							<td class="px-3 py-2.5">{x.variant}</td>
							<td class="px-3 py-2.5">{x.viewers.toLocaleString('en-US')}</td>
							<td class="px-3 py-2.5">{x.trials}</td>
							<td class="px-3 py-2.5">{x.purchases}</td>
							<td class="px-3 py-2.5"><span class="flex items-center gap-2"><span class="w-12 text-right">{x.conv}%</span><span class="h-2 rounded-full {r.winner?.best === x.variant && r.winner.paywall === x.paywall ? 'bg-accent' : 'bg-ink'}" style="width:{Math.max(4, (x.conv / maxConv) * 100)}px"></span></span></td>
							<td class="px-3 py-2.5 text-right">{money(x.revenue)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section class="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
		<div class="card p-6">
			<h2 class="text-lg font-medium">Revenue per day</h2>
			<p class="text-sm text-muted">Purchases sent by the app ({r.currency}).</p>
			<div class="mt-6"><BarChart data={r.daily} unit={r.currency} /></div>
		</div>
		<div class="card p-6">
			<h2 class="text-lg font-medium">Products</h2>
			<ul class="mt-4 space-y-2">
				{#each r.products as p (p.product)}
					<li class="flex items-center justify-between gap-3 rounded-[16px] bg-tile px-4 py-3 text-sm"><span class="truncate">{p.product}</span><span class="shrink-0 text-muted">{p.purchases}× · <b class="text-ink">{money(p.revenue)}</b></span></li>
				{:else}
					<li class="text-sm text-muted">No purchase yet.</li>
				{/each}
			</ul>
		</div>
	</section>

	<details class="mt-4">
		<summary class="cursor-pointer text-sm text-muted">App SDK code</summary>
		<div class="mt-3"><SdkSetup api={data.api} site={data.client.id} focus="paywall" /></div>
	</details>
{/if}
