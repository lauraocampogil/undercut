<script lang="ts">
	import { goto } from '$app/navigation';
	import HeatmapViewer from '#lib/components/HeatmapViewer.svelte';
	import SourceBadge from '#lib/components/SourceBadge.svelte';
	import { n } from '#lib/format.ts';
	let { data } = $props();
	const h = $derived(data.heat);
	const base = $derived(`/app/clients/${data.client.id}/heatmaps`);
	const link = (o: Record<string, string>) => `?${new URLSearchParams({ path: data.path, device: data.device, mode: data.mode, ...o })}`;
	const src = $derived(`${base}/snapshot?path=${encodeURIComponent(data.path)}&device=${data.device}`);
	const host = $derived(data.client.domain.replace(/^https?:\/\//, '').replace(/\/$/, ''));

	let filter = $state('');
	const shown = $derived(data.pages.filter((p) => p.path.toLowerCase().includes(filter.toLowerCase())).slice(0, 60));
	let custom = $state('');
	function openPath(e: SubmitEvent) {
		e.preventDefault();
		let p = custom.trim();
		if (!p) return;
		try {
			if (/^https?:/.test(p)) p = new URL(p).pathname;
		} catch {
			/* keep as typed */
		}
		goto(link({ path: p.startsWith('/') ? p : `/${p}` }), { reset: false });
		custom = '';
	}

	let copied = $state(false);
	function copy() {
		navigator.clipboard?.writeText(data.snippet);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<svelte:head><title>Heatmaps · {data.client.name}</title></svelte:head>

{#if !h.installed}
	<section class="card-dark grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_1.2fr]">
		<div>
			<h2 class="display text-[36px] leading-none sm:text-[40px]">See where people <em>click</em>.</h2>
			<p class="mt-3 text-white/60">Paste this line before <code>&lt;/head&gt;</code> on {host}. Clicks and scroll appear after the first real visits. Until then you can already browse the pages below.</p>
		</div>
		<div class="flex flex-col justify-center gap-3">
			<pre class="overflow-x-auto rounded-[18px] bg-white/[.07] p-4 text-[13px] text-accent">{data.snippet}</pre>
			<button class="btn btn-accent self-start" onclick={copy}>{copied ? 'Copied ✓' : 'Copy snippet'}</button>
		</div>
	</section>
{/if}

<section class="mt-4 grid gap-4 lg:grid-cols-[260px_1fr_300px]">
	<!-- 1. pick a page -->
	<aside class="card flex max-h-[86vh] flex-col p-3">
		<p class="px-2 pt-1 text-xs font-medium text-muted">1 · Pick a page</p>
		<input class="input mt-2 py-2 text-sm" placeholder="Search pages…" bind:value={filter} aria-label="Search pages" />
		<ul class="mt-2 flex-1 space-y-0.5 overflow-y-auto">
			{#each shown as p (p.path)}
				<li>
					<a href={link({ path: p.path })} data-sveltekit-noscroll class="flex items-center justify-between gap-2 rounded-[12px] px-3 py-2 text-sm {p.path === data.path ? 'bg-ink text-white' : 'hover:bg-tile'}">
						<span class="truncate">{p.path}</span>
						<span class="shrink-0 text-xs {p.path === data.path ? 'text-white/60' : 'text-muted'}">{p.views ? `${n(p.views)} views` : '—'}</span>
					</a>
				</li>
			{:else}
				<li class="px-3 py-2 text-sm text-muted">No page matches.</li>
			{/each}
		</ul>
		<form class="mt-2 flex gap-1.5 border-t border-line pt-3" onsubmit={openPath}>
			<input class="input py-2 text-sm" placeholder="/other-page" bind:value={custom} aria-label="Open another page" />
			<button class="btn btn-primary px-3 py-2 text-sm">Go</button>
		</form>
	</aside>

	<!-- 2. the page -->
	<div class="min-w-0">
		<div class="flex flex-wrap items-center gap-2">
			<p class="mr-auto truncate text-sm"><span class="text-muted">2 ·</span> <strong>{host}{data.path}</strong></p>
			<div class="flex rounded-full bg-white p-1 text-sm">
				<a href={link({ mode: 'clicks' })} data-sveltekit-noscroll class="rounded-full px-3.5 py-1.5 {data.mode === 'clicks' ? 'bg-ink text-white' : ''}">Clicks</a>
				<a href={link({ mode: 'scroll' })} data-sveltekit-noscroll class="rounded-full px-3.5 py-1.5 {data.mode === 'scroll' ? 'bg-ink text-white' : ''}">How far they scroll</a>
			</div>
			<div class="flex rounded-full bg-white p-1 text-sm">
				<a href={link({ device: 'desktop' })} data-sveltekit-noscroll class="rounded-full px-3.5 py-1.5 {data.device === 'desktop' ? 'bg-ink text-white' : ''}">Desktop</a>
				<a href={link({ device: 'mobile' })} data-sveltekit-noscroll class="rounded-full px-3.5 py-1.5 {data.device === 'mobile' ? 'bg-ink text-white' : ''}">Mobile</a>
			</div>
			<SourceBadge state={h.source === 'live' ? 'tracking' : h.source === 'demo' ? 'demo' : 'off'} />
		</div>
		{#if !data.captured}
			<p class="mt-3 rounded-[16px] bg-warn-bg p-3 text-sm text-warn">Live preview of the page. The exact capture (with menus, sliders and images loaded by scripts) replaces it after the first visit with the snippet.</p>
		{/if}
		{#if !h.views}
			<p class="mt-3 rounded-[16px] bg-tile p-3 text-sm text-ink-2">No visits recorded on this page yet{data.device === 'mobile' ? ' on mobile' : ''}. Clicks show here as soon as people visit it.</p>
		{/if}
		<div class="card mt-3 max-h-[80vh] overflow-y-auto p-3 sm:p-4">
			{#key src}
				<HeatmapViewer {src} width={h.width} height={h.height} points={h.points} reach={h.reach} foldPx={h.foldPx} rage={h.rage} mode={data.mode} />
			{/key}
		</div>
	</div>

	<!-- 3. what it means -->
	<aside class="flex flex-col gap-4">
		<p class="px-1 text-xs font-medium text-muted">3 · What it means</p>
		<div class="card p-5">
			<p class="text-sm text-ink-2">
				{#if h.views}
					<strong class="text-ink">{n(h.views)}</strong> views, <strong class="text-ink">{n(h.totalClicks)}</strong> clicks. <strong class="text-ink">{h.reach[9]}%</strong> of visitors scroll to the middle, <strong class="text-ink">{h.reach[19]}%</strong> reach the end.
				{:else}
					Nothing to read yet for this page.
				{/if}
			</p>
		</div>

		{#each data.tasks as t (t.title)}
			<div class="rounded-[24px] p-5 {t.level === 'bad' ? 'card-dark' : 'card'}">
				<p class="text-[11px] font-medium {t.level === 'bad' ? 'text-accent' : 'text-warn'}">{t.level === 'bad' ? 'Fix this' : 'Worth a look'}</p>
				<h3 class="mt-1 font-medium">{t.title}</h3>
				<p class="mt-1 text-sm {t.level === 'bad' ? 'text-white/60' : 'text-ink-2'}">{t.meaning}</p>
				<p class="mt-3 rounded-[16px] p-3 text-sm {t.level === 'bad' ? 'bg-accent text-accent-ink' : 'bg-tile'}">→ {t.action}</p>
			</div>
		{/each}

		<div class="card p-5">
			<h3 class="font-medium">Most clicked</h3>
			<ul class="mt-3 space-y-1.5 text-sm">
				{#each h.elements as e (e.label)}
					<li class="flex items-center justify-between gap-3 rounded-full bg-tile px-4 py-2">
						<span class="truncate">{e.label}</span>
						<span class="flex shrink-0 items-center gap-2">
							{#if !e.interactive}<span class="rounded-full bg-warn-bg px-2 text-[10px] text-warn">not a link</span>{/if}
							<span class="num">{n(e.clicks)}</span>
						</span>
					</li>
				{:else}
					<li class="text-muted">No clicks yet.</li>
				{/each}
			</ul>
		</div>
	</aside>
</section>
