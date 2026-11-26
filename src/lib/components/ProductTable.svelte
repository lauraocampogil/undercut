<script lang="ts">
	// The database table (TrustMRR-style): every product analyzed on Undercut. Search, sort, 20 per page.
	import type { DbRow } from '#lib/review-types.ts';
	let { rows, href = (slug: string) => `/p/${slug}`, limit = 0, unlockHref = '/signup' }: { rows: DbRow[]; href?: (slug: string) => string; limit?: number; unlockHref?: string } = $props();
	const open = $derived(rows.filter((r) => !r.locked));
	const locked = $derived(rows.filter((r) => r.locked));

	let q = $state('');
	let sort = $state<'complaints' | 'fixes' | 'reviews' | 'new'>('complaints');
	let page = $state(1);
	const PER = 20;
	const SORTS = { complaints: 'Most bad reviews', fixes: 'Best fix score', reviews: 'Most reviews', new: 'Recently added' };

	const filtered = $derived.by(() => {
		const t = q.trim().toLowerCase();
		const list = open.filter((r) => !t || `${r.app.name} ${r.app.genre} ${r.app.seller} ${r.stats.topComplaint?.label ?? ''}`.toLowerCase().includes(t));
		const by = {
			complaints: (a: DbRow, b: DbRow) => (b.stats.complaintRate ?? -1) - (a.stats.complaintRate ?? -1),
			fixes: (a: DbRow, b: DbRow) => (b.score ?? -1) - (a.score ?? -1),
			reviews: (a: DbRow, b: DbRow) => b.stats.reviews - a.stats.reviews,
			new: (a: DbRow, b: DbRow) => b.updatedAt.localeCompare(a.updatedAt)
		}[sort];
		const sorted = [...list].sort(by).concat(t ? [] : locked);
		return limit ? sorted.slice(0, limit) : sorted;
	});
	const pages = $derived(Math.max(1, Math.ceil(filtered.length / PER)));
	const shown = $derived(filtered.slice((page - 1) * PER, page * PER));
	$effect(() => {
		q;
		sort;
		page = 1;
	});
</script>

<div class="flex flex-col gap-3">
	<div class="flex flex-wrap items-center gap-2">
		<input bind:value={q} placeholder="Search a product, a category or a complaint" class="min-w-0 flex-1 rounded-[10px] border border-line bg-white px-4 py-2 text-sm outline-none focus:border-ink" />
		<select bind:value={sort} class="select">
			{#each Object.entries(SORTS) as [k, v]}<option value={k}>{v}</option>{/each}
		</select>
	</div>

	<div class="card overflow-x-auto p-2">
		<table class="w-full min-w-[820px] text-sm">
			<thead>
				<tr class="text-left text-muted">
					<th class="p-3 font-normal">#</th>
					<th class="p-3 font-normal">Product</th>
					<th class="p-3 font-normal">Rating</th>
					<th class="p-3 font-normal" title="Share of store reviews with 1 to 3 stars">Bad reviews</th>
					<th class="p-3 font-normal">#1 complaint</th>
					<th class="p-3 font-normal" title="Only for products claimed by their team">Fix score</th>
					<th class="p-3 font-normal">Competitors</th>
				</tr>
			</thead>
			<tbody>
				{#each shown as r, i (r.slug)}
					{#if r.locked && (i === 0 || !shown[i - 1].locked)}
						<tr class="border-t border-line">
							<td colspan="7" class="p-0">
								<a href={unlockHref} class="flex flex-wrap items-center justify-between gap-3 bg-[#fafaf8] px-4 py-4">
									<span><span class="font-medium">{locked.length} more products</span> <span class="text-ink-2">— unlock the full database to see every product, its complaints and its competitors.</span></span>
									<span class="btn btn-primary">Unlock the database</span>
								</a>
							</td>
						</tr>
					{/if}
					{#if r.locked}
						<tr class="border-t border-line select-none" aria-hidden="true">
							<td class="p-3 text-muted num">{(page - 1) * PER + i + 1}</td>
							<td class="p-3"><span class="flex items-center gap-3 blur-[5px]"><span class="size-9 rounded-xl bg-black/10"></span><span><span class="block font-medium">Hidden product</span><span class="block text-xs text-muted">{r.app.genre}</span></span></span></td>
							<td class="p-3 blur-[5px] num">{r.app.rating ? `★ ${r.app.rating}` : '—'}</td>
							<td class="p-3 blur-[5px] num">{r.stats.complaintRate ?? '—'}%</td>
							<td class="p-3 blur-[5px]">Hidden complaint (00%)</td>
							<td class="p-3 blur-[5px] text-xs">Not claimed</td>
							<td class="p-3"><span class="flex gap-1 blur-[5px]"><span class="size-6 rounded-md bg-black/10"></span><span class="size-6 rounded-md bg-black/10"></span><span class="size-6 rounded-md bg-black/10"></span></span></td>
						</tr>
					{:else}
					<tr class="border-t border-line hover:bg-white/50">
						<td class="p-3 text-muted num">{(page - 1) * PER + i + 1}</td>
						<td class="p-3">
							<a href={href(r.slug)} class="flex items-center gap-3">
								{#if r.app.icon}<img src={r.app.icon} alt="" class="size-9 rounded-xl" loading="lazy" />{:else}<span class="size-9 rounded-xl bg-tile"></span>{/if}
								<span class="min-w-0"><span class="block truncate font-medium">{r.app.name}</span><span class="block truncate text-xs text-muted">{r.app.genre}</span></span>
							</a>
						</td>
						<td class="p-3 num">{r.app.rating ? `★ ${r.app.rating}` : '—'}</td>
						<td class="p-3 num">
							{#if r.stats.complaintRate !== null}
								<span class="flex items-center gap-2"><span class="h-1.5 w-14 overflow-hidden rounded-full bg-tile"><span class="block h-full bg-bad/70" style="width:{r.stats.complaintRate}%"></span></span>{r.stats.complaintRate}%</span>
							{:else}—{/if}
						</td>
						<td class="p-3 text-ink-2">{#if r.stats.topComplaint}{r.stats.topComplaint.label} <span class="text-muted">({r.stats.topComplaint.share}%)</span>{:else}—{/if}</td>
						<td class="p-3">{#if r.score !== null}<span class="font-medium">{r.score}%</span>{:else}<span class="text-xs text-muted">Not claimed</span>{/if}</td>
						<td class="p-3"><span class="flex items-center gap-1">{#each r.competitors as c}<a href={href(c.slug)} title={c.name}><img src={c.icon} alt={c.name} class="size-6 rounded-md" loading="lazy" /></a>{/each}</span></td>
					</tr>
					{/if}
				{:else}
					<tr><td colspan="7" class="p-6 text-center text-muted">{rows.length ? 'No product matches.' : 'The database is empty. Analyze a first product to fill it.'}</td></tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if pages > 1}
		<nav class="flex flex-wrap items-center justify-center gap-1 text-sm" aria-label="Pages">
			<button class="rounded-[10px] border border-line bg-white px-3 py-1.5 disabled:opacity-40" disabled={page === 1} onclick={() => page--}>←</button>
			{#each Array.from({ length: pages }, (_, i) => i + 1) as n}
				{#if n === 1 || n === pages || Math.abs(n - page) <= 2}
					<button class="size-9 rounded-[10px] border {n === page ? 'border-ink font-medium' : 'border-line text-ink-2'} bg-white" onclick={() => (page = n)}>{n}</button>
				{:else if Math.abs(n - page) === 3}<span class="px-1 text-muted">…</span>{/if}
			{/each}
			<button class="rounded-[10px] border border-line bg-white px-3 py-1.5 disabled:opacity-40" disabled={page === pages} onclick={() => page++}>→</button>
		</nav>
	{/if}
</div>
