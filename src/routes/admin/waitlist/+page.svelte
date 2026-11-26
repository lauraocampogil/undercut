<script lang="ts">
	let { data, form } = $props();
	let sending = $state(false);
	let q = $state('');
	const list = $derived(data.people.filter((p) => !q || JSON.stringify(p).toLowerCase().includes(q.toLowerCase())));
	function csv() {
		const cols = Object.keys(data.people[0] ?? {}) as (keyof (typeof data.people)[0])[];
		const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
		const body = [cols.join(','), ...data.people.map((p) => cols.map((c) => cell(p[c])).join(','))].join('\n');
		const a = document.createElement('a');
		a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' }));
		a.download = `undercut-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
	}
</script>

<svelte:head><title>Waitlist · Undercut admin</title></svelte:head>

<main class="mx-auto flex max-w-[1240px] flex-col gap-8 px-5 py-10 sm:px-8">
	<header class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<a href="/" class="text-sm text-muted">← Undercut</a>
			<h1 class="mt-2 text-4xl font-medium tracking-tight">Waitlist</h1>
			<p class="mt-1 text-ink-2">{data.total} people · {data.yes} would pay today</p>
		</div>
		<div class="flex gap-2">
			<a href="/waitlist" target="_blank" class="btn btn-ghost">Open the form ↗</a>
			<button class="btn btn-primary" onclick={csv} disabled={!data.total}>Download CSV</button>
		</div>
	</header>

	<section class="card flex flex-wrap items-center justify-between gap-4 p-6">
		<div>
			<p class="font-medium">Seats · {data.freeTaken} of {data.seatsFree} free · {data.founderTaken} of {data.seats} at €29</p>
			<p class="mt-1 text-sm text-ink-2">Seats are given when people confirm their email. {data.unconfirmed} people haven’t confirmed yet. <a href="/admin/feedback" class="underline">Beta feedback →</a></p>
			{#if form && 'reminded' in form}<p class="mt-2 text-sm text-good">Confirmation email sent to {form.reminded} people.</p>{/if}
		</div>
		<form method="POST" action="?/remind" onsubmit={(e) => { if (!confirm(`Send the confirmation email to the ${data.unconfirmed} people who haven’t confirmed?`)) e.preventDefault(); }}>
			<button class="btn btn-primary" disabled={!data.unconfirmed}>Send confirmation emails</button>
		</form>
	</section>

	<section class="card flex flex-col gap-4 p-6">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<p class="font-medium">Opening</p>
				<p class="mt-1 text-sm text-ink-2">{Math.min(data.total, data.openAt)} of {data.openAt} answers. The first {data.seats} places get the founding price.</p>
			</div>
			{#if data.sent}
				<p class="text-sm text-good">Opening email sent on {data.sent.slice(0, 10)}.</p>
			{:else}
				<form method="POST" action="?/open" onsubmit={(e) => { if (!confirm(`Send the opening email to all ${data.total} people?`)) e.preventDefault(); else sending = true; }}>
					<button class="btn btn-primary" disabled={sending || !data.total}>{sending ? 'Sending…' : 'Send the opening email'}</button>
				</form>
			{/if}
		</div>
		<div class="h-2 overflow-hidden rounded-full bg-tile"><div class="h-full rounded-full bg-ink" style="width:{Math.min(100, (data.total / data.openAt) * 100)}%"></div></div>
		<ol class="grid gap-1 text-sm text-ink-2 sm:grid-cols-3">
			<li>{data.founderPrice ? '✓' : '○'} STRIPE_PRICE_FOUNDER (€29) added</li>
			<li>{data.waitlistOn ? '○' : '✓'} WAITLIST turned off on the server</li>
			<li>{data.sent ? '✓' : '○'} Opening email sent</li>
		</ol>
		{#if form && 'error' in form && form.error}<p class="rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">{form.error}</p>{/if}
		{#if form && 'sent' in form}<p class="rounded-xl bg-good-bg px-4 py-3 text-sm text-good">Sent to {form.sent} people.</p>{/if}
	</section>

	<section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.charts as c}
			<div class="card p-5">
				<p class="font-medium">{c.title}</p>
				<ul class="mt-4 flex flex-col gap-2.5">
					{#each c.items as it}
						{@const max = Math.max(1, ...c.items.map((x) => x.n))}
						<li class="text-sm">
							<div class="flex justify-between gap-3"><span class="truncate text-ink-2">{it.label}</span><span class="font-medium">{it.n}</span></div>
							<div class="mt-1 h-1.5 rounded-full bg-tile"><div class="h-full rounded-full bg-ink" style="width:{(it.n / max) * 100}%"></div></div>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</section>

	<section class="flex flex-col gap-4">
		<div class="flex items-center justify-between gap-4">
			<h2 class="text-2xl font-medium tracking-tight">Answers</h2>
			<input class="input max-w-xs" placeholder="Search answers" bind:value={q} />
		</div>
		{#each list as p (p.email)}
			<article class="card grid gap-4 p-5 md:grid-cols-[1fr_2fr]">
				<div class="text-sm">
					<p class="font-medium">{p.name || '—'} <span class="font-normal text-muted">#{p.place}</span></p>
					<a href="mailto:{p.email}" class="text-ink-2 underline">{p.email}</a>
					<p class="mt-2 text-muted">{p.role} · {p.stage}</p>
					{#if p.building}<p class="mt-1 break-words">{p.building}</p>{/if}
					<p class="mt-2"><span class="rounded-full border border-line px-2.5 py-1 text-xs">{p.pay || 'no answer'}{p.price ? ` · fair: ${p.price}` : ''}</span></p>
					<p class="mt-2 text-xs text-muted">{p.at} · {p.lang}{p.invitedBy ? ` · invited by ${p.invitedBy}` : ''}</p>
					<form method="POST" action="?/remove" onsubmit={(e) => { if (!confirm(`Remove ${p.email} from the waitlist?`)) e.preventDefault(); }}><input type="hidden" name="email" value={p.email} /><button class="mt-2 text-xs text-muted underline">Remove</button></form>
				</div>
				<dl class="grid gap-3 text-sm">
					{#if p.pain}<div><dt class="text-xs text-muted">Hardest part today</dt><dd>{p.pain}</dd></div>{/if}
					{#if p.feature}<div><dt class="text-xs text-muted">The one thing</dt><dd>{p.feature}</dd></div>{/if}
					{#if p.paid}<div><dt class="text-xs text-muted">Pays for today</dt><dd>{p.paid}</dd></div>{/if}
					{#if p.other}<div><dt class="text-xs text-muted">Other</dt><dd>{p.other}</dd></div>{/if}
				</dl>
			</article>
		{:else}
			<p class="card p-8 text-center text-sm text-muted">No answers yet.</p>
		{/each}
	</section>
</main>
