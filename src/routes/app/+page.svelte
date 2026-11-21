<script lang="ts">
	import ArrowLink from '#lib/components/ArrowLink.svelte';
	import HealthRing from '#lib/components/HealthRing.svelte';
	import { n } from '#lib/format.ts';
	import { enhance } from '$app/forms';
	import { act } from '#lib/act.ts';
	import AgencySetup from '#lib/components/AgencySetup.svelte';
	import Inbox from '#lib/components/Inbox.svelte';
	import { SWATCHES, NEUTRAL } from '#lib/theme.ts';
	import { eur, dayLabel, todayIso } from '#lib/biz-format.ts';
	import { flip } from 'svelte/animate';
	let { data, form } = $props();

	const keep = () => async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => update({ reset: false });
	const clear = () => async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => update();
	let finding = $state(false);
	let customise = $state(false);
	const LABEL: Record<string, string> = { prospects: 'New prospects', pipeline: 'Pipeline', tasks: 'Tasks', agenda: 'Agenda', clients: 'Clients', money: 'Revenue', analytics: 'Analytics' };
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
	const t = todayIso();
	const cur = $derived(data.currency);
	const STAGE_LABEL = { new: 'To contact', contacted: 'Contacted', talking: 'Talking', won: 'Won' } as const;
	const KIND: Record<string, string> = { meeting: 'Meeting', task: 'Task', followup: 'Follow-up', invoice: 'Invoice' };
	const todayCount = $derived(data.inbox.length);
</script>

<svelte:head><title>Dashboard · Undercut</title></svelte:head>

{#if !data.os.profile}
	<section class="card-dark relative overflow-hidden p-6 sm:p-10">
		<div class="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-accent/30 blur-3xl"></div>
		<p class="relative text-sm text-accent">Build your dashboard</p>
		<h1 class="relative mt-2 max-w-3xl text-[34px] leading-tight font-medium sm:text-[52px]">Paste your agency’s URL. Your dashboard builds itself.</h1>
		<p class="relative mt-3 max-w-xl text-white/60">We read what you sell and where you work. Then you get real prospects nearby, a pipeline, tasks and agenda, clients, quotes and invoices.</p>
		<div class="relative mt-6 max-w-2xl"><AgencySetup profile={null} error={form?.setupError ?? ''} /></div>
	</section>
{:else}
	<section class="flex flex-wrap items-end justify-between gap-6">
		<div>
			<p class="label">{hello} · {data.os.profile.name}</p>
			<h1 class="display mt-2 text-[48px] sm:text-[76px]"><em>Today</em></h1>
		</div>
		<div class="flex flex-wrap gap-x-10 gap-y-4">
			<div><p class="big text-5xl">{todayCount}</p><p class="mt-1 text-sm text-muted">to approve</p></div>
			<div><p class="big text-5xl">{data.openTasks}</p><p class="mt-1 text-sm text-muted">open tasks</p></div>
			<div><p class="big text-5xl">{eur(data.money.mrr, cur)}</p><p class="mt-1 text-sm text-muted">per month</p></div>
		</div>
	</section>

	{#if data.os.built}
		{@const p = data.os.profile}
		<section class="card-dark relative mt-6 overflow-hidden p-6 sm:p-8">
			<p class="text-sm text-white/60">✦ Built from {p.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>
			<h2 class="mt-2 text-[28px] leading-tight font-medium tracking-[-0.03em] sm:text-[34px]">We built this dashboard for {p.name}.</h2>
			<div class="mt-5 flex flex-wrap gap-2 text-sm">
				{#each [data.os.built.kind, p.city, p.services.map((x) => ({ web: 'Websites', app: 'Apps', social: 'Social media', seo: 'SEO', branding: 'Branding', ads: 'Ads' })[x] ?? x).join(', '), { fr: 'Français', nl: 'Nederlands', en: 'English' }[p.lang]].filter(Boolean) as t, i (i)}
					<span class="rounded-full bg-white/10 px-3 py-1.5 [animation:fade-up_.5s_var(--ease-out)_both]" style="animation-delay:{i * 120}ms">{t}</span>
				{/each}
				{#if data.accent}<span class="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5"><span class="size-3 rounded-full" style="background:{data.accent}"></span>Your colour</span>{/if}
			</div>
			<ul class="mt-5 grid gap-1.5 text-sm text-white/75 sm:grid-cols-2">
				{#each data.os.built.why as w, i (w)}<li class="flex items-center gap-2 [animation:fade-up_.5s_var(--ease-out)_both]" style="animation-delay:{500 + i * 120}ms"><span class="text-white">✓</span>{w}</li>{/each}
			</ul>
			<div class="mt-6 flex flex-wrap items-center gap-3">
				<form method="POST" action={act('built')} use:enhance={keep}><button class="btn bg-white text-ink hover:bg-white/90">Looks good</button></form>
				<button type="button" class="btn btn-ghost border-white/20 text-white" onclick={() => (customise = true)}>Change it</button>
				<span class="text-xs text-white/50">Or type below: “tasks first”, “hide agenda”…</span>
			</div>
		</section>
	{/if}

	<div class="mt-6"><Inbox items={data.inbox} clients={data.clientOptions} error={form?.paymentError ?? ''} brief={data.brief} briefMsg={form?.briefMsg ?? ''} /></div>

	<!-- ask to change: plain-language edits to the dashboard -->
	<form method="POST" action={act('ask')} use:enhance={keep} class="card mt-6 flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
		<span class="hidden pl-3 text-muted sm:block">✦</span>
		<input name="q" placeholder="Change your dashboard: “hide agenda”, “tasks first”, “make it blue”…" class="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none" />
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

	<!-- 12-column grid: blocks on the same row share the same height -->
	<div class="mt-5 grid gap-4 lg:auto-rows-[minmax(330px,auto)] lg:grid-flow-dense lg:grid-cols-12">
		{#each shown as b (b)}
			<div
				class="relative flex min-w-0 flex-col transition-[opacity,transform] duration-200 {SPAN[sizes[b] ?? 'm']} {customise ? 'cursor-grab rounded-[30px] outline-2 outline-offset-4 outline-dashed outline-black/15 active:cursor-grabbing' : ''} {dragging === b ? 'scale-[.98] opacity-40' : ''}"
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
				<div class="flex flex-1 flex-col {customise ? 'pointer-events-none select-none' : ''}">
				{#if b === 'prospects'}
					<section class="card-dark relative flex flex-1 flex-col overflow-hidden p-5 sm:p-7">
						<div class="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full bg-accent/20 blur-3xl"></div>
						<div class="relative flex flex-wrap items-start justify-between gap-3">
							<div><p class="font-medium">New prospects</p><p class="mt-1 text-sm text-white/50">Around {data.os.profile.city} · {Math.max(0, data.quota - data.used)} of {data.quota} left this month</p></div>
							<form method="POST" action={act('find')} use:enhance={() => { finding = true; return async ({ update }) => { await update({ reset: false }); finding = false; }; }}>
								<button class="btn btn-accent text-sm" disabled={finding || data.used >= data.quota}>{finding ? 'Looking…' : '+ Find 5'}</button>
							</form>
						</div>
						{#if form?.findError}<p class="relative mt-3 text-sm text-[#ffb4a8]">{form.findError}</p>{/if}
						<ul class="relative mt-5 grid min-w-0 flex-1 grid-cols-1 content-start gap-2">
							{#each data.os.fresh as p (p.id)}
								<li class="min-w-0"><a href="/app/prospects" class="flex min-w-0 items-center gap-3 rounded-[18px] bg-white/[.06] p-3 hover:bg-white/10">
									<span class="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-ink">{p.score}</span>
									<span class="min-w-0"><b class="block truncate text-sm font-medium">{p.name}</b><span class="block truncate text-xs text-white/50">{p.category} · {p.pitch}</span></span>
								</a></li>
							{:else}
								<li class="rounded-[18px] bg-white/[.06] p-4 text-sm text-white/60">{finding ? 'Checking the websites of businesses around you…' : 'Press “Find 5”: we look at real businesses around you, check each website and write the first message.'}</li>
							{/each}
						</ul>
						{#if data.os.fresh.length}<a href="/app/prospects" class="relative mt-4 inline-block text-sm text-white/80 hover:underline">See all and contact them →</a>{/if}
					</section>
				{:else if b === 'pipeline'}
					<section class="card flex flex-1 flex-col p-5 sm:p-6">
						<div class="flex items-center justify-between"><p class="font-medium">Pipeline</p><ArrowLink href="/app/prospects" label="Open pipeline" /></div>
						<ul class="mt-5 grid gap-3">
							{#each Object.entries(STAGE_LABEL) as [k, l] (k)}
								{@const c = data.stats.counts[k as keyof typeof STAGE_LABEL]}
								{@const max = Math.max(1, ...Object.keys(STAGE_LABEL).map((x) => data.stats.counts[x as keyof typeof STAGE_LABEL]))}
								<li class="grid grid-cols-[88px_1fr_28px] items-center gap-3 text-sm"><span class="text-muted">{l}</span><span class="h-2.5 overflow-hidden rounded-full bg-tile"><span class="block h-full rounded-full bg-ink" style="width:{(c / max) * 100}%"></span></span><b class="text-right font-medium">{c}</b></li>
							{/each}
						</ul>
						<p class="mt-auto pt-4 text-xs text-muted">{data.stats.replyRate != null ? `${data.stats.replyRate}% of contacted businesses answered.` : 'Move prospects along as you contact them. When one signs, press “Make client”.'}</p>
					</section>
				{:else if b === 'tasks'}
					<section class="card flex flex-1 flex-col p-5 sm:p-6">
						<div class="flex items-center justify-between"><p class="font-medium">Tasks <span class="text-sm font-normal text-muted">· {data.openTasks} open</span></p><ArrowLink href="/app/tasks" label="All tasks" /></div>
						<form method="POST" action={act('task')} use:enhance={clear} class="mt-4 flex gap-2">
							<input name="title" required placeholder="Add a task…" class="input text-sm" />
							<input name="due" type="date" class="input hidden w-36 min-w-0 shrink-0 text-sm sm:block" aria-label="Due date" />
							<button class="pill text-sm">Add</button>
						</form>
						<ul class="mt-3 flex-1 divide-y divide-line">
							{#each data.tasks as k (k.id)}
								<li class="flex items-center gap-3 py-2 text-sm">
									<form method="POST" action={act('toggleTask')} use:enhance={keep}><input type="hidden" name="id" value={k.id} /><button class="grid size-5 place-items-center rounded-md border border-ink/25 hover:border-ink" aria-label="Mark as done"></button></form>
									<span class="min-w-0 flex-1"><span class="block truncate">{k.title}</span>{#if k.client}<span class="block truncate text-xs text-muted">{k.client}</span>{/if}</span>
									{#if k.due}<span class="shrink-0 text-xs {k.due < t ? 'text-bad' : 'text-muted'}">{k.due === t ? 'Today' : dayLabel(k.due)}</span>{/if}
								</li>
							{:else}
								<li class="py-2 text-sm text-muted">Nothing to do yet. Add your first task above.</li>
							{/each}
						</ul>
					</section>
				{:else if b === 'agenda'}
					<section class="card flex flex-1 flex-col p-5 sm:p-6">
						<div class="flex items-center justify-between"><p class="font-medium">Agenda <span class="text-sm font-normal text-muted">· next 7 days</span></p><ArrowLink href="/app/tasks" label="Open agenda" /></div>
						<ul class="mt-4 flex-1 space-y-1.5">
							{#each data.agenda as a (a.kind + a.id)}
								<li><a href={a.href} class="flex items-center gap-3 rounded-[14px] bg-tile px-3 py-2 text-sm hover:bg-[#e6e6e1]">
									<span class="w-[88px] shrink-0 text-xs {a.late ? 'text-bad' : 'text-muted'}">{a.late ? 'Late' : a.date === t ? 'Today' : dayLabel(a.date)}{a.time ? ` ${a.time}` : ''}</span>
									<span class="min-w-0 flex-1 truncate">{a.title}{#if a.sub}<span class="text-muted"> · {a.sub}</span>{/if}</span>
									<span class="hidden shrink-0 text-[11px] text-muted sm:inline">{KIND[a.kind]}</span>
								</a></li>
							{:else}
								<li class="text-sm text-muted">Nothing planned this week. Meetings, tasks with a date, follow-ups and invoices due show up here.</li>
							{/each}
						</ul>
						<a href="/app/tasks" class="mt-4 text-sm text-ink-2 hover:underline">+ Add a meeting</a>
					</section>
				{:else if b === 'clients'}
					<section class="card flex flex-1 flex-col p-5 sm:p-6">
						<div class="flex items-center justify-between gap-3"><p class="font-medium">Clients <span class="text-sm font-normal text-muted">· {data.money.active} active</span></p><ArrowLink href="/app/crm" label="All clients" /></div>
						{#if data.clients.length}
							<ul class="mt-4 flex-1 divide-y divide-line">
								{#each data.clients as c (c.id)}
									<li><a href="/app/crm/{c.id}" class="flex items-center gap-3 py-2.5 text-sm hover:underline">
										<span class="grid size-8 shrink-0 place-items-center rounded-full bg-tile text-xs font-semibold">{c.name.slice(0, 1).toUpperCase()}</span>
										<span class="min-w-0 flex-1"><span class="block truncate font-medium">{c.name}</span><span class="block truncate text-xs text-muted">{c.services.join(', ') || 'No services listed'}</span></span>
										{#if c.site !== null}<span class="text-xs {c.site ? 'text-good' : 'text-bad'}" title="Website check">{c.site ? '● site online' : '● site down'}</span>{/if}
										<span class="w-20 shrink-0 text-right">{c.fee ? eur(c.fee, cur) : '—'}</span>
									</a></li>
								{/each}
							</ul>
						{:else}
							<p class="mt-4 flex-1 text-sm text-muted">{data.clientCount ? 'No active clients right now.' : 'Add the clients you already work for, or turn a won prospect into a client from your pipeline.'}</p>
						{/if}
						<a href="/app/crm" class="btn btn-primary mt-4 self-start text-sm">+ Add client</a>
					</section>
				{:else if b === 'money'}
					<section class="card flex flex-1 flex-col p-5 sm:p-6">
						<div class="flex items-center justify-between"><p class="font-medium">Revenue</p><ArrowLink href="/app/invoices" label="Quotes & invoices" /></div>
						<p class="mt-4 text-xs text-muted">Monthly retainers</p>
						<p class="big text-5xl">{eur(data.money.mrr, cur)}</p>
						<dl class="mt-4 grid grid-cols-2 gap-2 text-sm">
							<div class="rounded-[14px] bg-tile p-3"><dt class="text-xs text-muted">Paid this month</dt><dd class="mt-0.5 font-medium">{eur(data.money.paidMonth, cur)}</dd></div>
							<div class="rounded-[14px] bg-tile p-3"><dt class="text-xs text-muted">Waiting</dt><dd class="mt-0.5 font-medium {data.money.overdue ? 'text-bad' : ''}">{eur(data.money.unpaid, cur)}{data.money.overdue ? ` · ${data.money.overdue} late` : ''}</dd></div>
						</dl>
						<div class="mt-auto pt-5">
							<div class="flex items-baseline justify-between text-sm"><span class="text-muted">New clients this month</span><b class="font-medium">{data.stats.wonMonth} / {data.os.goal.wonPerMonth}</b></div>
							<div class="mt-2 h-2 overflow-hidden rounded-full bg-tile"><div class="h-full rounded-full bg-ink" style="width:{Math.min(100, (data.stats.wonMonth / data.os.goal.wonPerMonth) * 100)}%"></div></div>
							<form method="POST" action={act('goal')} use:enhance={keep} class="mt-2 flex items-center gap-2 text-xs text-muted">Goal <input name="won" type="number" min="1" max="100" value={data.os.goal.wonPerMonth} class="input w-16 py-1 text-sm" /> per month <button class="pill text-xs">Save</button></form>
						</div>
					</section>
				{:else if b === 'analytics'}
					<section class="card flex flex-1 flex-col p-5 sm:p-6">
						<div class="flex items-center justify-between gap-3"><p class="font-medium">Analytics <span class="text-sm font-normal text-muted">· your clients’ sites and apps</span></p><ArrowLink href="/app/analytics" label="All analytics" /></div>
						{#if data.analytics.length}
							<div class="mt-4 grid flex-1 gap-3 sm:grid-cols-3">
								{#each data.analytics as r (r.client.id)}
									<a href="/app/clients/{r.client.id}" class="flex flex-col rounded-[20px] bg-tile p-4 hover:bg-[#e6e6e1]">
										<div class="flex items-center justify-between gap-3"><b class="truncate text-sm font-medium">{r.client.name}</b><HealthRing score={r.health.score} size={40} /></div>
										{#if r.main && (r.main.value || r.main.prev)}<p class="mt-3 big text-3xl">{n(r.main.value)}</p><p class="text-xs text-muted">{r.main.label}, 28 days</p>{:else}<p class="mt-3 text-sm text-muted">No data yet: connect Google or the snippet.</p>{/if}
										{#if r.tasks[0]}<p class="mt-auto truncate pt-3 text-xs text-ink-2">→ {r.tasks[0].title}</p>{/if}
									</a>
								{/each}
							</div>
						{:else}
							<p class="mt-4 flex-1 text-sm text-muted">Track your clients’ websites and apps: visits, leads, Google, heatmaps, SEO fixes, app users. Real data only, from the tools you connect.</p>
						{/if}
						<a href="/app/clients/new" class="pill mt-4 self-start text-sm">+ Track a site or app</a>
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
