<script lang="ts">
	import HeatmapViewer from '#lib/components/HeatmapViewer.svelte';
	import SourceBadge from '#lib/components/SourceBadge.svelte';
	import { n } from '#lib/format.ts';
	let { data } = $props();
	const h = $derived(data.heat);
	const base = $derived(`/app/clients/${data.client.id}/heatmaps`);
	const link = (o: Record<string, string>) => {
		const p = new URLSearchParams({ path: data.path, device: data.device, mode: data.mode, ...o });
		return `?${p}`;
	};
	const src = $derived(`${base}/snapshot?path=${encodeURIComponent(data.path)}&device=${data.device}`);
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
			<h2 class="display text-[40px] leading-none">See where people <em>click</em>.</h2>
			<p class="mt-3 text-white/60">Paste this one line before <code>&lt;/head&gt;</code> on {data.client.domain.replace(/^https?:\/\//, '')} (or in Google Tag Manager as a Custom HTML tag). Heatmaps appear after the first visits.</p>
			<ul class="mt-5 space-y-1.5 text-sm text-white/70">
				<li>✓ No cookies, no banner needed</li>
				<li>✓ Form fields are never recorded</li>
				<li>✓ Add <code>data-undercut-mask</code> to hide any private text</li>
			</ul>
		</div>
		<div class="flex flex-col justify-center gap-3">
			<pre class="overflow-x-auto rounded-[18px] bg-white/[.07] p-4 text-[13px] text-accent">{data.snippet}</pre>
			<button class="btn btn-accent self-start" onclick={copy}>{copied ? 'Copied ✓' : 'Copy snippet'}</button>
		</div>
	</section>
{/if}

<section class="mt-4 flex flex-wrap items-center gap-2">
	<select class="input w-auto py-2 pr-8 text-sm" onchange={(e) => (location.search = link({ path: e.currentTarget.value }))} aria-label="Page">
		{#each h.pages as p (p.path)}<option value={p.path} selected={p.path === data.path}>{p.path} · {n(p.views)} views</option>{/each}
	</select>
	<div class="flex rounded-full bg-white p-1 text-sm">
		<a href={link({ device: 'desktop' })} data-sveltekit-noscroll class="rounded-full px-3.5 py-1.5 {data.device === 'desktop' ? 'bg-ink text-white' : ''}">Desktop</a>
		<a href={link({ device: 'mobile' })} data-sveltekit-noscroll class="rounded-full px-3.5 py-1.5 {data.device === 'mobile' ? 'bg-ink text-white' : ''}">Mobile</a>
	</div>
	<div class="flex rounded-full bg-white p-1 text-sm">
		<a href={link({ mode: 'clicks' })} data-sveltekit-noscroll class="rounded-full px-3.5 py-1.5 {data.mode === 'clicks' ? 'bg-ink text-white' : ''}">Clicks</a>
		<a href={link({ mode: 'scroll' })} data-sveltekit-noscroll class="rounded-full px-3.5 py-1.5 {data.mode === 'scroll' ? 'bg-ink text-white' : ''}">Scroll</a>
	</div>
	<span class="ml-auto"><SourceBadge state={h.source === 'live' ? 'tracking' : h.source === 'demo' ? 'demo' : 'off'} /></span>
</section>

<section class="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
	<div class="card max-h-[86vh] overflow-y-auto p-3 sm:p-5">
		<HeatmapViewer {src} width={h.width} height={h.height} points={h.points} reach={h.reach} foldPx={h.foldPx} rage={h.rage} mode={data.mode} />
	</div>

	<aside class="flex flex-col gap-4">
		<div class="card grid grid-cols-2 gap-px overflow-hidden bg-line">
			<div class="bg-white p-5"><p class="text-xs text-muted">Views</p><p class="big mt-2 text-[36px]">{n(h.views)}</p></div>
			<div class="bg-white p-5"><p class="text-xs text-muted">Clicks</p><p class="big mt-2 text-[36px]">{n(h.totalClicks)}</p></div>
			<div class="bg-white p-5"><p class="text-xs text-muted">Reach mid-page</p><p class="big mt-2 text-[36px]">{h.reach[9]}%</p></div>
			<div class="bg-white p-5"><p class="text-xs text-muted">Reach the end</p><p class="big mt-2 text-[36px]">{h.reach[19]}%</p></div>
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

		{#if h.installed}
			<details class="card p-5 text-sm">
				<summary class="cursor-pointer font-medium">Tracking snippet</summary>
				<pre class="mt-3 overflow-x-auto rounded-[14px] bg-tile p-3 text-xs">{data.snippet}</pre>
				<button class="pill mt-3" onclick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
			</details>
		{/if}
	</aside>
</section>
