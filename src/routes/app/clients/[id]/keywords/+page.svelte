<script lang="ts">
	import { enhance } from '$app/forms';
	import { navigating } from '$app/state';
	import BarChart from '#lib/components/BarChart.svelte';
	import SourceBadge from '#lib/components/SourceBadge.svelte';
	let { data } = $props();

	const r = $derived(data.ideas);
	const trackedWeb = $derived(new Set(data.webKw?.tracked.map((t) => t.keyword) ?? []));
	const trackedApp = $derived(new Set(data.appKw?.tracked.map((t) => t.keyword) ?? []));
	let used = $state<Record<string, string>>({});
	let copied = $state<string | null>(null);
	let showAlpha = $state(false);

	async function useKeyword(k: string) {
		used[k] = '…';
		const res = await fetch('/api/fix', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clientId: data.client.id, action: 'keyword', keyword: k, publish: true }) });
		const j = await res.json().catch(() => ({}));
		used[k] = j.path ? `Live on ${j.path}` : 'Failed';
	}
	function copy(text: string) {
		navigator.clipboard?.writeText(text);
		copied = text;
		setTimeout(() => (copied = null), 1200);
	}
	function exportCsv() {
		const rows: string[][] = [['keyword', 'position', 'clicks', 'impressions']];
		if (data.mode === 'web') data.webKw?.tracked.forEach((t) => rows.push([t.keyword, String(t.position ?? ''), String(t.clicks), String(t.impressions)]));
		else data.appKw?.tracked.forEach((t) => rows.push([t.keyword, String(t.rank ?? ''), '', '']));
		r?.keywords.forEach((k) => rows.push([k.keyword, '', '', `~${k.volume}/month`]));
		const csv = rows.map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
		const a = document.createElement('a');
		a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
		a.download = `${data.client.id}-keywords.csv`;
		a.click();
	}
	const posClass = (p: number | null) => (p == null ? 'bg-tile text-muted' : p <= 3 ? 'bg-accent text-accent-ink' : p <= 10 ? 'bg-ink text-white' : 'bg-warn-bg text-warn');
	const qs = (extra: string) => `?mode=${data.mode}&days=${data.days}${extra}`;
</script>

<svelte:head><title>Keywords · {data.client.name} · Undercut</title></svelte:head>

{#snippet trackBtn(k: string, kind: 'web' | 'app', on: boolean)}
	{#if on}
		<span class="rounded-full bg-[#E4F5B8] px-3 py-1 text-xs text-accent-ink">★ Tracked</span>
	{:else}
		<form method="POST" action="?/track" use:enhance={() => async ({ update }) => update({ reset: false, invalidateAll: true })} class="inline">
			<input type="hidden" name="keyword" value={k} /><input type="hidden" name="kind" value={kind} />
			<button class="pill py-1 text-xs">☆ Track</button>
		</form>
	{/if}
{/snippet}

<!-- mode switch + market -->
<div class="flex flex-wrap items-center justify-between gap-3">
	{#if data.web && data.app}
		<div class="inline-flex rounded-full bg-white p-1 text-sm">
			<a href="?mode=web&days={data.days}" class="rounded-full px-4 py-2 {data.mode === 'web' ? 'bg-ink text-white' : ''}">🌐 Website · Google</a>
			<a href="?mode=app&days={data.days}" class="rounded-full px-4 py-2 {data.mode === 'app' ? 'bg-ink text-white' : ''}">📱 App · App Store</a>
		</div>
	{:else}
		<p class="label">{data.mode === 'web' ? 'Google keywords for the website' : 'App Store keywords for the app'}</p>
	{/if}
	<form method="POST" action="?/market" use:enhance={() => async ({ update }) => update({ reset: false, invalidateAll: true })} class="flex items-center gap-2 text-sm">
		<span class="text-muted">Market</span>
		<select name="lang" class="input w-auto py-1.5" onchange={(e) => e.currentTarget.form?.requestSubmit()}>{#each data.langs as l (l)}<option value={l} selected={data.lang === l}>{l.toUpperCase()}</option>{/each}</select>
		<select name="geo" class="input w-auto py-1.5" onchange={(e) => e.currentTarget.form?.requestSubmit()}>{#each data.geos as g (g)}<option value={g} selected={data.geo === g}>{g}</option>{/each}</select>
		<button class="pill py-1.5 text-xs" type="button" onclick={exportCsv}>Export CSV</button>
	</form>
</div>

{#if data.mode === 'web' && data.webKw}
	{@const kw = data.webKw}
	<!-- tracked -->
	<section class="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
		<div class="card p-4 sm:p-6">
			<div class="flex flex-wrap items-center justify-between gap-3 px-2">
				<div><h2 class="text-lg font-medium">Tracked keywords</h2><p class="text-sm text-muted">Position on Google, last {data.days} days.</p></div>
				<SourceBadge state={kw.source} />
			</div>
			<form method="POST" action="?/track" use:enhance class="mt-4 flex gap-2 px-2">
				<input type="hidden" name="kind" value="web" />
				<input name="keyword" class="input flex-1" placeholder="Add keywords, separated by commas" aria-label="Keyword to track" />
				<button class="btn btn-primary shrink-0">Track</button>
			</form>
			<div class="mt-4 overflow-x-auto">
				<table class="w-full min-w-[520px] text-sm">
					<thead><tr class="text-left text-xs text-muted"><th class="px-3 pb-2 font-medium">Keyword</th><th class="px-3 pb-2 font-medium">Position</th><th class="px-3 pb-2 font-medium">Clicks</th><th class="px-3 pb-2 font-medium">Seen</th><th class="px-3 pb-2"></th></tr></thead>
					<tbody>
						{#each kw.tracked as t (t.keyword)}
							{@const d = t.clicks - t.prevClicks}
							<tr class="border-t border-line">
								<td class="px-3 py-2.5 font-medium">{t.keyword}</td>
								<td class="px-3 py-2.5"><span class="rounded-full px-2.5 py-0.5 text-xs font-medium {posClass(t.position)}">{t.position ? `#${t.position}` : 'not in top 100'}</span></td>
								<td class="px-3 py-2.5">{t.clicks}{#if d}<span class="ml-1.5 text-[11px] {d > 0 ? 'text-good' : 'text-bad'}">{d > 0 ? '↑' : '↓'}{Math.abs(d)}</span>{/if}</td>
								<td class="px-3 py-2.5 text-muted">{t.impressions.toLocaleString('en-US')}</td>
								<td class="px-3 py-2.5 text-right whitespace-nowrap">
									{#if used[t.keyword]}<span class="rounded-full bg-accent px-3 py-1 text-xs text-accent-ink">✓ {used[t.keyword]}</span>
									{:else}<button class="btn btn-accent px-3 py-1 text-xs" onclick={() => useKeyword(t.keyword)} title="Publish a Google title + description with this keyword on the best page">⚡ Push</button>{/if}
									<form method="POST" action="?/untrack" use:enhance class="inline"><input type="hidden" name="kind" value="web" /><input type="hidden" name="keyword" value={t.keyword} /><button class="icon-btn ml-1 size-7 text-xs" aria-label="Stop tracking {t.keyword}">✕</button></form>
								</td>
							</tr>
						{:else}
							<tr><td colspan="5" class="px-3 py-6 text-center text-muted">No keywords yet — add one above or pick a quick win.</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<div class="rounded-[28px] bg-[#E4F5B8] p-6">
			<h2 class="text-lg font-medium">Quick wins</h2>
			<p class="text-sm text-ink-2">Already seen on Google at position 4–20. A better title pushes them up.</p>
			<ul class="mt-4 space-y-2">
				{#each kw.opportunities as o (o.key)}
					<li class="rounded-[18px] bg-white/80 p-3">
						<p class="flex items-center justify-between gap-2 text-sm"><span class="truncate font-medium">{o.key}</span><span class="shrink-0 rounded-full bg-warn-bg px-2 py-0.5 text-[11px] text-warn">#{o.position}</span></p>
						<p class="mt-0.5 text-xs text-muted">{o.impressions.toLocaleString('en-US')} times seen · {o.clicks} clicks</p>
						<div class="mt-2 flex flex-wrap gap-1.5">
							{#if used[o.key]}<span class="rounded-full bg-accent px-3 py-1 text-xs text-accent-ink">✓ {used[o.key]}</span>
							{:else}<button class="btn btn-accent px-3 py-1 text-xs" onclick={() => useKeyword(o.key)}>⚡ Push</button>{/if}
							{@render trackBtn(o.key, 'web', trackedWeb.has(o.key))}
						</div>
					</li>
				{:else}
					<li class="text-sm text-muted">No quick wins right now.</li>
				{/each}
			</ul>
		</div>
	</section>

	<!-- research -->
	<section class="card-dark relative mt-4 overflow-hidden p-6 sm:p-8">
		<div class="pointer-events-none absolute -right-20 -bottom-32 size-[320px] rounded-full bg-accent/80 blur-[2px]"></div>
		<div class="relative max-w-2xl">
			<p class="label text-white/50!">Find new keywords</p>
			<h2 class="display mt-2 text-[40px] leading-none sm:text-[56px]">What do people <em>search</em>?</h2>
			<form method="GET" class="mt-5">
				<input type="hidden" name="mode" value="web" /><input type="hidden" name="days" value={data.days} />
				<div class="flex gap-2 rounded-full bg-white p-1.5">
					<input name="q" value={data.q} placeholder="e.g. {data.client.name.split(' ')[0].toLowerCase()} bruxelles" class="min-w-0 flex-1 bg-transparent px-4 text-base text-ink outline-none" aria-label="Topic" />
					<button class="btn btn-primary shrink-0">{navigating.to ? 'Searching…' : 'Find'}</button>
				</div>
			</form>
		</div>
	</section>

	{#if r}
		<section class="card mt-4 p-4 sm:p-6">
			<div class="flex flex-wrap items-center justify-between gap-3 px-2">
				<div><h2 class="text-lg font-medium">Best keywords for “{r.keyword}”</h2><p class="text-sm text-muted">Monthly searches in {r.geo}. High volume + low competition = go.</p></div>
				<span class="rounded-full px-2.5 py-1 text-[11px] {r.volumeSource === 'dataforseo' ? 'bg-good-bg text-good' : 'bg-tile text-muted'}">{r.volumeSource === 'dataforseo' ? 'Live volumes' : 'Estimated volumes'}</span>
			</div>
			<div class="mt-4 overflow-x-auto">
				<table class="w-full min-w-[560px] text-sm">
					<thead><tr class="text-left text-xs text-muted"><th class="px-3 pb-3 font-medium">Keyword</th><th class="px-3 pb-3 font-medium">Searches / month</th><th class="px-3 pb-3 font-medium">Competition</th><th class="px-3 pb-3"></th></tr></thead>
					<tbody>
						{#each r.keywords as k, i (k.keyword)}
							{@const maxV = Math.max(...r.keywords.map((x) => x.volume), 1)}
							<tr class="border-t border-line">
								<td class="px-3 py-2.5 {i === 0 ? 'font-medium' : ''}">{k.keyword}</td>
								<td class="px-3 py-2.5"><div class="flex items-center gap-3"><span class="w-14 shrink-0 text-right">{k.volume.toLocaleString('en-US')}</span><span class="h-2 rounded-full {i === 0 ? 'bg-accent' : 'bg-ink'}" style="width:{Math.max(4, (k.volume / maxV) * 120)}px"></span></div></td>
								<td class="px-3 py-2.5"><span class="rounded-full px-2.5 py-0.5 text-xs {k.competition === 'low' ? 'bg-good-bg text-good' : k.competition === 'medium' ? 'bg-warn-bg text-warn' : 'bg-bad-bg text-bad'}">{k.competition}</span></td>
								<td class="flex justify-end gap-1 px-3 py-2.5 whitespace-nowrap">
									{@render trackBtn(k.keyword, 'web', trackedWeb.has(k.keyword))}
									{#if used[k.keyword]}<span class="rounded-full bg-accent px-3 py-1 text-xs text-accent-ink">✓ {used[k.keyword]}</span>
									{:else}<button class="btn btn-accent px-3 py-1 text-xs" onclick={() => useKeyword(k.keyword)}>⚡ Use</button>{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<section class="mt-4 grid gap-4 lg:grid-cols-[1.7fr_1fr]">
			<div class="card-dark p-6 sm:p-7">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<p class="text-sm text-white/50">Google Trends · {r.geo} · 12 months</p>
						<p class="mt-3 flex items-baseline gap-3"><span class="big text-[56px] {r.trend.change >= 0 ? 'text-accent' : 'text-[#ff8a80]'}">{r.trend.change >= 0 ? '+' : ''}{r.trend.change}%</span><span class="text-sm text-white/60">last 2 months vs the 2 before</span></p>
						{#if r.trend.peakMonth}<p class="mt-1 text-sm text-white/60">Peak in <span class="text-white">{r.trend.peakMonth}</span> — publish 4–6 weeks before.</p>{/if}
					</div>
					<SourceBadge state={r.trend.source} dark />
				</div>
				<div class="mt-6"><BarChart data={r.trend.points} unit="interest" height={160} dark /></div>
			</div>
			<div class="rounded-[28px] bg-[#E4F5B8] p-6">
				<div class="flex items-center justify-between gap-3"><h2 class="text-lg font-medium">Rising searches</h2><SourceBadge state={r.trend.source} /></div>
				<ul class="mt-4 space-y-1.5">
					{#each r.rising as x (x.query)}
						<li class="flex items-center justify-between gap-3 rounded-full bg-white/70 px-4 py-2 text-sm">
							<a class="truncate hover:underline" href={qs(`&q=${encodeURIComponent(x.query)}`)}>{x.query}</a>
							<span class="num shrink-0 rounded-full bg-ink px-2 py-0.5 text-[11px] text-accent">{x.value}</span>
						</li>
					{/each}
				</ul>
			</div>
		</section>

		<section class="mt-8">
			<h2 class="display text-[36px] sm:text-[48px]">Questions people <em>ask</em></h2>
			<p class="text-sm text-muted">Each one is a blog post, FAQ entry or page section. Click to copy.</p>
			<div class="mt-5 columns-1 gap-4 sm:columns-2 xl:columns-3">
				{#each r.questions as g, gi (g.group)}
					<div class="mb-4 break-inside-avoid p-5 {gi === 0 ? 'card-dark' : 'card'}">
						<p class="display text-[28px] leading-none {gi === 0 ? 'text-accent' : ''}">{g.group}…</p>
						<ul class="mt-3 space-y-1">
							{#each g.items as it (it)}<li><button class="w-full rounded-2xl px-3 py-2 text-left text-sm {gi === 0 ? 'hover:bg-white/10' : 'hover:bg-tile'}" onclick={() => copy(it)}>{copied === it ? 'Copied ✓' : it}</button></li>{/each}
						</ul>
					</div>
				{/each}
			</div>
		</section>

		<section class="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
			<div class="card p-6">
				<h2 class="text-lg font-medium">With, for, near…</h2>
				<div class="mt-4 grid gap-4 sm:grid-cols-2">
					{#each r.prepositions as g (g.group)}
						<div><p class="label">{r.keyword} <span class="text-ink">{g.group}</span>…</p><div class="mt-2 flex flex-wrap gap-1.5">{#each g.items as it (it)}<button class="rounded-full bg-tile px-3 py-1.5 text-sm hover:bg-ink hover:text-white" onclick={() => copy(it)}>{it}</button>{/each}</div></div>
					{/each}
				</div>
			</div>
			<div class="card p-6">
				<h2 class="text-lg font-medium">Comparisons</h2>
				<div class="mt-4 flex flex-wrap gap-1.5">{#each r.comparisons as it (it)}<button class="rounded-full border border-line px-3 py-1.5 text-sm hover:border-ink" onclick={() => copy(it)}>{it}</button>{:else}<p class="text-sm text-muted">None found.</p>{/each}</div>
			</div>
		</section>

		<section class="mt-8">
			<div class="flex flex-wrap items-end justify-between gap-3"><h2 class="display text-[36px] sm:text-[48px]">What already <em>ranks</em></h2><SourceBadge state={r.content.source} /></div>
			<ol class="card mt-4 divide-y divide-line">
				{#each r.content.items as it, i (it.url + i)}
					<li class="flex items-start gap-4 p-5">
						<span class="big w-8 shrink-0 text-[32px] {i === 0 ? '' : 'text-[#c4c4bf]'}">{i + 1}</span>
						<div class="min-w-0 flex-1"><p class="text-xs text-muted">{it.domain}{it.date ? ` · ${it.date}` : ''}</p><h3 class="mt-0.5 font-medium">{it.title}</h3><p class="mt-1 line-clamp-2 text-sm text-ink-2">{it.snippet}</p></div>
						{#if it.url !== '#'}<a href={it.url} target="_blank" rel="noreferrer" class="icon-btn shrink-0" aria-label="Open {it.title}">↗</a>{/if}
					</li>
				{/each}
			</ol>
		</section>

		<section class="mt-4">
			<button class="pill" onclick={() => (showAlpha = !showAlpha)}>{showAlpha ? 'Hide' : 'Show'} A–Z ideas ({r.alphabet.reduce((s, g) => s + g.items.length, 0)})</button>
			{#if showAlpha}
				<div class="card mt-4 grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-4">
					{#each r.alphabet as g (g.letter)}<div><p class="display text-3xl uppercase">{g.letter}</p><ul class="mt-1 space-y-0.5 text-sm text-ink-2">{#each g.items as it (it)}<li><button class="text-left hover:text-ink hover:underline" onclick={() => copy(it)}>{it}</button></li>{/each}</ul></div>{/each}
				</div>
			{/if}
		</section>
	{/if}
{:else if data.appKw}
	{@const kw = data.appKw}
	{#if !kw.hasIosId}
		<a href="/app/clients/{data.client.id}/settings" class="mt-4 flex items-center gap-3 rounded-[20px] bg-warn-bg p-4 text-sm text-warn"><span class="text-lg">⚠</span><span class="flex-1">Add the App Store ID in Setup to see where <b>{data.client.name}</b> ranks for each keyword.</span><span class="font-medium">Add it →</span></a>
	{/if}
	<section class="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
		<div class="card p-4 sm:p-6">
			<div class="flex flex-wrap items-center justify-between gap-3 px-2">
				<div><h2 class="text-lg font-medium">App Store keywords</h2><p class="text-sm text-muted">Where the app shows up when people search in the App Store ({kw.geo}).</p></div>
				<SourceBadge state={kw.tracked[0]?.source === 'appstore' ? 'google' : 'demo'} />
			</div>
			<form method="POST" action="?/track" use:enhance class="mt-4 flex gap-2 px-2">
				<input type="hidden" name="kind" value="app" />
				<input name="keyword" class="input flex-1" placeholder="Add store keywords, separated by commas" aria-label="App keyword to track" />
				<button class="btn btn-primary shrink-0">Track</button>
			</form>
			<ul class="mt-4 divide-y divide-line">
				{#each kw.tracked as t (t.keyword)}
					<li class="flex flex-wrap items-center gap-3 px-2 py-3">
						<span class="min-w-0 flex-1 truncate font-medium">{t.keyword}</span>
						<span class="rounded-full px-2.5 py-0.5 text-xs font-medium {posClass(t.rank)}">{t.rank ? `#${t.rank} in App Store` : kw.hasIosId ? 'not in top 100' : '—'}</span>
						<span class="flex -space-x-2" title="Top apps: {t.top.map((x) => x.name).join(', ')}">
							{#each t.top as a, i (i)}{#if a.icon}<img src={a.icon} alt={a.name} class="size-7 rounded-lg border-2 border-white" />{:else}<span class="grid size-7 place-items-center rounded-lg border-2 border-white bg-tile text-[10px]">{a.name.slice(0, 1)}</span>{/if}{/each}
						</span>
						<form method="POST" action="?/untrack" use:enhance><input type="hidden" name="kind" value="app" /><input type="hidden" name="keyword" value={t.keyword} /><button class="icon-btn size-7 text-xs" aria-label="Stop tracking {t.keyword}">✕</button></form>
					</li>
				{:else}
					<li class="px-2 py-6 text-center text-sm text-muted">No store keywords yet.</li>
				{/each}
			</ul>
		</div>
		<div class="card-dark p-6">
			<h2 class="text-lg font-medium">Find store keywords</h2>
			<p class="text-sm text-white/60">What people type before downloading an app like this one.</p>
			<form method="GET" class="mt-4">
				<input type="hidden" name="mode" value="app" />
				<div class="flex gap-2 rounded-full bg-white p-1.5"><input name="q" value={data.q} placeholder="e.g. {data.client.name.toLowerCase().split(' ').find((w) => w.length > 3 && w !== 'app') ?? 'fitness'} app" class="min-w-0 flex-1 bg-transparent px-3 text-sm text-ink outline-none" aria-label="App topic" /><button class="btn btn-accent shrink-0 px-4 py-1.5 text-sm">{navigating.to ? '…' : 'Find'}</button></div>
			</form>
			{#if data.appResearch}
				{@const ar = data.appResearch}
				<p class="mt-5 text-xs text-white/50">Top apps for “{ar.term}”</p>
				<ol class="mt-2 space-y-1.5">
					{#each ar.rank.top as a, i (i)}<li class="flex items-center gap-2 text-sm"><span class="w-4 text-white/40">{i + 1}</span>{#if a.icon}<img src={a.icon} alt="" class="size-6 rounded-md" />{/if}<span class="truncate">{a.name}</span></li>{/each}
				</ol>
				<p class="mt-5 text-xs text-white/50">Ideas · <SourceBadge state={ar.suggestSource === 'google' ? 'google' : 'demo'} dark /></p>
				<div class="mt-2 flex flex-wrap gap-1.5">
					{#each [ar.term, ...ar.ideas] as k (k)}
						{#if trackedApp.has(k)}<span class="rounded-full bg-accent px-3 py-1 text-xs text-accent-ink">★ {k}</span>
						{:else}
							<form method="POST" action="?/track" use:enhance={() => async ({ update }) => update({ reset: false, invalidateAll: true })}><input type="hidden" name="kind" value="app" /><input type="hidden" name="keyword" value={k} /><button class="rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/20">☆ {k}</button></form>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
	</section>
{/if}
