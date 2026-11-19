<script lang="ts">
	import { enhance } from '$app/forms';
	import { act } from '#lib/act.ts';
	import Sparkline from '#lib/components/Sparkline.svelte';
	let { data, form } = $props();
	const keep = () => async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => update({ reset: false });
	let adding = $state(false);
	let metric = $state('visits_day');
	const m = $derived(data.metrics.find((x) => x.key === metric));
	const inThreeMonths = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
	const fmt = (n: number | null, money: boolean) => (n == null ? '—' : money ? `€${Math.round(n).toLocaleString('en-US')}` : n >= 100 ? Math.round(n).toLocaleString('en-US') : String(n));
	const badge = { reached: ['Reached 🎉', 'bg-accent text-accent-ink'], on_track: ['On track', 'bg-good-bg text-good'], behind: ['Behind', 'bg-bad-bg text-bad'], no_data: ['Not measured yet', 'bg-tile text-muted'] } as const;
	const daysLeft = (d: string) => Math.max(0, Math.ceil((Date.parse(d + 'T23:59:59') - Date.now()) / 864e5));
	const examples = [
		['visits_day', 100, 'Visits per day'],
		['leads_month', 30, 'Leads per month'],
		['mrr', 10000, 'MRR']
	] as const;
</script>

<svelte:head><title>Goals · {data.client.name}</title></svelte:head>

{#if !data.progress.length && !adding}
	<section class="card-dark relative overflow-hidden p-6 sm:p-10">
		<div class="pointer-events-none absolute -right-24 -bottom-24 size-80 rounded-full bg-accent/30 blur-3xl"></div>
		<p class="relative text-sm text-accent">Goals</p>
		<h2 class="relative mt-2 max-w-2xl text-[32px] leading-tight font-medium sm:text-[44px]">What should {data.client.name} reach — and by when?</h2>
		<p class="relative mt-3 max-w-xl text-white/60">Undercut measures where you stand today, tells you if you’re on track, works out what it takes, and gives the next actions from the client’s own data.</p>
		<div class="relative mt-6 flex flex-wrap gap-2">
			{#each examples.filter(([k]) => data.metrics.some((x) => x.key === k)) as [k, v, l] (k)}
				<button class="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20" onclick={() => { metric = k; adding = true; }}>{k === 'mrr' ? '€10k' : v} {l.toLowerCase()}</button>
			{/each}
			<button class="btn btn-accent" onclick={() => (adding = true)}>+ Set a goal</button>
		</div>
	</section>
{/if}

{#if data.coach}
	<p class="mb-4 rounded-[24px] bg-accent-soft p-5 text-[17px] leading-relaxed">✦ {data.coach}</p>
{/if}

<section class="grid gap-4">
	{#each data.progress as p (p.goal.id)}
		{@const b = badge[p.status]}
		<article class="card p-5 sm:p-7">
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p class="text-sm text-muted">{p.label} · by {p.goal.deadline} ({daysLeft(p.goal.deadline)} days left)</p>
					<p class="mt-2 flex flex-wrap items-baseline gap-x-3"><span class="big text-[52px]">{fmt(p.current, p.money)}</span><span class="text-xl text-muted">/ {fmt(p.goal.target, p.money)} {p.money ? '' : p.unit}</span></p>
				</div>
				<div class="flex items-center gap-2">
					<span class="rounded-full px-3 py-1 text-xs font-medium {b[1]}">{b[0]}</span>
					<form method="POST" action={act('remove')} use:enhance={keep}><input type="hidden" name="id" value={p.goal.id} /><button class="icon-btn size-8 text-xs" aria-label="Delete goal">✕</button></form>
				</div>
			</div>
			<div class="mt-4 h-3 overflow-hidden rounded-full bg-tile"><div class="h-full rounded-full {p.status === 'behind' ? 'bg-ink' : 'bg-accent'}" style="width:{Math.max(2, p.pct)}%"></div></div>
			<div class="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted">
				<span>{p.pct}% · {p.source || 'no source yet'}</span>
				<span>{p.status === 'reached' ? 'Goal reached' : p.eta ? `At this pace: reached around ${p.eta}` : p.weeklyGrowth != null && p.weeklyGrowth <= 0 ? 'Not growing at the moment' : 'Projection after a few weeks of data'}</span>
			</div>
			{#if p.error}<p class="mt-3 rounded-[14px] bg-warn-bg p-3 text-sm text-warn">{p.error}</p>{/if}

			<div class="mt-6 grid gap-4 lg:grid-cols-2">
				<div class="rounded-[22px] bg-tile p-5">
					<p class="text-sm font-medium">What it takes</p>
					{#if p.series.length >= 2}<div class="mt-3"><Sparkline data={p.series} width={300} height={44} /></div>{/if}
					<ul class="mt-3 space-y-2 text-sm text-ink-2">
						{#each p.math as line (line)}<li class="flex gap-2"><span class="text-muted">→</span>{line}</li>{:else}<li class="text-muted">Shows up once the metric is measured.</li>{/each}
					</ul>
				</div>
				<div class="rounded-[22px] bg-ink p-5 text-white">
					<p class="text-sm font-medium text-accent">Next actions</p>
					<ol class="mt-3 space-y-2">
						{#each p.actions as a, i (a.title)}
							<li>
								<a href={a.href ?? '#'} class="flex gap-3 rounded-[16px] bg-white/[.06] p-3 hover:bg-white/10">
									<span class="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-semibold text-accent-ink">{i + 1}</span>
									<span class="min-w-0"><b class="block text-sm font-medium">{a.title}</b><span class="text-xs text-white/60">{a.why}</span>{#if a.impact}<span class="mt-1 block text-xs text-accent">{a.impact}</span>{/if}</span>
								</a>
							</li>
						{:else}
							<li class="text-sm text-white/60">Actions appear once there is data to act on.</li>
						{/each}
					</ol>
				</div>
			</div>
		</article>
	{/each}
</section>

{#if data.hasMrr}
	<section class="card mt-4 grid gap-6 p-5 sm:p-7 lg:grid-cols-2">
		<form method="POST" action={act('stripe')} use:enhance={keep}>
			<p class="font-medium">Connect Stripe (read-only)</p>
			<p class="mt-1 text-sm text-ink-2">Stripe → Developers → API keys → <b>Create restricted key</b> → give <i>Subscriptions: Read</i> only. Undercut reads the MRR every day.</p>
			{#if data.stripe}<p class="mt-3 text-sm">Connected: <code>{data.stripe}</code></p>{/if}
			<div class="mt-3 flex gap-2"><input name="key" type="password" autocomplete="off" class="input text-sm" placeholder={data.stripe ? 'Paste a new key, or leave empty and save to disconnect' : 'rk_live_…'} /><button class="btn btn-primary shrink-0">Save</button></div>
			{#if form?.stripeError}<p class="mt-2 text-sm text-bad">{form.stripeError}</p>{/if}
		</form>
		<form method="POST" action={act('mrr')} use:enhance={keep}>
			<p class="font-medium">Or update it by hand</p>
			<p class="mt-1 text-sm text-ink-2">Type today’s MRR (each update draws the curve) and the average price per customer.</p>
			<div class="mt-3 grid grid-cols-2 gap-2">
				<label class="text-xs text-muted">MRR today (€)<input name="mrr" class="input mt-1 text-sm" inputmode="decimal" placeholder="1 250" /></label>
				<label class="text-xs text-muted">Price per customer (€/month)<input name="arpu" class="input mt-1 text-sm" inputmode="decimal" value={data.arpu ? Math.round(data.arpu) : ''} placeholder="49" /></label>
			</div>
			<button class="btn btn-primary mt-2">Update</button>
		</form>
	</section>
{/if}

{#if adding || data.progress.length}
	<section class="mt-4">
		{#if !adding}
			<button class="pill" onclick={() => (adding = true)}>+ Add a goal</button>
		{:else}
			<form method="POST" action={act('add')} use:enhance={() => async ({ update, result }) => { await update({ reset: false }); if (result.type === 'success') adding = false; }} class="card grid gap-4 p-5 sm:p-7 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-end">
				<label class="text-sm"><span class="label">What do you want to grow?</span>
					<select name="metric" class="input mt-1.5" bind:value={metric}>{#each data.metrics as x (x.key)}<option value={x.key}>{x.label}</option>{/each}</select>
					{#if m}<span class="mt-1 block text-xs text-muted">{m.help}</span>{/if}
				</label>
				<label class="text-sm"><span class="label">Target ({m?.unit ?? ''})</span><input name="target" class="input mt-1.5" inputmode="decimal" placeholder={metric === 'mrr' ? '10000' : metric === 'visits_day' ? '100' : metric === 'conversion_rate' ? '3' : '30'} required /></label>
				<label class="text-sm"><span class="label">By</span><input name="deadline" type="date" class="input mt-1.5" value={inThreeMonths} required /></label>
				<div class="flex gap-2"><button class="btn btn-primary py-3">Save goal</button><button type="button" class="pill" onclick={() => (adding = false)}>Cancel</button></div>
				{#if form?.error}<p class="text-sm text-bad lg:col-span-4">{form.error}</p>{/if}
			</form>
		{/if}
	</section>
{/if}
