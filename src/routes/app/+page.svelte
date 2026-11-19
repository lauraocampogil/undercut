<script lang="ts">
	import Delta from '#lib/components/Delta.svelte';
	import Sparkline from '#lib/components/Sparkline.svelte';
	import HealthRing from '#lib/components/HealthRing.svelte';
	import ArrowLink from '#lib/components/ArrowLink.svelte';
	import { n, pct } from '#lib/format.ts';
	import { enhance } from '$app/forms';
	import { act } from '#lib/act.ts';
	import AgencySetup from '#lib/components/AgencySetup.svelte';
	import { SWATCHES, NEUTRAL } from '#lib/theme.ts';
	import { flip } from 'svelte/animate';
	let { data, form } = $props();

	const keep = () => async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => update({ reset: false });
	let finding = $state(false);
	let customise = $state(false);
	const LABEL: Record<string, string> = { prospects: 'New prospects', pipeline: 'Pipeline', clients: 'Clients', todo: 'This week', calendar: 'Agenda', site: 'Your own site', goals: 'Goal', content: 'What to post' };
	const SPAN: Record<string, string> = { s: 'lg:col-span-4', m: 'lg:col-span-6', l: 'lg:col-span-8', xl: 'lg:col-span-12' };
	const SIZE_LABEL: Record<string, string> = { s: '⅓', m: '½', l: '⅔', xl: 'Full' };
	type B = (typeof data.os.order)[number];
	// local, editable copy of the layout (drag & drop, sizes, visibility); saved to the server after each change
	let order = $state<B[]>([]);
	let sizes = $state<Record<string, string>>({});
	let visible = $state<Record<string, boolean>>({});
	$effect.pre(() => {
		order = [...data.os.order];
		sizes = { ...data.os.sizes };
		visible = { ...data.os.blocks };
	});
	const shown = $derived(order.filter((b) => visible[b]));
	const hiddenBlocks = $derived(order.filter((b) => !visible[b]));
	let dragging = $state<B | null>(null);
	let saving = $state(false);
	async function saveLayout() {
		saving = true;
		const f = new FormData();
		f.set('order', JSON.stringify(order));
		f.set('sizes', JSON.stringify(sizes));
		f.set('visible', JSON.stringify(order.filter((b) => visible[b])));
		await fetch(act('layout'), { method: 'POST', body: f, headers: { 'x-sveltekit-action': 'true' } });
		saving = false;
	}
	const moveTo = (b: B, target: B) => {
		if (b === target) return;
		const next = order.filter((x) => x !== b);
		next.splice(next.indexOf(target), 0, b);
		order = next;
	};
	const cycleSize = (b: B) => {
		const list = ['s', 'm', 'l', 'xl'];
		sizes = { ...sizes, [b]: list[(list.indexOf(sizes[b] ?? 'm') + 1) % list.length] };
		saveLayout();
	};
	const setVisible = (b: B, on: boolean) => {
		visible = { ...visible, [b]: on };
		saveLayout();
	};
	const hour = new Date().getHours();
	const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
	const todo = $derived.by(() => {
		const t: { title: string; why: string; href: string; urgent?: boolean }[] = [];
		for (const p of data.stats.due) t.push({ title: `Follow up with ${p.name}`, why: p.note || `Contacted · ${p.pitch}`, href: '/app/prospects', urgent: true });
		if (data.stats.counts.new) t.push({ title: `Contact ${Math.min(5, data.stats.counts.new)} new prospects`, why: 'The message is written — review it and send it yourself.', href: '/app/prospects' });
		for (const r of data.rows) for (const k of r.tasks.filter((x) => x.level === 'bad').slice(0, 1)) t.push({ title: `${r.client.name}: ${k.title}`, why: 'Client site', href: `/app/clients/${r.client.id}`, urgent: true });
		if (!data.rows.length) t.push({ title: 'Add your first client', why: 'Their site or app health, leads and fixes in one place.', href: '/app/clients/new' });
		return t.slice(0, 6);
	});
	const STAGE_LABEL = { new: 'To contact', contacted: 'Contacted', talking: 'Talking', won: 'Won' } as const;
	const fmtDay = (d: string) => new Date(d + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

	type Row = (typeof data.rows)[number];
	let filter = $state<'all' | 'attention' | 'healthy' | 'apps'>('all');
	const dot = { good: 'bg-good', warn: 'bg-[#E3A21A]', bad: 'bg-bad' };
	const totals = $derived({
		visits: data.rows.reduce((s: number, r: Row) => s + (r.main?.label === 'visits' ? r.main.value : 0), 0),
		prev: data.rows.reduce((s: number, r: Row) => s + (r.main?.label === 'visits' ? r.main.prev : 0), 0),
		urgent: data.rows.reduce((s: number, r: Row) => s + r.tasks.filter((t) => t.level === 'bad').length, 0),
		attention: data.rows.filter((r: Row) => r.health.level !== 'good').length
	});
	const rows = $derived(
		data.rows.filter((r: Row) =>
			filter === 'attention' ? r.health.level !== 'good' : filter === 'healthy' ? r.health.level === 'good' : filter === 'apps' ? r.client.type !== 'web' : true
		)
	);
	const filters = $derived([
		{ id: 'all', label: 'All', count: data.rows.length },
		{ id: 'attention', label: 'Needs attention', count: totals.attention },
		{ id: 'healthy', label: 'Healthy', count: data.rows.length - totals.attention },
		{ id: 'apps', label: 'Apps', count: data.rows.filter((r: Row) => r.client.type !== 'web').length }
	] as const);
</script>

<svelte:head><title>Dashboard · Undercut</title></svelte:head>

{#if !data.os.profile}
	<section class="card-dark relative overflow-hidden p-6 sm:p-10">
		<div class="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-accent/30 blur-3xl"></div>
		<p class="relative text-sm text-accent">Build your dashboard</p>
		<h1 class="relative mt-2 max-w-3xl text-[34px] leading-tight font-medium sm:text-[52px]">Paste your agency’s URL. Your dashboard builds itself.</h1>
		<p class="relative mt-3 max-w-xl text-white/60">We read what you sell and where you work, then find local businesses that need you — next to your clients’ sites and apps.</p>
		<div class="relative mt-6 max-w-2xl"><AgencySetup profile={null} error={form?.setupError ?? ''} /></div>
	</section>
{:else}
	<section class="flex flex-wrap items-end justify-between gap-6">
		<div>
			<p class="label">{hello} · {data.os.profile.name}</p>
			<h1 class="display mt-2 text-[48px] sm:text-[76px]">Your <em>week</em></h1>
		</div>
		<div class="flex flex-wrap gap-x-10 gap-y-4">
			<div><p class="big text-5xl">{data.stats.counts.new}</p><p class="mt-1 text-sm text-muted">to contact</p></div>
			<div><p class="big text-5xl">{data.stats.counts.talking}</p><p class="mt-1 text-sm text-muted">talking</p></div>
			<div><p class="big text-5xl">{data.stats.wonMonth}<span class="text-2xl text-muted">/{data.os.goal.wonPerMonth}</span></p><p class="mt-1 text-sm text-muted">won this month</p></div>
		</div>
	</section>

	<!-- ask to change: plain-language edits to the dashboard -->
	<form method="POST" action={act('ask')} use:enhance={keep} class="card mt-6 flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
		<span class="hidden pl-3 text-muted sm:block">✦</span>
		<input name="q" placeholder="Change your dashboard: “hide agenda”, “clients first”, “make it blue”…" class="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none" />
		<div class="flex gap-2"><button class="btn btn-accent text-sm">Change</button><button type="button" class="pill text-sm {customise ? 'pill-active' : ''}" onclick={() => (customise = !customise)}>{customise ? 'Done' : 'Customise'}</button></div>
	</form>
	{#if form?.asked}<p class="mt-2 text-sm text-muted">{form.asked}</p>{/if}
	{#if customise}
		<div class="card mt-3 grid gap-5 p-5">
		<div>
			<p class="label">Colour</p>
			<div class="mt-2 flex flex-wrap items-center gap-2">
				<form method="POST" action={act('theme')} use:enhance={keep}><input type="hidden" name="accent" value="" /><button class="pill text-sm {!data.accent || data.accent === NEUTRAL ? 'pill-active' : ''}"><span class="size-3.5 rounded-full border border-line bg-[linear-gradient(135deg,#fff_50%,#0d0d0d_50%)]"></span>Black & white</button></form>
				{#if data.siteColor}
					<form method="POST" action={act('theme')} use:enhance={keep}><input type="hidden" name="accent" value="site" /><button class="pill text-sm {data.accent === data.siteColor ? 'pill-active' : ''}"><span class="size-3.5 rounded-full" style="background:{data.siteColor}"></span>Your site’s colour</button></form>
				{/if}
				{#each SWATCHES as c (c)}
					<form method="POST" action={act('theme')} use:enhance={keep}><input type="hidden" name="accent" value={c} /><button class="grid size-9 place-items-center rounded-full ring-offset-2 {data.accent?.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-ink' : ''}" style="background:{c}" aria-label="Use {c}"></button></form>
				{/each}
				<form method="POST" action={act('theme')} use:enhance={keep} class="flex items-center gap-2">
					<label class="relative grid size-9 cursor-pointer place-items-center overflow-hidden rounded-full border border-line bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)]" title="Any colour"><input type="color" name="accent" value={data.accent ?? '#2f6bff'} class="absolute inset-0 cursor-pointer opacity-0" onchange={(e) => e.currentTarget.form?.requestSubmit()} /></label>
				</form>
			</div>
		</div>
		<div class="flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-black/[.03] px-4 py-3 text-sm">
			<p class="text-ink-2"><b class="font-medium text-ink">Edit mode:</b> drag blocks to move them, change their width, hide them, or add new ones below.</p>
			<span class="text-xs text-muted">{saving ? 'Saving…' : 'Saved automatically'}</span>
		</div>
		</div>
	{/if}

	<div class="mt-5 grid gap-4 lg:grid-cols-12">
		{#each shown as b (b)}
			<div
				class="relative min-w-0 transition-[opacity,transform] duration-200 {SPAN[sizes[b] ?? 'm']} {customise ? 'cursor-grab rounded-[30px] outline-2 outline-offset-4 outline-dashed outline-black/15 active:cursor-grabbing' : ''} {dragging === b ? 'scale-[.98] opacity-40' : ''}"
				animate:flip={{ duration: 300 }}
				draggable={customise}
				role="listitem"
				ondragstart={(e) => {
					dragging = b;
					e.dataTransfer?.setData('text/plain', b);
				}}
				ondragover={(e) => {
					if (!dragging) return;
					e.preventDefault();
					moveTo(dragging, b);
				}}
				ondragend={() => {
					if (dragging) saveLayout();
					dragging = null;
				}}
			>
				{#if customise}
					<div class="absolute -top-3 right-4 z-20 flex items-center gap-1 rounded-full bg-ink p-1 text-xs text-white shadow-lg">
						<span class="px-2 select-none" title="Drag to move">⠿ {LABEL[b]}</span>
						<button type="button" class="rounded-full bg-white/10 px-2.5 py-1 hover:bg-white/20" onclick={() => cycleSize(b)} title="Change width">{SIZE_LABEL[sizes[b] ?? 'm']}</button>
						<button type="button" class="grid size-6 place-items-center rounded-full hover:bg-white/20" onclick={() => setVisible(b, false)} aria-label="Hide {LABEL[b]}">✕</button>
					</div>
				{/if}
				<div class={customise ? 'pointer-events-none select-none' : ''}>
				{#if b === 'prospects'}
					<section class="card-dark relative h-full overflow-hidden p-5 sm:p-7">
						<div class="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full bg-accent/20 blur-3xl"></div>
						<div class="relative flex flex-wrap items-start justify-between gap-3">
							<div><p class="text-sm text-accent">New prospects</p><p class="mt-1 text-sm text-white/50">Around {data.os.profile.city} · {Math.max(0, data.quota - data.used)} of {data.quota} left this month</p></div>
							<form method="POST" action={act('find')} use:enhance={() => { finding = true; return async ({ update, result }) => { await update({ reset: false }); finding = false; }; }}>
								<button class="btn btn-accent text-sm" disabled={finding || data.used >= data.quota}>{finding ? 'Looking…' : '+ Find 5'}</button>
							</form>
						</div>
						{#if form?.findError}<p class="relative mt-3 text-sm text-[#ffb4a8]">{form.findError}</p>{/if}
						<ul class="relative mt-5 grid gap-2">
							{#each data.os.fresh as p (p.id)}
								<li><a href="/app/prospects" class="flex items-center gap-3 rounded-[18px] bg-white/[.06] p-3 hover:bg-white/10">
									<span class="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-ink">{p.score}</span>
									<span class="min-w-0"><b class="block truncate text-sm font-medium">{p.name}</b><span class="block truncate text-xs text-white/50">{p.category} · {p.pitch}</span></span>
								</a></li>
							{:else}
								<li class="rounded-[18px] bg-white/[.06] p-4 text-sm text-white/60">{finding ? 'Checking the websites of businesses around you…' : 'Click “Find 5” — we look around you and check each website.'}</li>
							{/each}
						</ul>
						{#if data.os.fresh.length}<a href="/app/prospects" class="relative mt-4 inline-block text-sm text-accent hover:underline">See all and contact them →</a>{/if}
					</section>
				{:else if b === 'pipeline'}
					<section class="card h-full p-5 sm:p-6">
						<div class="flex items-center justify-between"><p class="font-medium">Pipeline</p><ArrowLink href="/app/prospects" label="Open pipeline" /></div>
						<ul class="mt-4 grid gap-2">
							{#each Object.entries(STAGE_LABEL) as [k, l] (k)}
								{@const c = data.stats.counts[k as keyof typeof STAGE_LABEL]}
								{@const max = Math.max(1, ...Object.keys(STAGE_LABEL).map((x) => data.stats.counts[x as keyof typeof STAGE_LABEL]))}
								<li class="grid grid-cols-[88px_1fr_28px] items-center gap-3 text-sm"><span class="text-muted">{l}</span><span class="h-2.5 overflow-hidden rounded-full bg-tile"><span class="block h-full rounded-full {k === 'won' ? 'bg-accent' : 'bg-ink'}" style="width:{(c / max) * 100}%"></span></span><b class="text-right font-medium">{c}</b></li>
							{/each}
						</ul>
						<p class="mt-4 text-xs text-muted">{data.stats.replyRate != null ? `${data.stats.replyRate}% of contacted businesses answered` : 'Move prospects along as you contact them.'}</p>
					</section>
				{:else if b === 'todo'}
					<section class="card h-full p-5 sm:p-6">
						<p class="font-medium">This week</p>
						<ol class="mt-4 grid gap-2">
							{#each todo as t, i (t.title)}
								<li><a href={t.href} class="flex gap-3 rounded-[16px] bg-tile p-3 hover:bg-[#e6e6e1]"><span class="grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold {t.urgent ? 'bg-ink text-white' : 'bg-white'}">{i + 1}</span><span class="min-w-0"><b class="block truncate text-sm font-medium">{t.title}</b><span class="block truncate text-xs text-muted">{t.why}</span></span></a></li>
							{:else}
								<li class="text-sm text-muted">Nothing urgent. Find new prospects or check a client.</li>
							{/each}
						</ol>
					</section>
				{:else if b === 'calendar'}
					<section class="card h-full p-5 sm:p-6">
						<p class="font-medium">Agenda</p>
						<ul class="mt-4 grid gap-2">
							{#each data.stats.upcoming as p (p.id)}
								<li class="flex items-center gap-3 text-sm"><span class="w-28 shrink-0 text-muted">{fmtDay(p.next!)}</span><a href="/app/prospects" class="truncate hover:underline">Follow up · <b class="font-medium">{p.name}</b></a></li>
							{:else}
								<li class="text-sm text-muted">When you mark a prospect as contacted, a follow-up appears here 4 days later. You can change the date on each prospect.</li>
							{/each}
						</ul>
					</section>
				{:else if b === 'site'}
					<section class="card h-full p-5 sm:p-6">
						<p class="font-medium">Your own site</p>
						{#if data.own}
							<div class="mt-4 flex items-center justify-between gap-4">
								<div>{#if data.own.main}<p class="big text-4xl">{n(data.own.main.value)}</p><p class="text-xs text-muted">{data.own.main.label}, 28 days</p>{/if}</div>
								<HealthRing score={data.own.health.score} size={58} />
							</div>
							{#if data.own.tasks[0]}<a href="/app/clients/{data.own.client.id}" class="mt-4 block truncate text-sm text-ink-2 hover:underline">→ {data.own.tasks[0].title}</a>{/if}
						{:else}
							<p class="mt-3 text-sm text-ink-2">Prospects will look at your site before answering. Track it like a client: speed, Google, leads.</p>
							<a href="/app/clients/new?domain={encodeURIComponent(data.os.profile.url)}&name={encodeURIComponent(data.os.profile.name)}" class="btn btn-primary mt-4 text-sm">Track my site</a>
						{/if}
					</section>
				{:else if b === 'goals'}
					<section class="card h-full p-5 sm:p-6">
						<p class="font-medium">Goal this month</p>
						<p class="mt-3 flex items-baseline gap-2"><span class="big text-5xl">{data.stats.wonMonth}</span><span class="text-muted">/ {data.os.goal.wonPerMonth} new clients</span></p>
						<div class="mt-3 h-2.5 overflow-hidden rounded-full bg-tile"><div class="h-full rounded-full bg-accent" style="width:{Math.min(100, Math.max(3, (data.stats.wonMonth / data.os.goal.wonPerMonth) * 100))}%"></div></div>
						<p class="mt-3 text-xs text-muted">{data.stats.wonValue ? `€${data.stats.wonValue}/month signed this month. ` : ''}{data.stats.replyRate ? `At ${data.stats.replyRate}% replies, contact about ${Math.ceil((data.os.goal.wonPerMonth - data.stats.wonMonth) / Math.max(0.05, data.stats.replyRate / 100 / 3))} more businesses.` : 'Contact ~15 businesses per new client to start with.'}</p>
						<form method="POST" action={act('goal')} use:enhance={keep} class="mt-3 flex items-center gap-2 text-xs text-muted">Target <input name="won" type="number" min="1" max="100" value={data.os.goal.wonPerMonth} class="input w-16 py-1 text-sm" /> per month <button class="pill text-xs">Save</button></form>
					</section>
				{:else if b === 'content'}
					<section class="card h-full p-5 sm:p-6">
						<p class="font-medium">What to post</p>
						<ul class="mt-4 grid gap-2">
							{#each data.content as c (c.title)}<li class="rounded-[16px] bg-tile p-3"><b class="block text-sm font-medium">{c.title}</b><span class="text-xs text-muted">{c.why}</span></li>{/each}
						</ul>
					</section>
				{:else if b === 'clients'}
					<section>
						<p class="mb-1 font-medium">Clients <span class="text-sm font-normal text-muted">· {data.rows.length} · {n(totals.visits)} visits · {totals.urgent} urgent fixes</span></p>
						<div class="scrollbar-none mt-8 -mx-3 flex gap-2 overflow-x-auto px-3">
							{#each filters as f (f.id)}
								<button class="pill {filter === f.id ? 'pill-active' : ''}" onclick={() => (filter = f.id)}>
									{f.label}<span class="text-xs opacity-60">{f.count}</span>
								</button>
							{/each}
							<a href="/app/clients/new" class="pill ml-auto border-ink bg-ink text-white">+ Add client</a>
						</div>

						<section class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{#each rows as r, i (r.client.id)}
								{@const dark = i === 0 && r.health.level === 'bad' && filter !== 'healthy'}
								{@const top = r.tasks[0]}
								<article class="flex flex-col p-5 sm:p-6 {dark ? 'card-dark' : 'card'}">
									<div class="flex items-start justify-between gap-3">
										<div class="flex min-w-0 items-center gap-3">
											<span class="grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold text-white" style="background:{r.client.color}">{r.client.name.slice(0, 1)}</span>
											<div class="min-w-0">
												<h2 class="truncate font-medium">{r.client.name}</h2>
												<p class="truncate text-xs {dark ? 'text-white/50' : 'text-muted'}">{r.client.type === 'app' ? 'App' : r.client.domain.replace(/^https?:\/\//, '')}{r.client.type === 'both' ? ' + app' : ''}</p>
											</div>
										</div>
										<ArrowLink href="/app/clients/{r.client.id}" label="Open {r.client.name}" {dark} />
									</div>

									<div class="mt-8 flex items-end justify-between gap-4">
										{#if r.main}
											<div>
												<p class="flex items-start gap-1.5"><span class="big text-5xl">{n(r.main.value)}</span><Delta value={pct(r.main.value, r.main.prev)} {dark} /></p>
												<p class="mt-1 text-xs {dark ? 'text-white/50' : 'text-muted'}">{r.main.label}</p>
											</div>
										{/if}
										<HealthRing score={r.health.score} size={58} {dark} />
									</div>

									{#if r.main}
										<div class="mt-5"><Sparkline data={r.main.daily} color={dark ? 'var(--color-accent)' : 'var(--color-ink)'} width={320} height={42} /></div>
									{/if}

									<!-- one dot per area: the whole status at a glance -->
									<div class="mt-5 flex flex-wrap gap-1.5 border-t pt-4 {dark ? 'border-white/10' : 'border-line'}">
										{#each r.areas as a (a.key)}
											<a href={a.href} class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs {dark ? 'bg-white/10 text-white/80 hover:bg-white/20' : 'bg-tile text-ink-2 hover:bg-[#e6e6e1]'}" title="{a.label}: {a.value} {a.sub}">
												<span class="size-1.5 rounded-full {dot[a.level]}"></span>{a.label.replace('Google ', '').replace(' health', '')}
											</a>
										{/each}
									</div>
									{#if top}
										<a href="/app/clients/{r.client.id}" class="mt-3 truncate text-xs {dark ? 'text-accent' : 'text-ink-2'} hover:underline">→ {top.title}{r.tasks.length > 1 ? ` · +${r.tasks.length - 1}` : ''}</a>
									{/if}
								</article>
							{/each}
							<a href="/app/clients/new" class="grid min-h-[260px] place-items-center rounded-[28px] border-2 border-dashed border-[#d0d0ca] p-6 text-center transition-colors hover:border-ink">
								<span>
									<span class="mx-auto grid size-12 place-items-center rounded-full bg-ink text-2xl text-white">+</span>
									<span class="display mt-4 block text-3xl">Add a client</span>
									<span class="mt-1 block text-sm text-muted">Website, app or both.</span>
								</span>
							</a>
						</section>
					</section>
				{/if}
				</div>
			</div>
		{/each}
	</div>
	{#if customise && hiddenBlocks.length}
		<div class="mt-6 rounded-[28px] border-2 border-dashed border-black/10 p-5">
			<p class="label">Add a block</p>
			<div class="mt-3 flex flex-wrap gap-2">
				{#each hiddenBlocks as b (b)}<button type="button" class="pill text-sm" onclick={() => setVisible(b, true)}>+ {LABEL[b]}</button>{/each}
			</div>
		</div>
	{/if}
{/if}
