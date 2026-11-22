<script lang="ts">
	import Delta from '#lib/components/Delta.svelte';
	import Sparkline from '#lib/components/Sparkline.svelte';
	import HealthRing from '#lib/components/HealthRing.svelte';
	import ArrowLink from '#lib/components/ArrowLink.svelte';
	import { n, pct } from '#lib/format.ts';
	let { data } = $props();
	let filter = $state<'all' | 'attention' | 'apps'>('all');
	const dot = { good: 'bg-good', warn: 'bg-[#E3A21A]', bad: 'bg-bad' };
	const rows = $derived(data.rows.filter((r) => (filter === 'attention' ? r.health.level !== 'good' : filter === 'apps' ? r.client.type !== 'web' : true)));
	const measured = (r: (typeof data.rows)[number]) => Boolean(r.main && (r.main.value || r.main.prev));
</script>

<svelte:head><title>Analytics · Undercut</title></svelte:head>

<header class="flex flex-wrap items-end justify-between gap-4">
	<div>
		<h1 class="text-[34px] leading-tight font-medium tracking-tight sm:text-[44px]">Analytics</h1>
		<p class="mt-1 max-w-xl text-sm text-ink-2">Your clients’ websites and apps: visits, leads, Google, heatmaps, SEO fixes, app users and reviews. Only real data from the tools you connect.</p>
	</div>
	<a href="/app/clients/new" class="btn btn-primary">+ Track a site or app</a>
</header>

{#if !data.rows.length}
	<div class="card mt-6 p-8 text-center">
		<p class="text-lg font-medium">Nothing tracked yet</p>
		<p class="mx-auto mt-2 max-w-md text-sm text-ink-2">Add a client’s website or app, then connect Google Analytics, Search Console, or the Undercut snippet for leads and heatmaps. Numbers appear as soon as data comes in.</p>
		<a href="/app/clients/new" class="btn btn-primary mt-5">Track my first site</a>
	</div>
{:else}
	<div class="mt-6 flex gap-2">
		{#each [['all', 'All', data.rows.length], ['attention', 'Needs attention', data.rows.filter((r) => r.health.level !== 'good').length], ['apps', 'Apps', data.rows.filter((r) => r.client.type !== 'web').length]] as [k, l, c] (k)}
			<button class="pill {filter === k ? 'pill-active' : ''}" onclick={() => (filter = k as typeof filter)}>{l} <span class="opacity-50">{c}</span></button>
		{/each}
	</div>
	<section class="mt-5 grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
		{#each rows as r (r.client.id)}
			<article class="card flex flex-col p-5 sm:p-6">
				<div class="flex items-start justify-between gap-3">
					<div class="flex min-w-0 items-center gap-3">
						<span class="grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold text-white" style="background:{r.client.color}">{r.client.name.slice(0, 1)}</span>
						<div class="min-w-0">
							<h2 class="truncate font-medium">{r.client.name}</h2>
							<p class="truncate text-xs text-muted">{r.client.type === 'app' ? 'App' : r.client.domain.replace(/^https?:\/\//, '')}{r.client.type === 'both' ? ' + app' : ''}</p>
						</div>
					</div>
					<ArrowLink href="/app/clients/{r.client.id}" label="Open {r.client.name}" />
				</div>
				<div class="mt-6 flex items-end justify-between gap-4">
					{#if r.main && measured(r)}
						<div>
							<p class="flex items-start gap-1.5"><span class="big text-5xl">{n(r.main.value)}</span>{#if r.main.prev}<Delta value={pct(r.main.value, r.main.prev)} />{/if}</p>
							<p class="mt-1 text-xs text-muted">{r.main.label}, last 28 days</p>
						</div>
					{:else if r.client.type !== 'app' && !r.linked.ga4}
						<div><p class="text-sm font-medium">Not linked to Google Analytics yet</p><a href="/app/clients/{r.client.id}/settings" class="text-xs text-ink-2 underline">{r.linked.google ? 'Pick its Analytics property' : 'Connect Google'}</a></div>
					{:else}
						<div><p class="text-sm font-medium">No visits recorded in 28 days</p><a href="/app/clients/{r.client.id}/settings" class="text-xs text-ink-2 underline">Check the tracking</a></div>
					{/if}
					<HealthRing score={r.health.score} size={58} />
				</div>
				{#if r.main && measured(r)}<div class="mt-4"><Sparkline data={r.main.daily} color="var(--color-ink)" width={320} height={40} /></div>{/if}
				<div class="mt-auto flex flex-wrap gap-1.5 border-t border-line pt-4">
					{#each r.areas as a (a.key)}
						<a href={a.href} class="inline-flex items-center gap-1.5 rounded-full bg-tile px-2.5 py-1 text-xs text-ink-2 hover:bg-[#e6e6e1]" title="{a.label}: {a.value} {a.sub}"><span class="size-1.5 rounded-full {dot[a.level]}"></span>{a.label.replace('Google ', '').replace(' health', '')}</a>
					{/each}
				</div>
				{#if r.tasks[0]}<a href="/app/clients/{r.client.id}" class="mt-3 truncate text-xs text-ink-2 hover:underline">→ {r.tasks[0].title}{r.tasks.length > 1 ? ` · +${r.tasks.length - 1}` : ''}</a>{/if}
				<div class="mt-3 border-t border-line pt-3 text-xs">
					{#if r.crmId}<a href="/app/crm/{r.crmId}" class="text-ink-2 hover:underline">Client record: contact, fee, tasks →</a>
					{:else}<form method="POST" action="?/addToClients"><input type="hidden" name="id" value={r.client.id} /><button class="text-ink-2 underline">Add to my clients</button></form>{/if}
				</div>
			</article>
		{/each}
	</section>
{/if}
