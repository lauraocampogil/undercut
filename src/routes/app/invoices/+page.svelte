<script lang="ts">
	import { enhance } from '$app/forms';
	import { eur, short, STATUS_LABEL, todayIso } from '#lib/biz-format.ts';
	let { data, form } = $props();
	import { untrack } from 'svelte';
	let tab = $state<'invoices' | 'quotes' | 'settings'>(untrack(() => data.tab as 'invoices'));
	const t = todayIso();
	const cur = $derived(data.details.currency);
	const list = $derived(data.docs.filter((d) => (tab === 'quotes' ? d.kind === 'quote' : d.kind === 'invoice')));
	const ready = $derived(Boolean(data.details.legalName && data.details.address));
</script>

<svelte:head><title>Quotes & invoices · Undercut</title></svelte:head>

<header class="flex flex-wrap items-end justify-between gap-4">
	<h1 class="text-[34px] leading-tight font-medium tracking-tight sm:text-[44px]">Quotes & invoices</h1>
	{#if data.clients.length}
		<form method="POST" action="?/newDoc" class="flex flex-wrap gap-2">
			<select name="clientId" required class="input w-48 text-sm" aria-label="Client"><option value="">Choose a client…</option>{#each data.clients as c (c.id)}<option value={c.id}>{c.name}</option>{/each}</select>
			<button name="kind" value="invoice" class="btn btn-primary">New invoice</button>
			<button name="kind" value="quote" class="pill">New quote</button>
		</form>
	{/if}
</header>
{#if form?.docError}<p class="mt-3 text-sm text-bad">{form.docError}</p>{/if}

<div class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
	<div class="card p-5"><p class="text-xs text-muted">Paid this month</p><p class="mt-1 text-3xl font-medium">{eur(data.money.paidMonth, cur)}</p></div>
	<div class="card p-5"><p class="text-xs text-muted">Waiting for payment</p><p class="mt-1 text-3xl font-medium">{eur(data.money.unpaid, cur)}</p><p class="text-xs text-muted">{data.money.unpaidCount} invoice{data.money.unpaidCount === 1 ? '' : 's'}</p></div>
	<div class="card p-5"><p class="text-xs text-muted">Overdue</p><p class="mt-1 text-3xl font-medium {data.money.overdue ? 'text-bad' : ''}">{data.money.overdue}</p></div>
	<div class="card p-5"><p class="text-xs text-muted">Quotes waiting for an answer</p><p class="mt-1 text-3xl font-medium">{eur(data.money.openQuotes, cur)}</p></div>
</div>

{#if !ready && tab !== 'settings'}
	<p class="mt-4 rounded-[18px] bg-warn-bg p-4 text-sm text-warn">Add your business details (legal name, address, VAT, IBAN) so they appear on your invoices. <button class="underline" onclick={() => (tab = 'settings')}>Add them</button></p>
{/if}

<div class="mt-6 flex gap-2">
	<button class="pill {tab === 'invoices' ? 'pill-active' : ''}" onclick={() => (tab = 'invoices')}>Invoices</button>
	<button class="pill {tab === 'quotes' ? 'pill-active' : ''}" onclick={() => (tab = 'quotes')}>Quotes</button>
	<button class="pill {tab === 'settings' ? 'pill-active' : ''}" onclick={() => (tab = 'settings')}>Business details</button>
</div>

{#if tab === 'settings'}
	<form method="POST" action="?/details" use:enhance={() => async ({ update }) => update({ reset: false })} class="card mt-4 grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
		<p class="text-sm text-ink-2 sm:col-span-2">These details are printed on every quote and invoice.</p>
		<label class="text-sm"><span class="label">Legal name</span><input name="legalName" value={data.details.legalName ?? ''} class="input mt-1.5" placeholder="Your company or your own name" /></label>
		<label class="text-sm"><span class="label">VAT number</span><input name="vatNumber" value={data.details.vatNumber ?? ''} class="input mt-1.5" /></label>
		<label class="text-sm sm:col-span-2"><span class="label">Address</span><input name="address" value={data.details.address ?? ''} class="input mt-1.5" /></label>
		<label class="text-sm"><span class="label">Email on invoices</span><input name="email" type="email" value={data.details.email ?? ''} class="input mt-1.5" /></label>
		<label class="text-sm"><span class="label">Phone</span><input name="phone" value={data.details.phone ?? ''} class="input mt-1.5" /></label>
		<label class="text-sm"><span class="label">IBAN (for payment)</span><input name="iban" value={data.details.iban ?? ''} class="input mt-1.5" /></label>
		<div class="grid grid-cols-2 gap-3">
			<label class="text-sm"><span class="label">Default VAT %</span><input name="vat" inputmode="decimal" value={data.details.vat} class="input mt-1.5" /></label>
			<label class="text-sm"><span class="label">Pay within (days)</span><input name="payDays" inputmode="numeric" value={data.details.payDays} class="input mt-1.5" /></label>
		</div>
		<label class="text-sm sm:col-span-2"><span class="label">Footer note (optional)</span><input name="footer" value={data.details.footer ?? ''} class="input mt-1.5" placeholder="Thank you for your trust." /></label>
		<div class="flex items-center gap-3 sm:col-span-2"><button class="btn btn-primary">Save</button>{#if form?.detailsSaved}<span class="text-sm text-good">Saved ✓</span>{/if}</div>
	</form>
{:else if !data.clients.length && !data.docs.length}
	<div class="card mt-4 p-8 text-center">
		<p class="text-lg font-medium">Add a client first</p>
		<p class="mx-auto mt-2 max-w-md text-sm text-ink-2">Quotes and invoices are made for a client. Add one, then come back here.</p>
		<a href="/app/crm" class="btn btn-primary mt-5">Go to Clients</a>
	</div>
{:else}
	<div class="card mt-4 overflow-hidden">
		<table class="w-full text-left text-sm">
			<thead class="border-b border-line text-xs text-muted"><tr><th class="px-5 py-3 font-normal">Number</th><th class="px-3 py-3 font-normal">Client</th><th class="hidden px-3 py-3 font-normal sm:table-cell">Date</th><th class="px-3 py-3 font-normal">Total</th><th class="px-5 py-3 font-normal">Status</th></tr></thead>
			<tbody>
				{#each list as d (d.id)}
					{@const late = d.kind === 'invoice' && d.status === 'sent' && d.due && d.due < t}
					<tr class="relative border-b border-line last:border-0 hover:bg-black/[.02]">
						<td class="px-5 py-3.5"><a href="/app/invoices/{d.id}" class="font-medium after:absolute after:inset-0">{d.number}</a></td>
						<td class="px-3 py-3.5">{d.client}</td>
						<td class="hidden px-3 py-3.5 text-ink-2 sm:table-cell">{short(d.date)}</td>
						<td class="px-3 py-3.5">{eur(d.total, cur)}</td>
						<td class="px-5 py-3.5"><span class="rounded-full px-2.5 py-1 text-xs {late ? 'bg-bad-bg text-bad' : d.status === 'paid' || d.status === 'accepted' ? 'bg-good-bg text-good' : 'bg-tile text-ink-2'}">{late ? 'Overdue' : STATUS_LABEL[d.status]}</span></td>
					</tr>
				{:else}
					<tr><td colspan="5" class="px-5 py-6 text-center text-muted">No {tab} yet. Choose a client above and press “New {tab === 'quotes' ? 'quote' : 'invoice'}”.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
