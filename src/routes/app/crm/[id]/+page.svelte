<script lang="ts">
	import { enhance } from '$app/forms';
	import { eur, host, href, short, STATUS_LABEL, todayIso } from '#lib/biz-format.ts';
	let { data, form } = $props();
	const c = $derived(data.client);
	let editing = $state(false);
	let checking = $state(false);
	const keep = () => async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => update({ reset: false });
	const clear = () => async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => update();
	const t = todayIso();
	const paid = $derived(data.docs.filter((d) => d.kind === 'invoice' && d.status === 'paid').reduce((s, d) => s + d.total, 0));
	const unpaid = $derived(data.docs.filter((d) => d.kind === 'invoice' && d.status === 'sent').reduce((s, d) => s + d.total, 0));
	const speed = (ms: number) => (ms < 1500 ? 'Fast' : ms < 3500 ? 'OK' : 'Slow');
</script>

<svelte:head><title>{c.name} · Clients · Undercut</title></svelte:head>

<a href="/app/crm" class="text-sm text-muted hover:text-ink">← Clients</a>
<header class="mt-2 flex flex-wrap items-end justify-between gap-4">
	<div>
		<h1 class="text-[34px] leading-tight font-medium tracking-tight sm:text-[44px]">{c.name}</h1>
		<p class="mt-1 text-sm text-ink-2">
			<span class="rounded-full px-2.5 py-0.5 text-xs {c.status === 'active' ? 'bg-good-bg text-good' : 'bg-tile'}">{STATUS_LABEL[c.status]}</span>
			{#if c.fee}<span class="ml-2">{eur(c.fee, data.currency)} / month</span>{/if}
			{#if c.since}<span class="ml-2 text-muted">client since {short(c.since)}</span>{/if}
		</p>
	</div>
	<div class="flex flex-wrap gap-2">
		<form method="POST" action="?/newDoc"><input type="hidden" name="kind" value="invoice" /><input type="hidden" name="clientId" value={c.id} /><button class="btn btn-primary">New invoice</button></form>
		<form method="POST" action="?/newDoc"><input type="hidden" name="kind" value="quote" /><input type="hidden" name="clientId" value={c.id} /><button class="pill">New quote</button></form>
		<button class="pill" onclick={() => (editing = !editing)}>{editing ? 'Close' : 'Edit'}</button>
	</div>
</header>

<div class="mt-6 grid items-stretch gap-4 lg:grid-cols-3">
	<!-- details -->
	<section class="card p-5 sm:p-6 lg:col-span-2">
		{#if editing}
			<form method="POST" action="?/client" use:enhance={() => async ({ update, result }) => { await update({ reset: false }); if (result.type === 'success') editing = false; }} class="grid gap-4 sm:grid-cols-2">
				<input type="hidden" name="id" value={c.id} />
				<label class="text-sm"><span class="label">Name *</span><input name="name" required value={c.name} class="input mt-1.5" /></label>
				<label class="text-sm"><span class="label">Contact person</span><input name="contact" value={c.contact ?? ''} class="input mt-1.5" /></label>
				<label class="text-sm"><span class="label">Email</span><input name="email" type="email" value={c.email ?? ''} class="input mt-1.5" /></label>
				<label class="text-sm"><span class="label">Phone</span><input name="phone" value={c.phone ?? ''} class="input mt-1.5" /></label>
				<label class="text-sm"><span class="label">Website</span><input name="website" value={c.website ?? ''} class="input mt-1.5" /></label>
				<label class="text-sm"><span class="label">Monthly fee (€)</span><input name="fee" inputmode="decimal" value={c.fee ?? ''} class="input mt-1.5" /></label>
				<label class="text-sm"><span class="label">Address (for invoices)</span><input name="address" value={c.address ?? ''} class="input mt-1.5" /></label>
				<label class="text-sm"><span class="label">VAT number</span><input name="vatNumber" value={c.vatNumber ?? ''} class="input mt-1.5" /></label>
				<label class="text-sm"><span class="label">Services (comma separated)</span><input name="services" value={c.services.join(', ')} class="input mt-1.5" /></label>
				<div class="grid grid-cols-2 gap-3">
					<label class="text-sm"><span class="label">Status</span><select name="status" class="input mt-1.5">{#each ['active', 'paused', 'ended'] as s (s)}<option value={s} selected={c.status === s}>{STATUS_LABEL[s]}</option>{/each}</select></label>
					<label class="text-sm"><span class="label">Client since</span><input name="since" type="date" value={c.since ?? ''} class="input mt-1.5" /></label>
				</div>
				<label class="text-sm sm:col-span-2"><span class="label">Notes</span><textarea name="notes" rows="4" class="input mt-1.5">{c.notes ?? ''}</textarea></label>
				{#if form?.clientError}<p class="text-sm text-bad sm:col-span-2">{form.clientError}</p>{/if}
				<div class="flex items-center justify-between sm:col-span-2">
					<button class="btn btn-primary">Save</button>
				</div>
			</form>
			<form method="POST" action="?/deleteClient" class="mt-4 border-t border-line pt-4" onsubmit={(e) => { if (!confirm(`Delete ${c.name}? Tasks stay, invoices are kept for your accounting.`)) e.preventDefault(); }}>
				<input type="hidden" name="id" value={c.id} /><button class="text-xs text-bad underline">Delete this client</button>
			</form>
		{:else}
			<dl class="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
				<div><dt class="label">Contact</dt><dd class="mt-1">{c.contact || '—'}</dd></div>
				<div><dt class="label">Email</dt><dd class="mt-1">{#if c.email}<a class="underline" href="mailto:{c.email}">{c.email}</a>{:else}—{/if}</dd></div>
				<div><dt class="label">Phone</dt><dd class="mt-1">{#if c.phone}<a class="underline" href="tel:{c.phone}">{c.phone}</a>{:else}—{/if}</dd></div>
				<div><dt class="label">Website</dt><dd class="mt-1">{#if c.website}<a class="underline" href={href(c.website)} target="_blank" rel="noopener">{host(c.website)}</a>{:else}—{/if}</dd></div>
				<div><dt class="label">Services</dt><dd class="mt-1">{c.services.join(', ') || '—'}</dd></div>
				<div><dt class="label">Address</dt><dd class="mt-1">{c.address || '—'}{c.vatNumber ? ` · VAT ${c.vatNumber}` : ''}</dd></div>
				<div class="sm:col-span-2"><dt class="label">Notes</dt><dd class="mt-1 whitespace-pre-line text-ink-2">{c.notes || 'No notes yet.'}</dd></div>
			</dl>
		{/if}
	</section>

	<!-- money + site -->
	<section class="card flex flex-col gap-5 p-5 sm:p-6">
		<div class="grid grid-cols-2 gap-3">
			<div class="rounded-[18px] bg-tile p-4"><p class="text-xs text-muted">Paid so far</p><p class="mt-1 text-2xl font-medium">{eur(paid, data.currency)}</p></div>
			<div class="rounded-[18px] bg-tile p-4"><p class="text-xs text-muted">Waiting for payment</p><p class="mt-1 text-2xl font-medium">{eur(unpaid, data.currency)}</p></div>
		</div>
		<div>
			<p class="label">Website check</p>
			{#if c.site}
				{#if c.site.status >= 200 && c.site.status < 400}
					<ul class="mt-2 space-y-1.5 text-sm">
						<li>● <span class="text-good">Online</span> <span class="text-muted">({c.site.status})</span></li>
						<li>● {speed(c.site.ms)} <span class="text-muted">({(c.site.ms / 1000).toFixed(1)} s to load)</span></li>
						<li>● {c.site.https ? 'Secure (HTTPS)' : 'Not secure: no HTTPS'}</li>
						<li>● {c.site.mobile ? 'Mobile-friendly' : 'Not set up for mobile'}</li>
					</ul>
				{:else}
					<p class="mt-2 text-sm text-bad">● Not answering{c.site.status ? ` (error ${c.site.status})` : ''}</p>
				{/if}
				<p class="mt-2 text-xs text-muted">Checked {new Date(c.site.at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
			{:else}
				<p class="mt-2 text-sm text-ink-2">{c.website ? 'Check if the site is online, fast and secure.' : 'Add a website to check it.'}</p>
			{/if}
			{#if c.website}
				<form method="POST" action="?/checkSite" use:enhance={() => { checking = true; return async ({ update }) => { await update({ reset: false }); checking = false; }; }} class="mt-3">
					<input type="hidden" name="id" value={c.id} /><button class="pill text-sm" disabled={checking}>{checking ? 'Checking…' : c.site ? 'Check again' : 'Check now'}</button>
				</form>
			{/if}
			{#if form?.siteError}<p class="mt-2 text-sm text-bad">{form.siteError}</p>{/if}
		</div>
		<div class="mt-auto border-t border-line pt-4">
			<p class="label">Analytics</p>
			{#if data.tracked}
				<p class="mt-1 text-sm text-ink-2">Visits, leads, Google, heatmaps and SEO fixes for this site.</p>
				<a href="/app/clients/{data.tracked.id}" class="btn btn-primary mt-3 text-sm">Open analytics →</a>
			{:else}
				<p class="mt-1 text-sm text-ink-2">Track visits, leads, Google, heatmaps and SEO for {c.name}.</p>
				<a href="/app/clients/new?crm={c.id}&name={encodeURIComponent(c.name)}&domain={encodeURIComponent(c.website ?? '')}" class="pill mt-3 text-sm">Track this site or app</a>
			{/if}
		</div>
	</section>

	<!-- tasks -->
	<section class="card min-w-0 p-5 sm:p-6">
		<h2 class="font-medium">Tasks</h2>
		<form method="POST" action="?/task" use:enhance={clear} class="mt-3 grid gap-2">
			<input type="hidden" name="clientId" value={c.id} />
			<input name="title" required placeholder="New task" class="input text-sm" />
			<div class="flex gap-2"><input name="due" type="date" class="input min-w-0 flex-1 text-sm" aria-label="Due date" /><button class="pill shrink-0 text-sm">Add</button></div>
		</form>
		<ul class="mt-3 divide-y divide-line">
			{#each data.tasks as k (k.id)}
				<li class="flex items-center gap-3 py-2 text-sm">
					<form method="POST" action="?/toggleTask" use:enhance={keep}><input type="hidden" name="id" value={k.id} /><button class="grid size-5 place-items-center rounded-md border {k.done ? 'border-ink bg-ink text-white' : 'border-line'}" aria-label={k.done ? 'Mark as not done' : 'Mark as done'}>{k.done ? '✓' : ''}</button></form>
					<span class="flex-1 {k.done ? 'text-muted line-through' : ''}">{k.title}</span>
					{#if k.due}<span class="text-xs {!k.done && k.due < t ? 'text-bad' : 'text-muted'}">{short(k.due)}</span>{/if}
				</li>
			{:else}
				<li class="py-2 text-sm text-muted">No tasks for this client.</li>
			{/each}
		</ul>
	</section>

	<!-- meetings -->
	<section class="card min-w-0 p-5 sm:p-6">
		<h2 class="font-medium">Meetings</h2>
		<form method="POST" action="?/meeting" use:enhance={clear} class="mt-3 grid gap-2">
			<input type="hidden" name="clientId" value={c.id} />
			<input name="title" required placeholder="Call, workshop, shoot…" class="input text-sm" />
			<div class="grid grid-cols-[1fr_auto] gap-2"><input name="date" type="date" required class="input min-w-0 text-sm" aria-label="Date" /><input name="time" type="time" class="input w-28 min-w-0 text-sm" aria-label="Time" /></div>
			<button class="pill justify-self-start text-sm">Add meeting</button>
		</form>
		<ul class="mt-3 divide-y divide-line">
			{#each data.meetings as m (m.id)}
				<li class="py-2 text-sm"><b class="font-medium">{m.title}</b> <span class="text-muted">· {short(m.date)}{m.time ? ` · ${m.time}` : ''}</span></li>
			{:else}
				<li class="py-2 text-sm text-muted">Nothing planned.</li>
			{/each}
		</ul>
	</section>

	<!-- documents -->
	<section class="card min-w-0 p-5 sm:p-6">
		<h2 class="font-medium">Quotes & invoices</h2>
		<ul class="mt-3 divide-y divide-line">
			{#each data.docs as d (d.id)}
				<li><a href="/app/invoices/{d.id}" class="flex items-center gap-3 py-2 text-sm hover:underline"><span class="flex-1">{d.number}</span><span class="text-muted">{STATUS_LABEL[d.status]}</span><span>{eur(d.total, data.currency)}</span></a></li>
			{:else}
				<li class="py-2 text-sm text-muted">No quotes or invoices yet.</li>
			{/each}
		</ul>
	</section>
</div>
