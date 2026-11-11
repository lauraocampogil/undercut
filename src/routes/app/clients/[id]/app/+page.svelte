<script lang="ts">
	import BarChart from '#lib/components/BarChart.svelte';
	import BarList from '#lib/components/BarList.svelte';
	import Delta from '#lib/components/Delta.svelte';
	import SourceBadge from '#lib/components/SourceBadge.svelte';
	import { n, pct, secs } from '#lib/format.ts';
	let { data } = $props();
	const a = $derived(data.app);
	const totalPlat = $derived(a.platforms.reduce((s, p) => s + p.users, 0) || 1);
	const stars = (k: number) => '★★★★★'.slice(0, Math.round(k)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(k));
	const cell = (v: number) => (v >= 100 ? 'bg-ink text-white' : v >= 40 ? 'bg-accent text-accent-ink' : v >= 25 ? 'bg-[#dff59a]' : v >= 15 ? 'bg-[#eef7cf]' : 'bg-tile');
	const usageState = $derived(a.source.usage);
</script>

<svelte:head><title>App · {data.client.name}</title></svelte:head>

{#if a.error}<div class="mb-4 rounded-[20px] bg-warn-bg p-4 text-sm text-warn">{a.error}</div>{/if}

<section class="card grid grid-cols-2 gap-px overflow-hidden bg-line lg:grid-cols-5">
	{#each [
		{ l: 'Active users', h: `last ${a.range.days} days`, v: n(a.active.total), d: pct(a.active.total, a.active.prev) },
		{ l: 'New users', h: 'first open', v: n(a.newUsers.total), d: pct(a.newUsers.total, a.newUsers.prev) },
		{ l: 'Daily habit', h: 'DAU ÷ MAU', v: `${a.stickiness}%`, d: null },
		{ l: 'Session', h: `${a.sessionsPerUser} per user`, v: secs(a.avgSessionSec), d: null },
		{ l: 'Crash-free', h: 'users without a crash', v: `${a.crashFree}%`, d: null }
	] as k (k.l)}
		<div class="flex flex-col justify-between gap-6 bg-white p-5 sm:p-6">
			<div><p class="text-sm font-medium">{k.l}</p><p class="text-xs text-muted">{k.h}</p></div>
			<div>
				<p class="big text-[36px] sm:text-[44px] {k.l === 'Crash-free' && a.crashFree < 99 ? 'text-bad' : ''}">{k.v}</p>
				{#if k.d !== null}<div class="mt-2"><Delta value={k.d} /></div>{/if}
			</div>
		</div>
	{/each}
</section>

{#if data.tasks.length}
	<section class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
		{#each data.tasks as t, i (t.title)}
			<div class="flex flex-col gap-2 p-5 {i === 0 ? 'card-dark' : 'card'}">
				<p class="text-[11px] font-medium {t.level === 'bad' ? (i === 0 ? 'text-accent' : 'text-bad') : 'text-warn'}">{t.level === 'bad' ? 'Fix this' : 'Worth a look'}</p>
				<h3 class="display text-[26px] leading-[1.05]">{t.title}</h3>
				<p class="text-sm {i === 0 ? 'text-white/60' : 'text-ink-2'}">{t.meaning}</p>
				<p class="mt-auto rounded-[16px] p-3 text-sm {i === 0 ? 'bg-accent text-accent-ink' : 'bg-tile'}">→ {t.action}</p>
			</div>
		{/each}
	</section>
{/if}

<section class="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
	<div class="card p-6">
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-lg font-medium">Daily active users</h2>
				<p class="text-sm text-muted">People who opened the app each day</p>
			</div>
			<SourceBadge state={usageState} />
		</div>
		<div class="mt-6"><BarChart data={a.dau} unit="users" /></div>
	</div>
	<div class="card flex flex-col p-6">
		<h2 class="text-lg font-medium">iOS vs Android</h2>
		<div class="mt-6 flex h-4 overflow-hidden rounded-full">
			{#each a.platforms as p, i (p.name)}<div class={i === 0 ? 'bg-ink' : 'bg-accent'} style="width:{(p.users / totalPlat) * 100}%"></div>{/each}
		</div>
		<div class="mt-5 grid grid-cols-2 gap-3">
			{#each a.platforms as p, i (p.name)}
				<div>
					<p class="flex items-center gap-2 text-sm"><span class="size-2.5 rounded-full {i === 0 ? 'bg-ink' : 'bg-accent'}"></span>{p.name}</p>
					<p class="big mt-1 text-[36px]">{Math.round((p.users / totalPlat) * 100)}%</p>
					<p class="text-xs text-muted">{n(p.users)} users</p>
				</div>
			{/each}
		</div>
		<div class="mt-auto pt-6">
			<p class="text-sm font-medium">Versions in use</p>
			<ul class="mt-2 space-y-1.5 text-sm">
				{#each a.versions as v, i (v.version)}
					<li class="flex items-center justify-between rounded-full px-4 py-2 {i === 0 ? 'bg-accent' : 'bg-tile'}"><span>{v.version}</span><span class="num">{Math.round((v.users / Math.max(1, a.versions.reduce((s, x) => s + x.users, 0))) * 100)}%</span></li>
				{/each}
			</ul>
		</div>
	</div>
</section>

<section class="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
	<div class="card p-6">
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-lg font-medium">Do people come back?</h2>
				<p class="text-sm text-muted">% of each week's new users still active N weeks later</p>
			</div>
			<SourceBadge state={usageState === 'google' ? 'demo' : usageState} />
		</div>
		<div class="mt-5 overflow-x-auto">
			<table class="w-full min-w-[460px] border-separate border-spacing-1.5 text-sm">
				<thead><tr class="text-xs text-muted"><th class="text-left font-medium">Joined</th><th class="font-medium">Users</th>{#each ['Week 0', 'Week 1', 'Week 2', 'Week 3', 'Week 4'] as w (w)}<th class="font-medium">{w}</th>{/each}</tr></thead>
				<tbody>
					{#each a.retention as r (r.cohort)}
						<tr>
							<td class="pr-2 whitespace-nowrap">{r.cohort}</td>
							<td class="num text-center text-muted">{n(r.size)}</td>
							{#each [0, 1, 2, 3, 4] as w (w)}
								<td class="h-11 rounded-xl text-center num {r.weeks[w] !== undefined ? cell(r.weeks[w]) : ''}">{r.weeks[w] !== undefined ? `${r.weeks[w]}%` : ''}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="mt-3 text-xs text-muted">Week-1 above 30% is good for most consumer apps.</p>
	</div>
	<div class="card p-6">
		<div class="flex items-start justify-between gap-3">
			<h2 class="text-lg font-medium">Most used screens</h2>
			<SourceBadge state={usageState} />
		</div>
		<div class="mt-5"><BarList items={a.screens.map((s) => ({ label: s.name, value: s.views }))} /></div>
	</div>
</section>

<section class="mt-4 grid gap-4 lg:grid-cols-[1fr_2fr]">
	<div class="card-dark flex flex-col gap-4 p-6">
		<h2 class="text-lg font-medium">Store ratings</h2>
		{#each [{ label: 'App Store', s: a.store.ios, src: a.source.ios }, { label: 'Google Play', s: a.store.android, src: a.source.android }] as { label, s, src } (label)}
			{#if s}
				<div class="rounded-[20px] bg-white/[.07] p-4">
					<div class="flex items-center justify-between"><p class="text-sm">{label}</p><SourceBadge state={src === 'live' ? 'google' : 'demo'} dark /></div>
					<p class="mt-2 flex items-baseline gap-3"><span class="big text-[48px]">{s.rating}</span><span class="text-accent">{stars(s.rating)}</span></p>
					<p class="text-xs text-white/50">{n(s.count)} ratings</p>
				</div>
			{/if}
		{/each}
		<p class="mt-auto text-xs text-white/50">Downloads need App Store Connect / Play Console access — coming next.</p>
	</div>
	<div class="card p-6">
		<h2 class="text-lg font-medium">Latest reviews</h2>
		<ul class="mt-4 grid gap-3 sm:grid-cols-2">
			{#each a.store.reviews as r, i (i)}
				<li class="rounded-[20px] p-4 {r.stars <= 2 ? 'bg-bad-bg' : 'bg-tile'}">
					<div class="flex items-center justify-between gap-2 text-xs">
						<span class="{r.stars <= 2 ? 'text-bad' : 'text-ink'} tracking-widest">{stars(r.stars)}</span>
						<span class="text-muted">{r.platform} · {r.date}</span>
					</div>
					<p class="mt-2 font-medium">{r.title}</p>
					<p class="mt-1 text-sm text-ink-2">{r.text}</p>
				</li>
			{/each}
		</ul>
	</div>
</section>
