<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import { goto } from '$app/navigation';
	import { PRICE } from '#lib/pricing.ts';
	import { appT } from '#lib/app-i18n.ts';
	let { data } = $props();
	const t = $derived(appT(data.lang));
	const D = $derived(t.db);

	type Row = (typeof data.rows)[number];
	type SortKey = 'rank' | 'name' | 'rate' | 'reviews' | 'score';

	let q = $state('');
	let cat = $state('');
	let sort = $state<SortKey>('rate');
	let dir = $state<1 | -1>(-1);
	let shown = $state(25);

	const value = (r: Row, k: SortKey): number | string =>
		k === 'name' ? r.app.name.toLowerCase() : k === 'rate' ? (r.stats.reviews >= 30 ? (r.stats.complaintRate ?? -1) : -2) : k === 'reviews' ? r.stats.reviews : k === 'score' ? (r.score ?? -1) : r.rank;

	const list = $derived.by(() => {
		const s = q.trim().toLowerCase();
		const out = data.rows.filter(
			(r) =>
				(!cat || r.app.genre === cat) &&
				(!s || (!r.locked && (r.app.name.toLowerCase().includes(s) || (r.app.domain ?? '').includes(s) || (r.stats.topComplaint?.label ?? '').toLowerCase().includes(s) || r.competitors.some((c) => c.name.toLowerCase().includes(s)))))
		);
		return out.sort((a, b) => {
			// locked rows always after the open ones, so sorting never "reveals" anything
			if (a.locked !== b.locked) return a.locked ? 1 : -1;
			const x = value(a, sort);
			const y = value(b, sort);
			return (x < y ? -1 : x > y ? 1 : 0) * dir;
		});
	});
	const filtered = $derived(Boolean(q || cat));
	$effect(() => {
		q;
		cat;
		sort;
		shown = 25;
	});
	function by(k: SortKey) {
		if (sort === k) dir = dir === 1 ? -1 : 1;
		else (sort = k), (dir = k === 'name' || k === 'rank' ? 1 : -1);
	}
	const clear = () => ((q = ''), (cat = ''));
	const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));
	const medal = (i: number) => ['🥇', '🥈', '🥉'][i] ?? '';
</script>

<svelte:head><title>{D.title} · Undercut</title></svelte:head>

{#snippet th(k: SortKey, label: string, cls = '')}
	<th class="px-4 py-3 font-normal {cls}" aria-sort={sort === k ? (dir === 1 ? 'ascending' : 'descending') : 'none'}>
		<button class="inline-flex items-center gap-1 hover:text-ink {sort === k ? 'text-ink' : ''}" onclick={() => by(k)}>
			{label}<span class="text-[10px] {sort === k ? '' : 'opacity-0'}">{dir === 1 ? '▲' : '▼'}</span>
		</button>
	</th>
{/snippet}

<div class="flex flex-col gap-8">
	<header class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl font-medium tracking-tight">{D.title}</h1>
			<p class="mt-1 max-w-2xl text-sm text-ink-2">{D.intro}</p>
		</div>
		{#if !data.full}<a href="/app/settings/billing" class="btn btn-primary">{D.unlockAll(data.stats.products, PRICE.full)}</a>{/if}
	</header>

	<!-- the numbers first -->
	<dl class="grid grid-cols-3 gap-3">
		{#each [[fmt(data.stats.products), D.products], [fmt(data.stats.reviews), D.reviewsRead], [String(data.categories.length), D.categories]] as [n, l]}
			<div class="card p-5"><dt class="text-xs text-muted">{l}</dt><dd class="big mt-1 text-3xl">{n}</dd></div>
		{/each}
	</dl>

	<!-- search + category -->
	<section class="flex flex-col gap-3">
		<div class="flex flex-wrap items-center gap-2">
			<label class="relative min-w-[240px] flex-1">
				<span class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"><Icon name="search" size={16} /></span>
				<input class="input pl-10" placeholder={D.search} bind:value={q} />
			</label>
			<select class="input w-auto min-w-[200px]" bind:value={cat} aria-label="Category">
				<option value="">{D.allCats} ({data.stats.products})</option>
				{#each data.categories as c (c.name)}<option value={c.name}>{c.name} ({c.n})</option>{/each}
			</select>
		</div>
		<p class="text-sm text-muted" aria-live="polite">
			{D.count(list.filter((r) => !r.locked).length, cat, q)}
			{#if filtered}· <button class="underline" onclick={clear}>{D.clear}</button>{/if}
		</p>
	</section>

	<!-- the table -->
	<div class="card overflow-x-auto">
		<table class="w-full min-w-[860px] text-sm">
			<thead class="border-b border-line text-left text-xs text-muted">
				<tr>
					{@render th('rank', '#', 'w-14')}
					{@render th('name', D.product)}
					<th class="px-4 py-3 font-normal">{D.topComplaint}</th>
					{@render th('rate', D.bad, 'w-44')}
					{@render th('reviews', D.reviews, 'w-24')}
					<th class="w-36 px-4 py-3 font-normal">{D.competitors}</th>
				</tr>
			</thead>
			<tbody>
				{#each list.slice(0, shown) as r (r.slug)}
					{#if r.locked}
						<tr class="border-b border-line last:border-0">
							<td class="px-4 py-3 text-muted">{r.rank}</td>
							<td class="px-4 py-3" colspan="2"><span class="flex items-center gap-3 blur-[5px] select-none" aria-hidden="true"><span class="size-9 rounded-xl bg-tile"></span>{D.hidden}</span></td>
							<td class="px-4 py-3"><span class="flex items-center gap-2"><span class="h-1.5 w-20 rounded-full bg-tile"><span class="block h-full rounded-full bg-bad/70" style="width:{r.stats.complaintRate ?? 0}%"></span></span>{r.stats.complaintRate ?? '—'}%</span></td>
							<td class="px-4 py-3 text-muted">{r.stats.reviews}</td>
							<td class="px-4 py-3"><a href="/app/settings/billing" class="inline-flex items-center gap-1.5 text-xs underline"><Icon name="lock" size={13} />{D.unlock}</a></td>
						</tr>
					{:else}
						<tr class="group cursor-pointer border-b border-line last:border-0 hover:bg-[#fafaf8]" onclick={() => goto(`/app/database/${r.slug}`)}>
							<td class="px-4 py-3 text-muted">{medal(r.rank - 1) || r.rank}</td>
							<td class="px-4 py-3">
								<a href="/app/database/{r.slug}" class="flex min-w-0 items-center gap-3" onclick={(e) => e.stopPropagation()}>
									{#if r.app.icon}<img src={r.app.icon} alt="" class="size-9 shrink-0 rounded-xl border border-line" loading="lazy" />{:else}<span class="size-9 shrink-0 rounded-xl bg-tile"></span>{/if}
									<span class="min-w-0">
										<span class="flex items-center gap-1.5 font-medium group-hover:underline">{r.app.name}</span>
										<span class="block truncate text-xs text-muted">{r.app.genre}</span>
									</span>
								</a>
							</td>
							<td class="px-4 py-3">{#if r.stats.topComplaint}<span class="inline-block max-w-[220px] truncate rounded-full bg-bad-bg px-2.5 py-1 text-xs text-bad" title="{r.stats.topComplaint.share}% of its complaints">{r.stats.topComplaint.label}</span>{:else}<span class="text-muted">—</span>{/if}</td>
							<td class="px-4 py-3"><span class="flex items-center gap-2"><span class="h-1.5 w-20 rounded-full bg-tile"><span class="block h-full rounded-full bg-bad/70" style="width:{r.stats.complaintRate ?? 0}%"></span></span><span class="num font-medium">{r.stats.complaintRate ?? '—'}%</span></span></td>
							<td class="num px-4 py-3 text-ink-2">{r.stats.reviews}</td>
							<td class="px-4 py-3"><span class="flex -space-x-1.5">{#each r.competitors as c}{#if c.icon}<img src={c.icon} alt={c.name} title={c.name} class="size-6 rounded-lg border-2 border-white" loading="lazy" />{/if}{/each}</span></td>
						</tr>
					{/if}
				{:else}
					<tr><td colspan="6" class="px-4 py-14 text-center text-sm text-muted">{D.none} <button class="underline" onclick={clear}>{D.clear}</button> {D.or} <a href="/app/analyses?url={encodeURIComponent(q)}" class="underline">{D.analyse(q)}</a>.</td></tr>
				{/each}
			</tbody>
		</table>
		{#if list.length > shown}
			<button class="w-full border-t border-line px-5 py-3.5 text-sm text-ink-2 hover:bg-[#fafaf8]" onclick={() => (shown += 25)}>{D.more(list.length - shown)}</button>
		{/if}
	</div>
	<p class="-mt-4 text-xs text-muted">{D.legend}</p>

	{#if data.locked > 0}
		<div class="card flex flex-wrap items-center justify-between gap-4 p-6">
			<div>
				<p class="font-medium">{D.lockedN(data.locked)}</p>
				<p class="mt-1 text-sm text-ink-2">{D.lockedText(PRICE.paidAnalyses)}</p>
			</div>
			<a href="/app/settings/billing" class="btn btn-primary">{D.unlock} · {PRICE.full}</a>
		</div>
	{/if}
</div>
