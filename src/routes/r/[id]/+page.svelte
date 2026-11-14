<script lang="ts">
	import BarChart from '#lib/components/BarChart.svelte';
	import BarList from '#lib/components/BarList.svelte';
	import Delta from '#lib/components/Delta.svelte';
	import { day, n, pct } from '#lib/format.ts';
	let { data } = $props();
	const m = $derived(data.metrics);
	const app = $derived(data.app);
	const range = $derived(data.range);
	const c = $derived(data.client);
	const a = $derived(data.agency);
	const actions = $derived(data.insights.filter((i) => i.level !== 'good').slice(0, 3));
	const wins = $derived(data.insights.filter((i) => i.level === 'good').slice(0, 3));
</script>

<svelte:head><title>{c.name} · report by {a.name}</title></svelte:head>

<div class="min-h-dvh px-3 py-6 sm:px-6 sm:py-10">
	<article class="mx-auto max-w-4xl">
		<div class="no-print mb-4 flex justify-end">
			<button class="btn btn-primary" onclick={() => window.print()}>Save as PDF</button>
		</div>

		<header class="card-dark relative overflow-hidden p-7 sm:p-10">
			<div class="absolute -top-24 -right-24 size-72 rounded-full opacity-90" style="background:{c.color}"></div>
			<div class="relative flex items-center justify-between gap-3 text-sm">
				<span class="rounded-full bg-white px-3 py-1 font-medium text-ink">{a.name}</span>
				<span class="text-white/60">{day(range.start)} – {day(range.end)}</span>
			</div>
			<h1 class="display relative mt-16 text-[52px] sm:text-[88px]">{c.name}</h1>
			<p class="relative mt-2 text-white/60">Your {m && app ? 'website and app' : app ? 'app' : 'website'}, the last {range.days} days</p>
		</header>

		<section class="card mt-4 p-7 sm:p-9">
			<p class="label">In short</p>
			<p class="display mt-3 text-[28px] leading-[1.2] sm:text-[36px]">{data.summary.text}</p>
		</section>

		{#if m}
		<section class="card mt-4 grid grid-cols-2 gap-px overflow-hidden bg-line sm:grid-cols-4">
			{#each [
				{ l: 'Visits', v: m.visits.total, p: m.visits.prev },
				{ l: 'People', v: m.users.total, p: m.users.prev },
				{ l: 'Google clicks', v: m.search.clicks, p: m.search.prevClicks },
				{ l: 'Contacts', v: m.conversions.total, p: m.conversions.prev }
			] as k (k.l)}
				<div class="bg-white p-6">
					<p class="text-sm text-muted">{k.l}</p>
					<p class="big mt-4 text-[44px]">{n(k.v)}</p>
					<div class="mt-2"><Delta value={pct(k.v, k.p)} /></div>
				</div>
			{/each}
		</section>

		<section class="card mt-4 p-7">
			<h2 class="text-lg font-medium">Visits per day</h2>
			<div class="mt-5"><BarChart data={m.visits.daily} height={190} /></div>
		</section>

		{/if}
		{#if app}
			<section class="card mt-4 grid grid-cols-2 gap-px overflow-hidden bg-line sm:grid-cols-4">
				{#each [
					{ l: 'App users', v: n(app.active.total), d: pct(app.active.total, app.active.prev) },
					{ l: 'New users', v: n(app.newUsers.total), d: pct(app.newUsers.total, app.newUsers.prev) },
					{ l: 'Crash-free', v: `${app.crashFree}%`, d: null },
					{ l: 'Store rating', v: `${app.store.ios?.rating ?? app.store.android?.rating ?? '—'}★`, d: null }
				] as k (k.l)}
					<div class="bg-white p-6">
						<p class="text-sm text-muted">{k.l}</p>
						<p class="big mt-4 text-[44px]">{k.v}</p>
						{#if k.d !== null}<div class="mt-2"><Delta value={k.d} /></div>{/if}
					</div>
				{/each}
			</section>
			<section class="card mt-4 p-7">
				<h2 class="text-lg font-medium">App users per day</h2>
				<div class="mt-5"><BarChart data={app.dau} height={190} unit="users" /></div>
			</section>
		{/if}


		{#if data.campaigns.length}
			<section class="card mt-4 p-7">
				<h2 class="display text-[34px]">{data.campaignOnly ? data.campaigns[0].name : 'Campaigns'}</h2>
				{#if data.campaignOnly}
					{@const c = data.campaigns[0]}
					<p class="mt-1 text-sm text-muted">{c.icon} {c.channel} · from {c.start}{c.end ? ` to ${c.end}` : ''}</p>
					<div class="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] bg-line sm:grid-cols-4">
						{#each [['Visits', c.stats.visits.toLocaleString('en-US')], ['Leads', String(c.stats.leads)], ['Conversion', `${c.stats.conversion}%`], ['Cost per lead', c.stats.cpl ? `€${c.stats.cpl}` : '—']] as [l, v] (l)}
							<div class="bg-white p-5"><p class="text-xs text-muted">{l}</p><p class="big mt-2 text-[36px]">{v}</p></div>
						{/each}
					</div>
					{#if c.stats.daily.length > 1}<div class="mt-5"><BarChart data={c.stats.daily.map((d) => ({ date: d.date, value: d.leads }))} height={170} unit="leads" /></div>{/if}
					<p class="mt-4 text-sm text-ink-2">📝 {c.stats.byKind.form} forms · 💬 {c.stats.byKind.whatsapp} WhatsApp · 📞 {c.stats.byKind.phone} calls · ✉️ {c.stats.byKind.email} emails</p>
				{:else}
					<ul class="mt-5 divide-y divide-line">
						{#each data.campaigns as c (c.id)}
							<li class="flex flex-wrap items-center gap-3 py-3 text-sm">
								<span class="text-xl">{c.icon}</span><span class="min-w-0 flex-1"><strong class="font-medium">{c.name}</strong> <span class="text-muted">· {c.channel}</span></span>
								<span>{c.stats.visits} visits</span><span class="rounded-full bg-accent px-2.5 py-0.5 font-medium text-accent-ink">{c.stats.leads} leads</span>{#if c.stats.cpl}<span class="text-muted">€{c.stats.cpl}/lead</span>{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}
		<section class="mt-4 grid gap-4 sm:grid-cols-2">
			<div class="card p-7">
				<h2 class="display text-[34px]">What went <em>well</em></h2>
				<ul class="mt-5 space-y-4">
					{#each wins as w (w.area + w.title)}
						<li class="flex gap-3 text-sm"><span class="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs text-accent-ink">✓</span><span><strong class="font-medium">{w.title}.</strong> <span class="text-ink-2">{w.meaning}</span></span></li>
					{/each}
				</ul>
			</div>
			<div class="card-dark p-7">
				<h2 class="display text-[34px]">What we do <em>next</em></h2>
				<ol class="mt-5 space-y-4">
					{#each actions as w, i (w.area + w.title)}
						<li class="flex gap-3 text-sm"><span class="num grid size-6 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold text-ink">{i + 1}</span><span><strong class="font-medium">{w.title}.</strong> <span class="text-white/70">{w.action}</span></span></li>
					{:else}
						<li class="text-sm text-white/70">Nothing urgent. We keep monitoring.</li>
					{/each}
				</ol>
			</div>
		</section>

		{#if m}
		<section class="mt-4 grid gap-4 sm:grid-cols-2">
			<div class="card p-7">
				<h2 class="text-lg font-medium">How people find you</h2>
				<div class="mt-5"><BarList items={m.channels.map((x) => ({ label: x.name, value: x.visits }))} /></div>
			</div>
			<div class="card p-7">
				<h2 class="text-lg font-medium">Top Google searches</h2>
				<div class="mt-5"><BarList items={m.search.queries.slice(0, 5).map((q) => ({ label: q.query, value: q.clicks, extra: `#${q.position}` }))} /></div>
			</div>
		</section>

		{/if}

		<footer class="mt-8 flex flex-wrap items-center justify-between gap-2 px-2 text-sm text-muted">
			<p>{a.reportFooter}</p>
			<p class="display text-xl text-ink">{a.name}</p>
		</footer>
	</article>
</div>
