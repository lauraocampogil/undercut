<script lang="ts">
	import { enhance } from '$app/forms';
	import { act } from '#lib/act.ts';
	import Delta from '#lib/components/Delta.svelte';
	let { data } = $props();
	const t = $derived(data.t);
	const a = $derived(t.app);
	let filter = $state<'all' | 'bad' | 'good'>('all');
	const shown = $derived(t.reviews.filter((r) => (filter === 'bad' ? r.stars <= 2 : filter === 'good' ? r.stars >= 4 : true)).slice(0, 30));
	const daysAgo = (d: string) => Math.max(0, Math.round((Date.now() - Date.parse(d)) / 864e5));
	const weekAgo = $derived(t.history.find((h) => daysAgo(h.date) <= 7) ?? null);
	const newRatings = $derived(a && weekAgo ? a.count - weekAgo.count : 0);
	const maxStars = $derived(Math.max(1, ...t.stars));

	// rank chart (lower = better → inverted)
	const W = 720;
	const H = 200;
	const pts = $derived(t.history.filter((h) => h.rankCat != null).slice(-60));
	const worst = $derived(Math.max(10, ...pts.map((p) => p.rankCat!)));
	const path = $derived(pts.map((p, i) => `${i ? 'L' : 'M'}${((i / Math.max(1, pts.length - 1)) * W).toFixed(1)} ${(((p.rankCat! - 1) / (worst - 1 || 1)) * (H - 20) + 10).toFixed(1)}`).join(' '));
	const stars = (n: number) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
	const dot = { good: 'bg-good', warn: 'bg-[#E3A21A]', bad: 'bg-bad' };
</script>

<svelte:head><title>App Store · {data.client.name}</title></svelte:head>

{#if t.source === 'off'}
	<a href="/app/clients/{data.client.id}/settings" class="card-dark flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:p-8">
		<span class="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent text-2xl text-accent-ink">★</span>
		<span class="flex-1"><b class="block text-xl font-medium">Add the App Store ID to start tracking</b><span class="text-sm text-white/60">Chart position, rating, reviews, updates and competitors — every day, no login needed. The ID is the number in the App Store link (…/id<b class="text-white">1459969523</b>).</span></span>
		<span class="btn btn-accent shrink-0">Add it in Setup →</span>
	</a>
{:else if t.source === 'error'}
	<p class="rounded-[20px] bg-bad-bg p-4 text-sm text-bad">{t.error}</p>
{/if}

{#if a}
	<!-- header -->
	<section class="card flex flex-wrap items-center gap-4 p-5 sm:p-6">
		{#if a.icon}<img src={a.icon} alt="" class="size-16 rounded-[18px] border border-line" />{:else}<span class="grid size-16 place-items-center rounded-[18px] bg-tile text-2xl">📱</span>{/if}
		<div class="min-w-0 flex-1">
			<p class="truncate text-lg font-medium">{a.name}</p>
			<p class="truncate text-sm text-muted">{a.seller} · {a.genre} · v{a.version} · {a.price}</p>
		</div>
		<form method="POST" action={act('country')} use:enhance={() => async ({ update }) => update({ reset: false, invalidateAll: true })} class="flex items-center gap-2 text-sm">
			<span class="text-muted">Store</span>
			<select name="cc" class="input w-auto py-1.5" onchange={(e) => e.currentTarget.form?.requestSubmit()}>{#each data.countries as c (c)}<option value={c} selected={t.cc === c}>{c.toUpperCase()}</option>{/each}</select>
		</form>
		{#if a.url && a.url !== '#'}<a href={a.url} target="_blank" rel="noreferrer" class="pill">Open in App Store ↗</a>{/if}
		{#if t.source === 'demo'}<span class="rounded-full bg-[#E4F5B8] px-2.5 py-1 text-[11px]">Example data</span>{/if}
	</section>

	<!-- numbers -->
	<section class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
		<div class="card-dark p-5">
			<p class="text-sm text-white/60">Rank in {a.genre}</p>
			<p class="mt-3 flex items-start gap-2"><span class="big text-[48px] text-accent">{t.today?.rankCat ? `#${t.today.rankCat}` : '—'}</span>{#if t.today?.rankCat && t.prev?.rankCat}<Delta value={t.prev.rankCat - t.today.rankCat} suffix="" dark />{/if}</p>
			<p class="mt-1 text-xs text-white/50">{t.today?.rankCat ? `Top ${t.today.chart} · ${t.cc.toUpperCase()} · vs yesterday` : `Not in the top 200 ${t.today?.chart ?? 'free'} of ${t.cc.toUpperCase()} today`}</p>
		</div>
		<div class="card p-5">
			<p class="text-sm text-muted">Overall rank</p>
			<p class="mt-3 flex items-start gap-2"><span class="big text-[48px]">{t.today?.rankAll ? `#${t.today.rankAll}` : '—'}</span>{#if t.today?.rankAll && t.prev?.rankAll}<Delta value={t.prev.rankAll - t.today.rankAll} suffix="" />{/if}</p>
			<p class="mt-1 text-xs text-muted">All apps · top 200</p>
		</div>
		<div class="card p-5">
			<p class="text-sm text-muted">Rating</p>
			<p class="mt-3 big text-[48px]">{a.rating ? a.rating.toFixed(1) : '—'}<span class="text-[24px] text-[#E3A21A]">★</span></p>
			<p class="mt-1 text-xs text-muted">{a.count.toLocaleString('en-US')} ratings{newRatings > 0 ? ` · +${newRatings} this week` : ''}</p>
		</div>
		<div class="card p-5">
			<p class="text-sm text-muted">Last update</p>
			<p class="mt-3 big text-[48px]">{a.updated ? `${daysAgo(a.updated)}d` : '—'}</p>
			<p class="mt-1 text-xs text-muted">v{a.version}{a.updated ? ` · ${a.updated}` : ''}{a.updated && daysAgo(a.updated) > 90 ? ' · time for an update' : ''}</p>
		</div>
	</section>

	{#if data.tasks.length}
		<ul class="card mt-4 divide-y divide-line">
			{#each data.tasks as k (k.title)}
				<li class="flex items-start gap-3 px-5 py-4"><span class="mt-1.5 size-2.5 shrink-0 rounded-full {dot[k.level]}"></span><div class="min-w-0"><p class="font-medium">{k.title}</p><p class="text-sm text-ink-2">{k.meaning}</p><p class="mt-1 text-sm"><b>What to do:</b> {k.action}</p></div></li>
			{/each}
		</ul>
	{/if}

	<!-- history + versions -->
	<section class="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
		<div class="card p-6">
			<h2 class="text-lg font-medium">Rank in {a.genre}, day by day</h2>
			<p class="text-sm text-muted">Higher on the chart = better. One point per day.</p>
			{#if pts.length >= 2}
				<svg viewBox="0 0 {W} {H}" class="mt-5 h-52 w-full" preserveAspectRatio="none">
					{#each [0.25, 0.5, 0.75] as g (g)}<line x1="0" x2={W} y1={g * H} y2={g * H} stroke="#E3E3DE" stroke-dasharray="3 4" />{/each}
					<path d={path} fill="none" stroke="#0D0D0D" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
				</svg>
				<div class="mt-1 flex justify-between text-[11px] text-muted"><span>{pts[0].date}</span><span>best #{Math.min(...pts.map((p) => p.rankCat!))} · today #{pts.at(-1)!.rankCat}</span><span>{pts.at(-1)!.date}</span></div>
			{:else}
				<p class="mt-5 rounded-[18px] bg-tile p-5 text-sm text-ink-2">Undercut saves the position once a day. The curve appears from tomorrow{t.today?.rankCat ? '' : ' — as soon as the app enters the top 200 of its category'}.</p>
			{/if}
		</div>
		<div class="card p-6">
			<h2 class="text-lg font-medium">Updates</h2>
			<ol class="mt-4 space-y-3">
				{#each t.versions as v (v.version)}
					<li class="border-l-2 border-ink pl-3"><p class="text-sm font-medium">v{v.version} <span class="font-normal text-muted">· {v.date}</span></p>{#if v.notes}<p class="mt-0.5 line-clamp-3 text-xs text-ink-2">{v.notes}</p>{/if}</li>
				{:else}
					<li class="text-sm text-muted">Each new version is saved here with its release notes.</li>
				{/each}
			</ol>
		</div>
	</section>

	<!-- reviews -->
	<section class="mt-4 grid gap-4 lg:grid-cols-[1fr_2fr]">
		<div class="card p-6">
			<h2 class="text-lg font-medium">Recent reviews</h2>
			<p class="text-sm text-muted">Last {t.reviews.length} in the {t.cc.toUpperCase()} store.</p>
			<ul class="mt-5 space-y-2">
				{#each [5, 4, 3, 2, 1] as s (s)}
					<li class="flex items-center gap-3 text-sm"><span class="w-6 text-muted">{s}★</span><span class="h-2.5 flex-1 overflow-hidden rounded-full bg-tile"><span class="block h-full rounded-full {s >= 4 ? 'bg-good' : s === 3 ? 'bg-[#E3A21A]' : 'bg-bad'}" style="width:{(t.stars[s - 1] / maxStars) * 100}%"></span></span><span class="w-6 text-right num">{t.stars[s - 1]}</span></li>
				{/each}
			</ul>
		</div>
		<div class="card p-4 sm:p-6">
			<div class="flex flex-wrap items-center gap-2 px-2">
				{#each [['all', 'All'], ['bad', '1–2★ to answer'], ['good', '4–5★']] as [k, l] (k)}<button class="pill {filter === k ? 'pill-active' : ''}" onclick={() => (filter = k as typeof filter)}>{l}</button>{/each}
			</div>
			<ul class="mt-3 max-h-[480px] divide-y divide-line overflow-y-auto">
				{#each shown as r (r.id)}
					<li class="px-2 py-3">
						<p class="flex flex-wrap items-center gap-x-3 text-sm"><span class="{r.stars <= 2 ? 'text-bad' : 'text-[#E3A21A]'}">{stars(r.stars)}</span><b class="font-medium">{r.title}</b><span class="text-xs text-muted">{r.author} · v{r.version} · {r.date}</span></p>
						<p class="mt-1 text-sm text-ink-2">{r.text}</p>
					</li>
				{:else}
					<li class="px-2 py-6 text-center text-sm text-muted">No reviews here.</li>
				{/each}
			</ul>
		</div>
	</section>

	<!-- competitors -->
	<section class="card mt-4 p-4 sm:p-6">
		<div class="flex flex-wrap items-end justify-between gap-3 px-2">
			<div><h2 class="text-lg font-medium">Competitors</h2><p class="text-sm text-muted">Up to 5 apps, followed every day next to {a.name}.</p></div>
			<form method="GET" class="flex gap-2">
				<input name="q" value={data.q} class="input py-2 text-sm" placeholder="Search an app by name" aria-label="Search competitor" />
				<button class="btn btn-primary py-2 text-sm">Search</button>
			</form>
		</div>
		{#if data.results.length}
			<ul class="mt-3 flex flex-wrap gap-2 px-2">
				{#each data.results as r (r.id)}
					<li>
						<form method="POST" action={act('add')} use:enhance={() => async ({ update }) => update({ reset: false, invalidateAll: true })}>
							<input type="hidden" name="id" value={r.id} />
							<button class="flex items-center gap-2 rounded-full bg-tile py-1 pr-3 pl-1 text-sm hover:bg-[#E4F5B8]">{#if r.icon}<img src={r.icon} alt="" class="size-6 rounded-md" />{/if}{r.name} <span class="text-muted">+ Track</span></button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
		<div class="mt-4 overflow-x-auto">
			<table class="w-full min-w-[620px] text-sm">
				<thead><tr class="text-left text-xs text-muted"><th class="px-3 pb-2 font-medium">App</th><th class="px-3 pb-2 font-medium">Rank in category</th><th class="px-3 pb-2 font-medium">Rating</th><th class="px-3 pb-2 font-medium">Ratings</th><th class="px-3 pb-2 font-medium">Last update</th><th></th></tr></thead>
				<tbody>
					<tr class="border-t border-line bg-[#E4F5B8]/50">
						<td class="px-3 py-2.5 font-medium">{a.name} <span class="text-xs text-muted">(you)</span></td>
						<td class="px-3 py-2.5">{t.today?.rankCat ? `#${t.today.rankCat}` : '—'}</td>
						<td class="px-3 py-2.5">{a.rating.toFixed(1)}★</td>
						<td class="px-3 py-2.5">{a.count.toLocaleString('en-US')}</td>
						<td class="px-3 py-2.5">{a.updated ? `${daysAgo(a.updated)} days ago` : '—'}</td>
						<td></td>
					</tr>
					{#each t.competitors as c (c.app.id)}
						<tr class="border-t border-line">
							<td class="px-3 py-2.5"><span class="flex items-center gap-2">{#if c.app.icon}<img src={c.app.icon} alt="" class="size-7 rounded-lg" />{/if}<span class="truncate">{c.app.name}</span></span></td>
							<td class="px-3 py-2.5">{c.snap?.rankCat ? `#${c.snap.rankCat}` : '—'}{#if c.snap?.rankCat && c.prev?.rankCat}<span class="ml-1.5"><Delta value={c.prev.rankCat - c.snap.rankCat} suffix="" /></span>{/if}</td>
							<td class="px-3 py-2.5 {c.app.rating > a.rating ? 'text-bad' : ''}">{c.app.rating.toFixed(1)}★</td>
							<td class="px-3 py-2.5">{c.app.count.toLocaleString('en-US')}</td>
							<td class="px-3 py-2.5">{c.app.updated ? `${daysAgo(c.app.updated)} days ago` : '—'}</td>
							<td class="px-3 py-2.5 text-right">
								<form method="POST" action={act('remove')} use:enhance={() => async ({ update }) => update({ reset: false, invalidateAll: true })}><input type="hidden" name="id" value={c.app.id} /><button class="icon-btn size-7 text-xs" aria-label="Stop tracking {c.app.name}">✕</button></form>
							</td>
						</tr>
					{:else}
						<tr><td colspan="6" class="px-3 py-5 text-center text-muted">Search an app above to compare.</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
{/if}
