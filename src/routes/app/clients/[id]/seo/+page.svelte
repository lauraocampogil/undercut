<script lang="ts">
	import { enhance } from '$app/forms';
	import HealthRing from '#lib/components/HealthRing.svelte';
	import SourceBadge from '#lib/components/SourceBadge.svelte';
	let { data } = $props();
	const a = $derived(data.audit);
	let running = $state(false);
	let openIssue = $state<string | null>(null);
	const checked = $derived(new Date(a.checkedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }));
	const dot = { good: 'bg-good', warn: 'bg-[#E3A21A]', bad: 'bg-bad' };
	const vital = (v: number, good: number, ok: number) => (v <= good ? 'bg-accent text-accent-ink' : v <= ok ? 'bg-warn-bg text-warn' : 'bg-bad-bg text-bad');
	const flag = (ok: boolean) => (ok ? '✓' : '✕');
</script>

<svelte:head><title>SEO · {data.client.name}</title></svelte:head>

<section class="grid gap-4 lg:grid-cols-[1fr_2fr]">
	<div class="card-dark flex flex-col gap-6 p-6 sm:p-7">
		<div class="flex items-start justify-between gap-4">
			<div>
				<p class="text-sm text-white/50">SEO health</p>
				<p class="mt-1 text-sm">Checked automatically · {checked}</p>
			</div>
			<SourceBadge state={a.source === 'live' ? 'google' : 'demo'} dark />
		</div>
		<div class="flex items-center gap-5">
			<HealthRing score={a.score} size={104} dark />
			<div>
				<p class="display text-[34px] leading-none">{a.score >= 80 ? 'In good shape' : a.score >= 55 ? 'Needs work' : 'Urgent fixes'}</p>
				<p class="mt-2 text-sm text-white/60">{a.issues.filter((i) => i.level === 'bad').length} urgent · {a.issues.filter((i) => i.level === 'warn').length} to improve · {a.passed.length} passed</p>
			</div>
		</div>
		<p class="text-sm text-white/60">We read {a.pages.length} pages of {data.client.domain.replace(/^https?:\/\//, '')} (homepage + sitemap) every day. Nothing to type.</p>
		<form method="POST" action="?/rerun" class="mt-auto" use:enhance={() => { running = true; return async ({ update }) => { await update(); running = false; }; }}>
			<button class="btn btn-accent" disabled={running}>{running ? 'Checking…' : 'Check again now'}</button>
		</form>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<div class="card p-6">
			<h2 class="text-lg font-medium">Basics</h2>
			<ul class="mt-4 space-y-2 text-sm">
				{#each [['Secure (HTTPS)', a.site.https], ['robots.txt', a.site.robotsTxt], [`Sitemap · ${a.site.sitemapUrls} pages`, a.site.sitemap], ['Mobile-ready', a.pages.every((p) => p.viewport || p.status >= 400)]] as [l, ok] (l)}
					<li class="flex items-center justify-between rounded-full bg-tile px-4 py-2.5">
						<span>{l}</span><span class="grid size-6 place-items-center rounded-full text-xs {ok ? 'bg-accent text-accent-ink' : 'bg-bad-bg text-bad'}">{flag(Boolean(ok))}</span>
					</li>
				{/each}
			</ul>
		</div>
		<div class="card p-6">
			<div class="flex items-start justify-between gap-3">
				<div>
					<h2 class="text-lg font-medium">Speed on mobile</h2>
					<p class="text-sm text-muted">Google PageSpeed · homepage</p>
				</div>
				{#if a.speed}<SourceBadge state={a.speed.source === 'psi' ? 'google' : 'demo'} />{/if}
			</div>
			{#if a.speed}
				<p class="big mt-4 text-[56px]">{a.speed.performance}<span class="text-xl text-muted">/100</span></p>
				<div class="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
					<div class="rounded-2xl p-2.5 {vital(a.speed.lcp, 2.5, 4)}"><p class="text-base font-medium">{a.speed.lcp}s</p>main content</div>
					<div class="rounded-2xl p-2.5 {vital(a.speed.cls, 0.1, 0.25)}"><p class="text-base font-medium">{a.speed.cls}</p>layout shift</div>
					<div class="rounded-2xl p-2.5 {vital(a.speed.tbt, 200, 600)}"><p class="text-base font-medium">{a.speed.tbt}ms</p>blocking</div>
				</div>
			{:else}
				<p class="mt-4 text-sm text-muted">PageSpeed could not be reached this time.</p>
			{/if}
		</div>
	</div>
</section>

<section class="mt-10">
	<h2 class="display text-[40px] sm:text-[48px]">What to <em>fix</em></h2>
	<p class="text-sm text-muted">Each issue in plain words, why it matters and how to fix it. Click to see the pages.</p>
	<ul class="card mt-5 divide-y divide-line">
		{#each a.issues as i (i.id)}
			<li>
				<button class="flex w-full items-start gap-4 p-5 text-left sm:p-6" onclick={() => (openIssue = openIssue === i.id ? null : i.id)} aria-expanded={openIssue === i.id}>
					<span class="mt-1.5 size-2.5 shrink-0 rounded-full {dot[i.level]}"></span>
					<span class="min-w-0 flex-1">
						<span class="block font-medium">{i.title}</span>
						<span class="mt-1 block text-sm text-ink-2">{i.why}</span>
					</span>
					<span class="hidden max-w-[42%] rounded-[16px] bg-tile p-3 text-sm sm:block"><b class="font-medium">Fix:</b> {i.fix}</span>
					<span class="text-muted">{openIssue === i.id ? '−' : '+'}</span>
				</button>
				{#if openIssue === i.id}
					<div class="px-5 pb-5 sm:px-6 sm:pl-12">
						<p class="rounded-[16px] bg-tile p-3 text-sm sm:hidden"><b class="font-medium">Fix:</b> {i.fix}</p>
						{#if i.pages.length}
							<div class="mt-3 flex flex-wrap gap-1.5">
								{#each i.pages as p (p)}<a href={data.client.domain.replace(/\/$/, '') + p} target="_blank" rel="noreferrer" class="rounded-full border border-line px-3 py-1 text-xs hover:border-ink">{p} ↗</a>{/each}
							</div>
						{/if}
					</div>
				{/if}
			</li>
		{:else}
			<li class="p-8 text-center"><p class="display text-3xl">Nothing to fix ✓</p></li>
		{/each}
	</ul>
	{#if a.passed.length}
		<div class="mt-4 flex flex-wrap gap-1.5">
			{#each a.passed as p (p)}<span class="rounded-full bg-good-bg px-3 py-1 text-xs text-good">✓ {p}</span>{/each}
		</div>
	{/if}
</section>

<section class="card mt-10 p-4 sm:p-6">
	<h2 class="px-2 text-lg font-medium">Pages checked</h2>
	<div class="mt-4 overflow-x-auto">
		<table class="w-full min-w-[720px] text-sm">
			<thead>
				<tr class="text-left text-xs text-muted">
					<th class="px-3 pb-3 font-medium">Page</th>
					<th class="px-3 pb-3 font-medium">Title</th>
					<th class="px-3 pb-3 text-center font-medium">Status</th>
					<th class="px-3 pb-3 text-center font-medium">Description</th>
					<th class="px-3 pb-3 text-center font-medium">H1</th>
					<th class="px-3 pb-3 text-right font-medium">Words</th>
					<th class="px-3 pb-3 text-right font-medium">Load</th>
				</tr>
			</thead>
			<tbody>
				{#each a.pages as p (p.url)}
					<tr class="border-t border-line">
						<td class="px-3 py-3 font-medium">{p.path}</td>
						<td class="max-w-[260px] truncate px-3 py-3 text-ink-2" title={p.title}>{p.title || '—'} <span class="text-xs text-muted">{p.title ? `(${p.title.length})` : ''}</span></td>
						<td class="px-3 py-3 text-center"><span class="rounded-full px-2 py-0.5 text-xs {p.status >= 200 && p.status < 400 ? 'bg-tile' : 'bg-bad-bg text-bad'}">{p.status || 'timeout'}</span></td>
						<td class="px-3 py-3 text-center {p.desc ? '' : 'text-bad'}">{flag(Boolean(p.desc))}</td>
						<td class="px-3 py-3 text-center {p.h1 === 1 ? '' : 'text-bad'}">{p.h1}</td>
						<td class="num px-3 py-3 text-right {p.words < 250 ? 'text-warn' : ''}">{p.words}</td>
						<td class="num px-3 py-3 text-right {p.ms > 1800 ? 'text-warn' : 'text-ink-2'}">{(p.ms / 1000).toFixed(1)}s</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
