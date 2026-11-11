<script lang="ts">
	import { enhance } from '$app/forms';
	import HealthRing from '#lib/components/HealthRing.svelte';
	import Gauge from '#lib/components/Gauge.svelte';
	import SourceBadge from '#lib/components/SourceBadge.svelte';
	let { data } = $props();
	const a = $derived(data.audit);
	const lh = $derived(a.lighthouse);
	const w = $derived(a.w3c);
	let running = $state(false);
	let showCode = $state<string | null>(null);
	let tab = $state<'lighthouse' | 'w3c' | 'pages'>('lighthouse');
	let group = $state<string | null>(null);
	const checked = $derived(new Date(a.checkedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }));
	const dot = { good: 'bg-good', warn: 'bg-[#E3A21A]', bad: 'bg-bad' };
	const kindLabel = { title: 'Google title', description: 'Description', alt: 'Image text', canonical: 'Canonical', schema: 'Business info' };
	const pending = $derived(data.fixes.filter((f) => f.status === 'suggested'));
	const live = $derived(data.fixes.filter((f) => f.status === 'live'));
	const fixedSet = $derived(new Set(data.fixed));
	const openIssues = $derived(a.issues.filter((i) => !fixedSet.has(i.id)));
	const kindHelp = { title: 'The blue link in Google', description: 'The text under the link', alt: 'Describes images for Google', canonical: 'Avoids duplicate pages', schema: 'Address & hours in Google' };
	const groups = $derived(
		(['title', 'description', 'alt', 'canonical', 'schema'] as const)
			.map((k) => ({ kind: k, all: data.fixes.filter((f) => f.kind === k) }))
			.filter((g) => g.all.length)
			.map((g) => ({ ...g, live: g.all.filter((f) => f.status === 'live').length }))
	);
	const shown = $derived(data.fixes.filter((f) => f.kind === (group ?? groups.find((g) => g.live < g.all.length)?.kind ?? groups[0]?.kind)));
	const activeKind = $derived(shown[0]?.kind);
	const keep = () => async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => update({ reset: false });
</script>

<svelte:head><title>SEO · {data.client.name}</title></svelte:head>

<!-- 1 · Scores at a glance -->
<section class="grid gap-4 lg:grid-cols-[1fr_2fr_1fr]">
	<div class="card-dark flex flex-col justify-between gap-5 p-6">
		<div class="flex items-start justify-between">
			<p class="text-sm text-white/60">SEO health<br /><span class="text-xs text-white/40">auto · {checked}</span></p>
			<SourceBadge state={a.source === 'live' ? 'google' : 'demo'} dark />
		</div>
		<div class="flex items-center gap-4">
			<HealthRing score={a.score} size={92} dark />
			<div>
				<p class="big text-[40px]">{openIssues.length}</p>
				<p class="text-xs text-white/50">issues open</p>
			</div>
		</div>
		<form method="POST" action="?/rerun" use:enhance={() => { running = true; return async ({ update }) => { await update(); running = false; }; }}>
			<button class="btn btn-accent w-full" disabled={running}>{running ? 'Checking… (≈30 s)' : 'Check again'}</button>
		</form>
	</div>

	<div class="card flex flex-col p-6">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-medium">Lighthouse <span class="text-sm font-normal text-muted">· mobile</span></h2>
			{#if lh}<SourceBadge state={lh.source === 'psi' ? 'google' : 'demo'} />{/if}
		</div>
		{#if lh}
			<div class="my-auto grid grid-cols-2 gap-4 pt-5 sm:grid-cols-4">
				<Gauge score={lh.scores.performance} label="Performance" />
				<Gauge score={lh.scores.accessibility} label="Accessibility" />
				<Gauge score={lh.scores.bestPractices} label="Best practices" />
				<Gauge score={lh.scores.seo} label="SEO" />
			</div>
		{:else}
			<p class="my-auto text-sm text-muted">Lighthouse could not run this time — try “Check again”.</p>
		{/if}
	</div>

	<div class="card flex flex-col p-6">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-medium">W3C HTML</h2>
			{#if w}<SourceBadge state={w.source === 'live' ? 'google' : 'demo'} />{/if}
		</div>
		{#if w}
			<div class="my-auto grid grid-cols-2 gap-2 pt-5 text-center">
				<div class="rounded-[18px] p-3 {w.errors ? 'bg-bad-bg text-bad' : 'bg-good-bg text-good'}"><p class="big text-[40px]">{w.errors}</p><p class="text-xs">errors</p></div>
				<div class="tile p-3"><p class="big text-[40px]">{w.warnings}</p><p class="text-xs text-muted">warnings</p></div>
			</div>
		{:else}
			<p class="my-auto text-sm text-muted">Validator not reachable this time.</p>
		{/if}
	</div>
</section>

<!-- 2 · Fix it here -->
<section class="mt-10">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h2 class="display text-[40px] sm:text-[52px]">Fix it <em>here</em></h2>
			<p class="text-sm text-muted">Check the text, edit if needed, publish. It goes live on the site through the Undercut snippet — no CMS, no developer.</p>
		</div>
		<div class="flex flex-wrap gap-2">
			{#if live.length}<span class="pill border-0 bg-accent text-accent-ink">{live.length} live</span>{/if}
			{#if pending.length}
				<form method="POST" action="?/publishAll" use:enhance={keep}><button class="btn btn-primary">Publish all {pending.length}</button></form>
			{/if}
		</div>
	</div>

	{#if !data.snippetInstalled}
		<p class="mt-4 rounded-[18px] bg-warn-bg p-4 text-sm text-warn">Fixes go live through the Undercut snippet. <a class="font-medium underline" href="/app/clients/{data.client.id}/settings">Install it in Setup</a> (one line, same as heatmaps).</p>
	{/if}

	<!-- one tile per kind of fix: the whole job at a glance -->
	<div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
		{#each groups as g (g.kind)}
			{@const done = g.live === g.all.length}
			<button onclick={() => (group = g.kind)} class="flex flex-col gap-3 rounded-[24px] p-4 text-left transition-transform hover:-translate-y-0.5 {activeKind === g.kind ? 'bg-ink text-white' : done ? 'bg-[#E4F5B8]' : 'bg-white'}">
				<span class="flex items-center justify-between text-xs {activeKind === g.kind ? 'text-white/60' : 'text-muted'}">{kindHelp[g.kind]}{#if done}<span class="font-semibold text-good">✓</span>{/if}</span>
				<span class="big text-[40px]">{g.all.length}</span>
				<span class="text-sm font-medium">{kindLabel[g.kind]}{g.all.length > 1 && g.kind !== 'schema' ? 's' : ''}</span>
				<span class="h-1.5 overflow-hidden rounded-full {activeKind === g.kind ? 'bg-white/15' : 'bg-tile'}"><span class="block h-full rounded-full bg-accent" style="width:{(g.live / g.all.length) * 100}%"></span></span>
				<span class="text-[11px] {activeKind === g.kind ? 'text-white/60' : 'text-muted'}">{g.live}/{g.all.length} live</span>
			</button>
		{/each}
	</div>

	<ul class="mt-4 grid gap-3 lg:grid-cols-2">
		{#each shown as f (f.id)}
			<li class="flex flex-col gap-3 p-5 {f.status === 'live' ? 'rounded-[28px] bg-[#E4F5B8]' : 'card'}">
				<div class="flex items-center justify-between gap-2">
					<div class="flex min-w-0 items-center gap-2">
						<span class="rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-white">{kindLabel[f.kind]}</span>
						<span class="truncate text-xs text-muted">{f.path}{f.target ? ` · ${f.target.split('/').pop()}` : ''}</span>
					</div>
					<span class="shrink-0 text-[11px] {f.status === 'live' ? 'font-semibold text-good' : 'text-muted'}">{f.status === 'live' ? '● Live' : f.by === 'ai' ? 'AI suggestion' : 'Suggestion'}</span>
				</div>
				{#if f.current}<p class="text-sm text-muted line-through decoration-bad/60">{f.current}</p>{/if}
				<form method="POST" action="?/publish" use:enhance={keep} class="flex flex-col gap-3">
					<input type="hidden" name="id" value={f.id} />
					{#if f.kind === 'schema'}
						<textarea name="value" rows="7" class="input font-mono text-xs" spellcheck="false">{f.value}</textarea>
						<p class="text-xs text-muted">Fill in phone, address and opening hours, then publish.</p>
					{:else}
						<textarea name="value" rows={f.kind === 'description' ? 3 : 2} class="input resize-none rounded-[16px] text-sm" readonly={f.status === 'live'}>{f.value}</textarea>
						{#if f.kind === 'title' || f.kind === 'description'}
							{@const max = f.kind === 'title' ? 60 : 155}
							<p class="-mt-2 text-right text-[11px] {f.value.length > max ? 'text-bad' : 'text-muted'}">{f.value.length}/{max}</p>
						{/if}
					{/if}
					<div class="flex flex-wrap items-center gap-2">
						{#if f.status === 'live'}
							<button formaction="?/undo" class="pill">Undo</button>
						{:else}
							<button class="btn btn-primary py-2">Publish</button>
							<button formaction="?/save" class="pill">Save</button>
							<button formaction="?/dismiss" class="pill text-muted">Dismiss</button>
						{/if}
						<button type="button" class="ml-auto text-xs text-muted underline-offset-4 hover:text-ink hover:underline" onclick={() => (showCode = showCode === f.id ? null : f.id)}>{showCode === f.id ? 'Hide code' : 'Code for the CMS'}</button>
					</div>
					{#if showCode === f.id}<pre class="overflow-x-auto rounded-[14px] bg-ink p-3 text-xs text-accent">{f.code}</pre>{/if}
				</form>
			</li>
		{:else}
			<li class="card p-8 text-center lg:col-span-2"><p class="display text-3xl">Nothing to fix automatically ✓</p></li>
		{/each}
	</ul>
	{#if data.dismissed}
		<form method="POST" action="?/restore" use:enhance={keep} class="mt-3"><button class="text-xs text-muted hover:underline">Show {data.dismissed} dismissed suggestion{data.dismissed > 1 ? 's' : ''} again</button></form>
	{/if}
</section>

<!-- 3 · Every issue -->
<section class="mt-10">
	<h2 class="display text-[40px] sm:text-[48px]">All <em>issues</em></h2>
	<div class="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
		{#each a.issues as i (i.id)}
			{@const done = fixedSet.has(i.id)}
			<div class="flex flex-col gap-2 rounded-[22px] p-4 {done ? 'bg-[#E4F5B8]' : 'bg-white'}">
				<p class="flex items-start gap-2 font-medium leading-snug"><span class="mt-1.5 size-2 shrink-0 rounded-full {done ? 'bg-good' : dot[i.level]}"></span>{i.title}</p>
				<p class="text-xs text-ink-2">{done ? 'Fixed by Undercut — live on the site.' : i.fix}</p>
			</div>
		{/each}
		{#each a.passed as p (p)}
			<div class="flex items-center gap-2 rounded-[22px] bg-white/50 p-4 text-sm text-muted"><span class="text-good">✓</span>{p}</div>
		{/each}
	</div>
</section>

<!-- 4 · Details -->
<section class="card mt-10 p-4 sm:p-6">
	<div class="flex flex-wrap gap-2">
		<button class="pill {tab === 'lighthouse' ? 'pill-active' : ''}" onclick={() => (tab = 'lighthouse')}>Lighthouse details</button>
		<button class="pill {tab === 'w3c' ? 'pill-active' : ''}" onclick={() => (tab = 'w3c')}>W3C messages</button>
		<button class="pill {tab === 'pages' ? 'pill-active' : ''}" onclick={() => (tab = 'pages')}>Pages checked ({a.pages.length})</button>
	</div>

	{#if tab === 'lighthouse'}
		<ul class="mt-4 divide-y divide-line">
			{#each lh?.audits ?? [] as x (x.id)}
				<li class="flex flex-wrap items-center gap-3 px-2 py-3 text-sm">
					<span class="size-2 rounded-full {dot[x.level]}"></span>
					<span class="flex-1">{x.title}</span>
					{#if x.value}<span class="text-xs text-muted">{x.value}</span>{/if}
					<span class="rounded-full bg-tile px-2.5 py-0.5 text-[11px]">{x.category}</span>
				</li>
			{:else}
				<li class="p-4 text-sm text-muted">No failing audits.</li>
			{/each}
		</ul>
	{:else if tab === 'w3c'}
		<ul class="mt-4 divide-y divide-line">
			{#each w?.messages ?? [] as m, i (i)}
				<li class="px-2 py-3 text-sm">
					<p class="flex items-start gap-2"><span class="mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase {m.type === 'error' ? 'bg-bad-bg text-bad' : 'bg-warn-bg text-warn'}">{m.type}</span><span class="flex-1">{m.message}</span>{#if m.count > 1}<span class="text-xs text-muted">×{m.count}</span>{/if}</p>
					{#if m.extract}<code class="mt-1.5 block overflow-x-auto rounded-[10px] bg-tile px-3 py-1.5 text-xs text-ink-2">{m.line ? `L${m.line}  ` : ''}{m.extract}</code>{/if}
				</li>
			{:else}
				<li class="p-4 text-sm text-muted">No messages.</li>
			{/each}
		</ul>
	{:else}
		<div class="mt-4 overflow-x-auto">
			<table class="w-full min-w-[680px] text-sm">
				<thead><tr class="text-left text-xs text-muted"><th class="px-3 pb-3 font-medium">Page</th><th class="px-3 pb-3 font-medium">Title</th><th class="px-3 pb-3 text-center font-medium">Status</th><th class="px-3 pb-3 text-center font-medium">Description</th><th class="px-3 pb-3 text-center font-medium">H1</th><th class="px-3 pb-3 text-right font-medium">Words</th><th class="px-3 pb-3 text-right font-medium">Load</th></tr></thead>
				<tbody>
					{#each a.pages as p (p.url)}
						<tr class="border-t border-line">
							<td class="px-3 py-3 font-medium">{p.path}</td>
							<td class="max-w-[240px] truncate px-3 py-3 text-ink-2" title={p.title}>{p.title || '—'}</td>
							<td class="px-3 py-3 text-center"><span class="rounded-full px-2 py-0.5 text-xs {p.status >= 200 && p.status < 400 ? 'bg-tile' : 'bg-bad-bg text-bad'}">{p.status || 'timeout'}</span></td>
							<td class="px-3 py-3 text-center {p.desc ? '' : 'text-bad'}">{p.desc ? '✓' : '✕'}</td>
							<td class="px-3 py-3 text-center {p.h1 === 1 ? '' : 'text-bad'}">{p.h1}</td>
							<td class="px-3 py-3 text-right {p.words < 250 ? 'text-warn' : ''}">{p.words}</td>
							<td class="px-3 py-3 text-right {p.ms > 1800 ? 'text-warn' : 'text-ink-2'}">{(p.ms / 1000).toFixed(1)}s</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
