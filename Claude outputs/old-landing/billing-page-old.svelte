<script lang="ts">
	import { PLANS } from '#lib/plans.ts';
	let { data, form } = $props();
	const b = $derived(data.billing);
	const plan = $derived(PLANS[b.plan]);
	const daysLeft = $derived(Math.max(0, Math.ceil((Date.parse(b.trialEnds) - Date.now()) / 864e5)));
	const meters = $derived([
		{ label: 'Clients', used: data.clientsUsed, limit: plan.clients },
		{ label: 'AI requests', used: data.usage.ai, limit: plan.ai },
		{ label: 'SEO checks', used: data.usage.audits, limit: null },
		{ label: 'Fixes published', used: data.usage.fixes, limit: null },
		{ label: 'Heatmap events', used: data.usage.events, limit: null }
	]);
	const paid = ['freelance', 'agency', 'studio'] as const;
	const features = {
		freelance: ['3 clients', 'SEO audit + auto-fix', 'Heatmaps', 'Client reports'],
		agency: ['15 clients', 'Everything in Freelance', 'White-label reports', 'Team + client logins'],
		studio: ['50 clients', 'Everything in Agency', 'Own domain for reports', 'Priority support']
	};
</script>

<svelte:head><title>Billing & usage · Undercut</title></svelte:head>

{#if data.status === 'success'}<p class="mb-4 rounded-[20px] bg-good-bg p-4 text-sm text-good">Thank you — your subscription is active.</p>{/if}
{#if form?.switched}<p class="mb-4 rounded-[20px] bg-warn-bg p-4 text-sm text-warn">Switched to {PLANS[form.switched as keyof typeof PLANS].name} in demo mode — add your Stripe keys to take real payments.</p>{/if}
{#if form?.error}<p class="mb-4 rounded-[20px] bg-bad-bg p-4 text-sm text-bad">{form.error}</p>{/if}

<section class="grid gap-4 lg:grid-cols-[1fr_2fr]">
	<div class="card-dark flex flex-col gap-4 p-6 sm:p-7">
		<p class="text-sm text-white/60">Current plan</p>
		<p class="display text-[48px] leading-none">{plan.name}</p>
		<p class="text-sm text-white/60">{b.plan === 'trial' ? `${daysLeft} days left · then choose a plan` : `€${plan.price} / month · renews monthly`}</p>
		<form method="POST" action="?/portal" class="mt-auto">
			<button class="btn border border-white/25 text-white hover:bg-white hover:text-ink" disabled={!data.stripe}>Manage billing & invoices</button>
		</form>
		{#if !data.stripe}<p class="text-xs text-white/40">Connect Stripe (keys in .env) to take payments, send invoices and let agencies update their card.</p>{/if}
	</div>
	<div class="card p-6 sm:p-7">
		<h2 class="text-lg font-medium">Usage this month</h2>
		<div class="mt-5 grid gap-4 sm:grid-cols-2">
			{#each meters as m (m.label)}
				{@const pct = m.limit ? Math.min(100, (m.used / m.limit) * 100) : 0}
				<div class="rounded-[20px] bg-tile p-4">
					<div class="flex items-baseline justify-between"><p class="text-sm">{m.label}</p><p class="text-xs text-muted">{m.limit ? `of ${m.limit.toLocaleString('en-US')}` : 'unlimited'}</p></div>
					<p class="big mt-2 text-[36px]">{m.used.toLocaleString('en-US')}</p>
					{#if m.limit}<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-white"><div class="h-full rounded-full {pct >= 90 ? 'bg-bad' : 'bg-ink'}" style="width:{pct}%"></div></div>{/if}
				</div>
			{/each}
		</div>
	</div>
</section>

<section class="mt-10">
	<h2 class="display text-[40px] sm:text-[48px]">Plans</h2>
	<div class="mt-5 grid gap-4 md:grid-cols-3">
		{#each paid as id (id)}
			{@const p = PLANS[id]}
			{@const current = b.plan === id}
			<form method="POST" action="?/choose" class="flex flex-col gap-4 p-6 {id === 'agency' ? 'card-dark' : 'card'}">
				<input type="hidden" name="plan" value={id} />
				<div class="flex items-center justify-between"><p class="font-medium">{p.name}</p>{#if id === 'agency'}<span class="rounded-full bg-accent px-2.5 py-0.5 text-[11px] text-accent-ink">Popular</span>{/if}</div>
				<p><span class="big text-[52px]">€{p.price}</span><span class="text-sm opacity-60"> / month</span></p>
				<ul class="space-y-1.5 text-sm {id === 'agency' ? 'text-white/70' : 'text-ink-2'}">{#each features[id] as f (f)}<li>✓ {f}</li>{/each}</ul>
				<button class="btn mt-auto {current ? 'btn-ghost opacity-60' : id === 'agency' ? 'btn-accent' : 'btn-primary'}" disabled={current}>{current ? 'Current plan' : `Choose ${p.name}`}</button>
			</form>
		{/each}
	</div>
</section>
