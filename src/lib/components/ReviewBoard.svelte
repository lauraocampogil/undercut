<script lang="ts">
	// The comparison board, shared by the private analysis (editable) and the public product page.
	import { SOURCES, type Analysis, type ProductData, type FixStatus, type Source } from '#lib/review-types.ts';
	let { a, verified, editable = false, start = 'themes', theme: firstTheme = '' }: { a: Analysis; verified: Record<string, boolean>; editable?: boolean; start?: 'themes' | 'reviews'; theme?: string } = $props();

	const products = $derived([a.main, ...a.competitors]);
	const n = (p: ProductData, id: string) => p.reviews.filter((r) => r.theme === id).length;
	const rows = (type: 'complaint' | 'praise') =>
		a.themes
			.filter((t) => t.type === type)
			.map((t) => ({ ...t, counts: products.map((p) => n(p, t.id)) }))
			.filter((t) => t.counts.some((c) => c > 0))
			.sort((x, y) => y.counts.reduce((s, c) => s + c, 0) - x.counts.reduce((s, c) => s + c, 0));
	const complaints = $derived(rows('complaint'));
	const praise = $derived(rows('praise'));
	const max = $derived(Math.max(1, ...complaints.flatMap((t) => t.counts), ...praise.flatMap((t) => t.counts)));

	const STATUS: Record<FixStatus, string> = { none: '—', known: 'Known', working: 'Working on it', fixed: 'Fixed' };
	const fixOf = (id: string) => a.main.fixes?.[id];
	// what the main product fixed (verified) while competitors' users still complain about it
	const fixedBy = $derived(complaints.filter((t) => verified[t.id] && t.counts.slice(1).some((c) => c > 0)));

	// svelte-ignore state_referenced_locally
	let view = $state<'themes' | 'reviews'>(firstTheme ? 'reviews' : start);
	let who = $state(0);
	let stars = $state(0);
	let source = $state<Source | ''>('');
	// svelte-ignore state_referenced_locally
	let theme = $state(firstTheme);
	let editing = $state<string | null>(null);
	let pageNo = $state(1);
	const PER = 10;
	const shown = $derived(products[who].reviews.filter((r) => (!stars || r.stars === stars) && (!theme || r.theme === theme) && (!source || (r.source ?? 'appstore') === source)));
	const srcLine = (p: ProductData) => Object.entries(p.sources ?? {}).filter(([, n]) => n).map(([s, n]) => `${SOURCES[s as Source] ?? s} ${n}`).join(' · ');
	const pages = $derived(Math.max(1, Math.ceil(shown.length / PER)));
	const pageItems = $derived(shown.slice((pageNo - 1) * PER, pageNo * PER));
	$effect(() => {
		who;
		stars;
		theme;
		source;
		pageNo = 1;
	});
	// visual overview: share of each product's reviews that complain, and the main product's top topics vs competitors
	const pct = (c: number, p: ProductData) => (p.reviews.length ? (c / p.reviews.length) * 100 : 0);
	const SHADES = ['#111111', '#2f6fed', '#f08a24', '#18a058']; // the product in black, each competitor in its own colour
	const overview = $derived(
		products.map((p, i) => {
			const bad = complaints.reduce((s, t) => s + t.counts[i], 0);
			const worst = [...complaints].sort((x, y) => y.counts[i] - x.counts[i])[0];
			return { p, i, share: pct(bad, p), worst: worst && worst.counts[i] ? worst.label : null };
		})
	);
	const top = $derived(complaints.slice(0, 6).map((t) => ({ t, shares: t.counts.map((c, i) => pct(c, products[i])) })));
	const topMax = $derived(Math.max(5, ...top.flatMap((x) => x.shares)));
	const labelOf = (id?: string) => a.themes.find((t) => t.id === id)?.label;
	const openTheme = (id: string, i = 0) => ((theme = id), (who = i), (stars = 0), (view = 'reviews'));
</script>

<div class="flex flex-col gap-4">
	<div class="inline-flex self-start rounded-[10px] border border-line bg-white p-1 text-sm">
		<button class="rounded-[7px] px-3 py-1.5 {view === 'themes' ? 'bg-black/[0.06] font-medium' : 'text-ink-2'}" onclick={() => (view = 'themes')}>By theme</button>
		<button class="rounded-[7px] px-3 py-1.5 {view === 'reviews' ? 'bg-black/[0.06] font-medium' : 'text-ink-2'}" onclick={() => (view = 'reviews')}>All reviews</button>
	</div>

	{#if view === 'themes'}
		{#if fixedBy.length}
			<div class="card flex flex-col gap-1 p-5 text-sm">
				<p class="tag">Fixed by {a.main.app.name}</p>
				{#each fixedBy as t}<p><span class="font-medium">{t.label}</span> — fixed and verified ✓. Users of {a.competitors.filter((_, i) => t.counts[i + 1] > 0).map((c) => c.app.name).join(', ')} still complain about it.</p>{/each}
			</div>
		{/if}
		<p class="text-sm text-ink-2">Each row is a topic users talk about. The numbers say how many reviews and posts mention it, for {a.main.app.name} and each competitor.</p>
		<div class="card overflow-x-auto p-2">
			<table class="w-full min-w-[720px] text-sm">
				<thead>
					<tr class="text-left">
						<th class="p-3 font-normal text-muted">Theme</th>
						{#each products as p, i}
							<th class="p-3 font-normal">
								<span class="flex items-center gap-2"><img src={p.app.icon} alt="" class="size-7 rounded-lg" /><span class="truncate {i === 0 ? 'font-semibold' : ''}">{p.app.name}</span></span>
								<span class="mt-1 block text-xs text-muted">{p.app.rating ? `★ ${p.app.rating} · ` : ''}{p.reviews.length} read</span>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					<tr><td colspan={products.length + 1} class="px-3 pt-4 pb-1"><span class="tag">What users hate</span></td></tr>
					{#each complaints as t (t.id)}
						<tr class="border-t border-line align-top">
							<td class="p-3 font-medium">{t.label}</td>
							{#each t.counts as c, i}
								<td class="p-3">
									<button class="flex w-full items-center gap-2 text-left disabled:cursor-default" disabled={!c} onclick={() => openTheme(t.id, i)}>
										<span class="h-2 rounded-full bg-bad/70" style="width:{Math.max(c ? 6 : 0, (c / max) * 90)}px"></span>
										<span class="num {c ? '' : 'text-muted'}">{c}</span>
									</button>
									{#if i === 0}
										{@const f = fixOf(t.id)}
										{#if f && f.status !== 'none'}
											<p class="mt-1 text-xs {f.status === 'fixed' ? (verified[t.id] ? 'text-good' : 'text-warn') : 'text-muted'}">
												{STATUS[f.status]}{f.version ? ` in ${f.version}` : ''}{f.status === 'fixed' ? (verified[t.id] ? ' · verified ✓' : ' · verifying') : ''}
											</p>
										{/if}
										{#if editable}
											{#if editing === t.id}
												<form method="POST" action="?/fix" class="mt-2 flex flex-col gap-1.5" onsubmit={() => (editing = null)}>
													<input type="hidden" name="theme" value={t.id} />
													<select name="status" class="select" value={f?.status ?? 'none'}>
														{#each Object.entries(STATUS) as [k, v]}<option value={k}>{k === 'none' ? 'No status' : v}</option>{/each}
													</select>
													<input name="at" type="date" class="rounded-lg bg-white px-2 py-1 ring-1 ring-line" value={f?.at ?? new Date().toISOString().slice(0, 10)} title="Fix date" />
													<input name="version" placeholder="Version (optional)" class="rounded-lg bg-white px-2 py-1 ring-1 ring-line" value={f?.version ?? ''} />
													<button class="rounded-lg bg-ink px-2 py-1 text-white">Save</button>
												</form>
											{:else}
												<button class="mt-1 text-xs text-muted underline" onclick={() => (editing = t.id)}>Set status</button>
											{/if}
										{/if}
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
					{#if praise.length}
						<tr><td colspan={products.length + 1} class="px-3 pt-6 pb-1"><span class="tag">What users love</span></td></tr>
						{#each praise as t (t.id)}
							<tr class="border-t border-line">
								<td class="p-3 font-medium">{t.label}</td>
								{#each t.counts as c, i}
									<td class="p-3">
										<button class="flex items-center gap-2 disabled:cursor-default" disabled={!c} onclick={() => openTheme(t.id, i)}>
											<span class="h-2 rounded-full bg-good/70" style="width:{Math.max(c ? 6 : 0, (c / max) * 90)}px"></span>
											<span class="num {c ? '' : 'text-muted'}">{c}</span>
										</button>
									</td>
								{/each}
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
		<p class="text-xs text-muted">Click a number to read those reviews. Sources: App Store, Google Play, Hacker News, GitHub (most recent). Updated {a.refreshedAt.slice(0, 10)}.</p>
	{:else}
		<div class="flex flex-wrap items-center gap-2">
			{#each products as p, i}
				<button class="flex items-center gap-2 rounded-[10px] border py-1.5 pr-3 pl-1.5 text-sm {who === i ? 'border-ink bg-white font-medium' : 'border-line bg-white text-ink-2'}" onclick={() => (who = i)}><img src={p.app.icon} alt="" class="size-6 rounded-md" />{p.app.name}</button>
			{/each}
		</div>
		<p class="text-xs text-muted">{srcLine(products[who])}</p>
		<div class="flex flex-wrap items-center gap-2 text-sm">
			<select bind:value={source} class="select">
				<option value="">All sources</option>
				{#each Object.entries(SOURCES) as [k, v]}<option value={k}>{v}</option>{/each}
			</select>
			<select bind:value={stars} class="select">
				<option value={0}>All stars</option>
				{#each [1, 2, 3, 4, 5] as s}<option value={s}>{s} ★</option>{/each}
			</select>
			<select bind:value={theme} class="select">
				<option value="">All themes</option>
				{#each a.themes as t}<option value={t.id}>{t.label}</option>{/each}
			</select>
			<span class="text-muted">{shown.length} reviews and posts</span>
		</div>
		<div class="flex flex-col gap-3">
			{#each pageItems as r (r.id)}
				<article class="card flex flex-col gap-1.5 p-5">
					<div class="flex items-center gap-2 text-xs text-muted">
						<span class="rounded-full bg-tile px-2 py-0.5">{SOURCES[r.source ?? 'appstore'] ?? r.source}</span>
						{#if r.stars}<span class={r.stars <= 2 ? 'text-bad' : r.stars >= 4 ? 'text-good' : 'text-warn'}>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span>{/if}
						<span>{r.date}</span>{#if r.version}<span>· v{r.version}</span>{/if}
						{#if labelOf(r.theme)}<span class="ml-auto rounded-full bg-tile px-2 py-0.5">{labelOf(r.theme)}</span>{/if}
					</div>
					{#if r.title}<p class="font-medium">{r.title}</p>{/if}
					{#if r.text}<p class="text-sm text-ink-2">{r.text}</p>{/if}
					{#if r.url && r.source && r.source !== 'appstore'}<a href={r.url} target="_blank" rel="noopener" class="self-start text-xs text-muted underline">Open on {SOURCES[r.source] ?? r.source}</a>{/if}
				</article>
			{:else}
				<p class="text-sm text-muted">No reviews match.</p>
			{/each}
			{#if pages > 1}
				<nav class="flex flex-wrap items-center justify-center gap-1 text-sm" aria-label="Pages">
					<button class="rounded-[10px] border border-line bg-white px-3 py-1.5 disabled:opacity-40" disabled={pageNo === 1} onclick={() => pageNo--}>←</button>
					{#each Array.from({ length: pages }, (_, i) => i + 1) as n}
						{#if n === 1 || n === pages || Math.abs(n - pageNo) <= 2}
							<button class="size-9 rounded-[10px] border {n === pageNo ? 'border-ink font-medium' : 'border-line text-ink-2'} bg-white" onclick={() => (pageNo = n)}>{n}</button>
						{:else if Math.abs(n - pageNo) === 3}<span class="px-1 text-muted">…</span>{/if}
					{/each}
					<button class="rounded-[10px] border border-line bg-white px-3 py-1.5 disabled:opacity-40" disabled={pageNo === pages} onclick={() => pageNo++}>→</button>
				</nav>
			{/if}
		</div>
	{/if}
</div>
