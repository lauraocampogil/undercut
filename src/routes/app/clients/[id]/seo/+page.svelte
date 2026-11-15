<script lang="ts">
	import { act } from '#lib/act.ts';
	import Linkify from '#lib/components/Linkify.svelte';
	import { enhance } from '$app/forms';
	import HealthRing from '#lib/components/HealthRing.svelte';
	import Gauge from '#lib/components/Gauge.svelte';
	import SourceBadge from '#lib/components/SourceBadge.svelte';
	import FixButton from '#lib/components/FixButton.svelte';
	let { data } = $props();
	const a = $derived(data.audit);
	let device = $state<'mobile' | 'desktop'>('mobile');
	const lh = $derived(device === 'mobile' ? a.lighthouse : (a.lighthouseDesktop ?? null));
	const w = $derived(a.w3c);
	let running = $state(false);
	let showCode = $state<string | null>(null);
	let tab = $state<'lighthouse' | 'w3c' | 'pages'>('lighthouse');
	let group = $state<string | null>(null);
	let draft = $state<Record<string, string>>({});
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
	// live check: a real Chrome opens the client's page and reads what Google will see
	let checks = $state<Record<string, any>>({});
	$effect(() => {
		checks = { ...data.checks };
	});
	let checking = $state<string | null>(null);
	async function verify(path: string) {
		checking = path;
		const r = await fetch('/api/fix', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clientId: data.client.id, action: 'verify', path }) }).then((x) => x.json()).catch(() => null);
		if (r?.check) checks[path] = r.check;
		checking = null;
	}
	function liveState(f: { kind: string; path: string; target?: string; value: string }) {
		const c = checks[f.path];
		if (!c) return 'unchecked';
		if (!c.snippet) return 'nosnippet';
		const it = c.items.find((i: any) => i.kind === f.kind && (f.kind !== 'alt' || i.target === f.target));
		if (!it) return 'unchecked';
		return it.ok ? 'verified' : 'missing';
	}
	const ago = (iso: string) => {
		const m = Math.round((Date.now() - Date.parse(iso)) / 6e4);
		return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
	};
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
		<form method="POST" action={act('rerun')} use:enhance={() => { running = true; return async ({ update }) => { await update(); running = false; }; }}>
			<button class="btn btn-accent w-full" disabled={running}>{running ? 'Checking… (≈1 min)' : 'Check again'}</button>
		</form>
	</div>

	<div class="card flex flex-col p-6">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-medium">Lighthouse</h2>
			<div class="flex items-center gap-2">
				<div class="flex rounded-full bg-tile p-1 text-xs">
					<button class="rounded-full px-3 py-1 {device === 'mobile' ? 'bg-ink text-white' : ''}" onclick={() => (device = 'mobile')}>Mobile</button>
					<button class="rounded-full px-3 py-1 {device === 'desktop' ? 'bg-ink text-white' : ''}" onclick={() => (device = 'desktop')}>Desktop</button>
				</div>
				{#if lh}<SourceBadge state={lh.source === 'psi' ? 'google' : 'demo'} />{/if}
			</div>
		</div>
		{#if lh}
			<div class="flex flex-1 gap-5 pt-5">
				<div class="flex flex-1 flex-col gap-4">
					<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
						<Gauge score={lh.scores.performance} label="Performance" />
						<Gauge score={lh.scores.accessibility} label="Accessibility" />
						<Gauge score={lh.scores.bestPractices} label="Best practices" />
						<Gauge score={lh.scores.seo} label="SEO" />
					</div>
					{#if lh.metrics?.length}
						<ul class="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-line pt-3 text-xs sm:grid-cols-3">
							{#each lh.metrics as m (m.id)}
								<li class="flex items-center gap-1.5"><span class="size-2 shrink-0 rounded-full {dot[m.level]}"></span><span class="truncate text-muted">{m.label}</span><b class="ml-auto font-medium">{m.value}</b></li>
							{/each}
						</ul>
					{/if}
					<p class="mt-auto text-[11px] text-muted">
						{lh.engine === 'local' ? 'Real Lighthouse, run with Chrome on the Undercut server. ' : 'Real Lighthouse, run by Google PageSpeed Insights. '}{lh.testedAt ? `Tested ${new Date(lh.testedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}{lh.runs && lh.runs.length > 1 ? ` · median of ${lh.runs.length} runs (${lh.runs.join(', ')})` : ''} · scores move a few points between runs, like on Google.
						<a class="underline" href="https://pagespeed.web.dev/analysis?url={encodeURIComponent(lh.url ?? data.client.domain)}&form_factor={device}" target="_blank" rel="noreferrer">Open on PageSpeed Insights ↗</a>
					</p>
				</div>
				{#if lh.screenshot}
					<img src={lh.screenshot} alt="What Google saw on {device}" class="hidden w-28 shrink-0 self-start rounded-[12px] border border-line xl:block" />
				{/if}
			</div>
		{:else}
			<p class="my-auto text-sm text-muted"><Linkify text={a.errors?.lighthouse ?? 'Lighthouse could not run this time — try “Check again”.'} /></p>
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
			<p class="my-auto text-sm text-muted">{a.errors?.w3c ?? 'Validator not reachable this time.'}</p>
		{/if}
	</div>
</section>

<!-- 2 · Fix it here -->
<section class="mt-10">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h2 class="display text-[40px] sm:text-[52px]">Fix it <em>here</em></h2>
			<p class="max-w-2xl text-sm text-muted">Undercut read the site like Google does. Below: what Google can’t read well — with a suggestion for each. Edit if you want, click <b class="text-ink">Publish</b>: it goes live on the site through the Undercut snippet. No CMS, no developer.</p>
		</div>
		<div class="flex flex-wrap gap-2">
			{#if live.length}<span class="pill border-0 bg-accent text-accent-ink">{live.length} live</span>{/if}
			{#if pending.length}
				<form method="POST" action={act('publishAll')} use:enhance={keep}><button class="btn btn-primary">Publish all {pending.length}</button></form>
			{/if}
		</div>
	</div>

	{#if !data.snippetInstalled}
		<div class="mt-4 rounded-[18px] bg-bad-bg p-4 text-sm text-bad">
			<b>The snippet is not on {data.client.domain.replace(/^https?:\/\//, '')} yet</b> — published fixes are saved, but they are <b>not on the site</b> until it is installed.
			<a class="font-medium underline" href="/app/clients/{data.client.id}/settings">Copy it from Setup</a> and paste it before &lt;/head&gt; (one line, same as heatmaps). Then use “Check on the site”.
		</div>
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

	<ul class="mt-4 grid gap-3 {activeKind === 'alt' ? 'lg:grid-cols-2' : ''}">
		{#each shown as f (f.id)}
			{@const val = draft[f.id] ?? f.value}
			<li class="flex flex-col gap-4 p-5 sm:p-6 {f.status === 'live' ? 'rounded-[28px] bg-[#E4F5B8]' : 'card'}">
				<div class="flex items-center justify-between gap-2">
					<p class="text-sm"><span class="text-muted">Page</span> <a href="{data.client.domain.replace(/\/$/, '')}{f.path}" target="_blank" rel="noreferrer" class="font-medium underline-offset-4 hover:underline">{f.path} ↗</a></p>
					{#if f.status === 'live'}
						{@const st = liveState(f)}
						<span class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium {st === 'verified' ? 'bg-good text-white' : st === 'unchecked' ? 'bg-ink text-white' : 'bg-bad text-white'}">{st === 'verified' ? '✓ Verified on the site' : st === 'nosnippet' ? '✕ Snippet missing on this page' : st === 'missing' ? '✕ Not visible on the site yet' : 'Published'}</span>
					{:else}
						<span class="shrink-0 rounded-full bg-tile px-2.5 py-1 text-[11px] font-medium text-muted">{f.by === 'ai' ? '✦ Written by AI' : 'Suggestion'}</span>
					{/if}
				</div>
				<form method="POST" action={act('publish')} use:enhance={keep} class="flex flex-col gap-4">
					<input type="hidden" name="id" value={f.id} />
					{#if f.kind === 'alt'}
						<div class="grid gap-4 sm:grid-cols-[150px_1fr]">
							<a href={f.preview ?? f.target} target="_blank" rel="noreferrer" class="grid h-36 place-items-center overflow-hidden rounded-[18px] bg-tile" title="Open the image">
								{#if f.preview || f.target}<img src={f.preview ?? f.target} alt="" loading="lazy" class="max-h-full max-w-full object-contain" />{/if}
							</a>
							<div class="flex min-w-0 flex-col gap-2">
								<p class="text-xs text-muted">{f.context ? `Near “${f.context}”` : 'This image has no description.'}</p>
								<label class="text-xs font-medium" for="v-{f.id}">What does this image show?</label>
								<textarea id="v-{f.id}" name="value" rows="3" class="input resize-none rounded-[16px] text-sm" readonly={f.status === 'live'} oninput={(e) => (draft[f.id] = e.currentTarget.value)}>{f.value}</textarea>
								<p class="text-[11px] text-muted">Google and screen readers read this text instead of seeing the picture.</p>
							</div>
						</div>
					{:else if f.kind === 'title' || f.kind === 'description'}
						{@const t = f.kind === 'title' ? val : (data.titles[f.path] ?? data.client.name)}
						{@const d = f.kind === 'description' ? val : (data.descs[f.path] ?? '')}
						{@const max = f.kind === 'title' ? 60 : 155}
						<div class="grid gap-3 lg:grid-cols-2">
							<div class="rounded-[18px] bg-tile p-4">
								<p class="mb-2 text-[11px] font-medium tracking-wide text-muted uppercase">In Google now</p>
								<p class="truncate text-xs text-ink-2">{data.client.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')} › {f.path === '/' ? '' : f.path.slice(1)}</p>
								<p class="mt-0.5 text-lg leading-snug text-[#1a0dab] {f.kind === 'title' ? 'line-through decoration-bad/70' : ''}">{f.kind === 'title' ? f.current || '(no title — Google invents one)' : t}</p>
								<p class="mt-1 text-sm text-ink-2 {f.kind === 'description' ? 'line-through decoration-bad/70' : ''}">{f.kind === 'description' ? f.current || '(no description — Google picks random text from the page)' : d}</p>
							</div>
							<div class="rounded-[18px] border-2 border-accent bg-white p-4">
								<p class="mb-2 text-[11px] font-medium tracking-wide text-accent-ink uppercase">After publishing</p>
								<p class="truncate text-xs text-ink-2">{data.client.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')} › {f.path === '/' ? '' : f.path.slice(1)}</p>
								<p class="mt-0.5 text-lg leading-snug text-[#1a0dab]">{t}</p>
								<p class="mt-1 text-sm text-ink-2">{d}</p>
							</div>
						</div>
						<label class="flex items-center justify-between text-xs font-medium" for="v-{f.id}"><span>{f.kind === 'title' ? 'New Google title (the blue link)' : 'New description (the text under the link)'}</span><span class={val.length > max ? 'text-bad' : 'text-muted'}>{val.length}/{max}</span></label>
						<textarea id="v-{f.id}" name="value" rows={f.kind === 'description' ? 3 : 2} class="input -mt-2 resize-none rounded-[16px] text-sm" readonly={f.status === 'live'} oninput={(e) => (draft[f.id] = e.currentTarget.value)}>{f.value}</textarea>
					{:else if f.kind === 'canonical'}
						<p class="text-sm text-ink-2">Tells Google which address is the real one for this page, so <b>?utm=…</b> or <b>www.</b> versions don’t count as duplicates.</p>
						<input name="value" class="input text-sm" value={f.value} readonly={f.status === 'live'} />
					{:else}
						<p class="text-sm text-ink-2">Business info Google can show in results: address, phone, opening hours. Fill in the empty fields, then publish.</p>
						<textarea name="value" rows="8" class="input font-mono text-xs" spellcheck="false">{f.value}</textarea>
					{/if}
					<div class="flex flex-wrap items-center gap-2">
						{#if f.status === 'live'}
							<button type="button" class="btn btn-primary py-2" disabled={checking === f.path} onclick={() => verify(f.path)}>{checking === f.path ? 'Opening the page in Chrome…' : 'Check on the site'}</button>
							<button formaction={act('undo')} class="pill">Undo</button>
							{#if checks[f.path]}<span class="text-[11px] text-muted">checked {ago(checks[f.path].at)}</span>{/if}
						{:else}
							<button class="btn btn-primary py-2">Publish</button>
							<button formaction={act('save')} class="pill">Save</button>
							<button formaction={act('dismiss')} class="pill text-muted">Not needed</button>
						{/if}
						<button type="button" class="ml-auto text-xs text-muted underline-offset-4 hover:text-ink hover:underline" onclick={() => (showCode = showCode === f.id ? null : f.id)}>{showCode === f.id ? 'Hide code' : 'Code for the developer'}</button>
					</div>
					{#if showCode === f.id}<pre class="overflow-x-auto rounded-[14px] bg-ink p-3 text-xs text-accent">{f.code}</pre>{/if}
					{#if f.status === 'live' && checks[f.path] && liveState(f) !== 'verified'}
						{@const c = checks[f.path]}
						{@const it = c.items.find((i: any) => i.kind === f.kind && (f.kind !== 'alt' || i.target === f.target))}
						<p class="rounded-[14px] bg-white/70 p-3 text-xs text-ink-2">{c.error ?? (it ? `On the page right now: “${it.found ?? 'nothing'}”. The site may cache pages for a few minutes — check again shortly.` : 'This fix was not part of the last check — check again.')}</p>
					{/if}
				</form>
			</li>
		{:else}
			<li class="card p-8 text-center"><p class="display text-3xl">Nothing to fix automatically ✓</p></li>
		{/each}
	</ul>
	{#if data.dismissed}
		<form method="POST" action={act('restore')} use:enhance={keep} class="mt-3"><button class="text-xs text-muted hover:underline">Show {data.dismissed} dismissed suggestion{data.dismissed > 1 ? 's' : ''} again</button></form>
	{/if}
</section>

<!-- 3 · Every issue -->
<section class="mt-10">
	<h2 class="display text-[40px] sm:text-[48px]">All <em>issues</em></h2>
	<div class="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
		{#each a.issues as i (i.id)}
			{@const done = fixedSet.has(i.id)}
			<div class="flex flex-col gap-3 rounded-[22px] p-4 {done ? 'bg-[#E4F5B8]' : 'bg-white'}">
				<p class="flex items-start gap-2 font-medium leading-snug"><span class="mt-1.5 size-2 shrink-0 rounded-full {done ? 'bg-good' : dot[i.level]}"></span>{i.title}</p>
				<div class="mt-auto flex items-center justify-between gap-2">
					<p class="truncate text-xs text-muted">{done ? 'Live on the site' : i.pages.slice(0, 2).join(', ')}</p>
					{#if !done}<FixButton clientId={data.client.id} issueId={i.id} problem={i.title} detail={i.why} size="sm" />{/if}
				</div>
			</div>
		{/each}
		{#each a.passed as p (p)}
			<div class="flex items-center gap-2 rounded-[22px] bg-white/50 p-4 text-sm text-muted"><span class="text-good">✓</span>{p}</div>
		{/each}
	</div>
</section>

{#if a.console?.items.length}
	<section class="card-dark mt-10 p-6">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h2 class="text-lg font-medium">Browser console · {a.console.items.length} error{a.console.items.length > 1 ? 's' : ''}</h2>
			<FixButton clientId={data.client.id} problem="JavaScript errors in the browser console" detail={a.console.items.map((x) => x.message).join(' | ')} dark size="sm" />
		</div>
		<ul class="mt-4 space-y-2">
			{#each a.console.items as e, i (i)}
				<li class="rounded-[16px] bg-white/[.07] px-4 py-3 font-mono text-xs"><span class="text-[#ff8a80]">{e.message}</span>{#if e.source}<span class="mt-1 block text-white/40">{e.source}</span>{/if}</li>
			{/each}
		</ul>
	</section>
{/if}

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
					<FixButton clientId={data.client.id} issueId={x.id === 'meta-description' ? 'desc' : x.id === 'image-alt' ? 'alt' : x.id === 'document-title' ? 'title-missing' : x.id === 'canonical' ? 'canonical' : undefined} problem={x.title} detail={x.value ?? ''} size="sm" />
				</li>
			{:else}
				<li class="p-4 text-sm text-muted">No failing audits.</li>
			{/each}
		</ul>
	{:else if tab === 'w3c'}
		<ul class="mt-4 divide-y divide-line">
			{#each w?.messages ?? [] as m, i (i)}
				<li class="px-2 py-3 text-sm">
					<div class="flex items-start gap-2"><span class="mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase {m.type === 'error' ? 'bg-bad-bg text-bad' : 'bg-warn-bg text-warn'}">{m.type}</span><span class="flex-1">{m.message}</span>{#if m.count > 1}<span class="text-xs text-muted">×{m.count}</span>{/if}<FixButton clientId={data.client.id} problem={`W3C: ${m.message}`} detail={m.extract ?? ''} size="sm" /></div>
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
