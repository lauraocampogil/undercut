<script lang="ts">
	import { enhance } from '$app/forms';
	import { eur, short, STATUS_LABEL } from '#lib/biz-format.ts';
	let { data, form } = $props();
	const d = $derived(data.doc);
	const cur = $derived(data.details.currency);
	const isQuote = $derived(d.kind === 'quote');
	const title = $derived(isQuote ? 'Quote' : 'Invoice');

	// editable copy of the lines (live totals while typing)
	let lines = $state<{ desc: string; qty: number; price: number }[]>([]);
	let vat = $state(0);
	let dirty = $state(false);
	$effect.pre(() => {
		// a new document opened (or saved): start from what the server has
		lines = data.doc.lines.length ? data.doc.lines.map((l) => ({ ...l })) : [{ desc: '', qty: 1, price: 0 }];
		vat = data.doc.vat;
		dirty = false;
	});
	const net = $derived(lines.reduce((t, l) => t + (Number(l.qty) || 0) * (Number(l.price) || 0), 0));
	const tax = $derived(Math.round(net * (Number(vat) || 0)) / 100);
	const STATUSES = $derived(isQuote ? ['draft', 'sent', 'accepted', 'declined'] : ['draft', 'sent', 'paid']);
	const mail = $derived(
		data.client?.email
			? `mailto:${data.client.email}?subject=${encodeURIComponent(`${title} ${d.number} · ${data.agencyName}`)}&body=${encodeURIComponent(`Hello${data.client.contact ? ' ' + data.client.contact.split(' ')[0] : ''},\n\nPlease find attached ${isQuote ? 'our quote' : 'invoice'} ${d.number} for ${eur(net + tax, cur)}.${!isQuote && d.due ? `\nPayment is due on ${short(d.due)}${data.details.iban ? ` to ${data.details.iban}` : ''}.` : ''}\n\nThank you,\n${data.agencyName}`)}`
			: null
	);
</script>

<svelte:head><title>{d.number} · Undercut</title></svelte:head>

<div class="no-print">
	<a href="/app/invoices{isQuote ? '?tab=quotes' : ''}" class="text-sm text-muted hover:text-ink">← Quotes & invoices</a>
	<header class="mt-2 flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-[34px] leading-tight font-medium tracking-tight sm:text-[44px]">{title} {d.number}</h1>
			<p class="mt-1 text-sm text-ink-2">{data.client?.name ?? 'Deleted client'} · {STATUS_LABEL[d.status]}{d.paidAt ? ` on ${short(d.paidAt.slice(0, 10))}` : ''}</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<button class="btn btn-primary" onclick={() => window.print()} disabled={dirty} title={dirty ? 'Save first' : ''}>Download PDF</button>
			{#if mail}<a class="pill" href={mail}>Email to client</a>{/if}
			{#if isQuote && !data.invoiced}<form method="POST" action="?/quoteToInvoice"><input type="hidden" name="id" value={d.id} /><button class="pill">Turn into invoice</button></form>{/if}
			{#if data.invoiced}<a class="pill" href="/app/invoices/{data.invoiced.id}">Invoice {data.invoiced.number} →</a>{/if}
		</div>
	</header>

	<div class="mt-4 flex flex-wrap items-center gap-2">
		<span class="text-sm text-muted">Status:</span>
		{#each STATUSES as s (s)}
			<form method="POST" action="?/docStatus" use:enhance={() => async ({ update }) => update({ reset: false })}><input type="hidden" name="id" value={d.id} /><input type="hidden" name="status" value={s} /><button class="pill text-sm {d.status === s ? 'pill-active' : ''}">{STATUS_LABEL[s]}</button></form>
		{/each}
	</div>

	<form method="POST" action="?/saveDoc" use:enhance={() => async ({ update }) => { await update({ reset: false }); dirty = false; }} oninput={() => (dirty = true)} class="card mt-5 p-5 sm:p-6">
		<input type="hidden" name="id" value={d.id} />
		<div class="grid gap-4 sm:grid-cols-4">
			<label class="text-sm sm:col-span-2"><span class="label">Client</span><select name="clientId" class="input mt-1.5" onchange={() => (dirty = true)}>{#each data.clients as c (c.id)}<option value={c.id} selected={c.id === d.clientId}>{c.name}</option>{/each}</select></label>
			<label class="text-sm"><span class="label">Date</span><input name="date" type="date" value={d.date} class="input mt-1.5" /></label>
			<label class="text-sm"><span class="label">{isQuote ? 'Valid until' : 'Due'}</span><input name="due" type="date" value={d.due ?? ''} class="input mt-1.5" /></label>
		</div>

		<div class="mt-6">
			<div class="hidden grid-cols-[1fr_80px_120px_110px_32px] gap-2 px-1 text-xs text-muted sm:grid"><span>Description</span><span>Qty</span><span>Unit price (€)</span><span class="text-right">Amount</span><span></span></div>
			{#each lines as l, i (i)}
				<div class="mt-2 grid grid-cols-[1fr_70px] gap-2 sm:grid-cols-[1fr_80px_120px_110px_32px] sm:items-center">
					<input name="desc" bind:value={l.desc} placeholder="Website design, monthly SEO…" class="input col-span-2 text-sm sm:col-span-1" />
					<input name="qty" bind:value={l.qty} inputmode="decimal" class="input text-sm" aria-label="Quantity" />
					<input name="price" bind:value={l.price} inputmode="decimal" class="input text-sm" aria-label="Unit price" />
					<span class="text-right text-sm">{eur((Number(l.qty) || 0) * (Number(l.price) || 0), cur)}</span>
					<button type="button" class="text-muted hover:text-bad" aria-label="Remove line" onclick={() => { lines = lines.filter((_, j) => j !== i); dirty = true; }}>✕</button>
				</div>
			{/each}
			<button type="button" class="pill mt-3 text-sm" onclick={() => { lines = [...lines, { desc: '', qty: 1, price: 0 }]; dirty = true; }}>+ Add a line</button>
		</div>

		<div class="mt-6 flex flex-wrap items-end justify-between gap-6">
			<label class="w-full max-w-md text-sm"><span class="label">Note on the document</span><textarea name="notes" rows="3" class="input mt-1.5" placeholder="Payment terms, project scope…">{d.notes ?? ''}</textarea></label>
			<dl class="ml-auto w-64 space-y-1.5 text-sm">
				<div class="flex justify-between"><dt class="text-muted">Subtotal</dt><dd>{eur(net, cur)}</dd></div>
				<div class="flex items-center justify-between gap-2"><dt class="text-muted">VAT <input name="vat" bind:value={vat} inputmode="decimal" class="input ml-1 inline-block w-16 px-2 py-1 text-sm" aria-label="VAT percent" />%</dt><dd>{eur(tax, cur)}</dd></div>
				<div class="flex justify-between border-t border-line pt-2 text-base font-medium"><dt>Total</dt><dd>{eur(net + tax, cur)}</dd></div>
			</dl>
		</div>
		<div class="mt-6 flex flex-wrap items-center gap-3">
			<button class="btn btn-primary">Save</button>
			{#if dirty}<span class="text-sm text-warn">Unsaved changes</span>{:else if form?.docSaved}<span class="text-sm text-good">Saved ✓</span>{/if}
		</div>
	</form>

	<form method="POST" action="?/deleteDoc" class="mt-4" onsubmit={(e) => { if (!confirm(`Delete ${d.number}?`)) e.preventDefault(); }}>
		<input type="hidden" name="id" value={d.id} /><button class="text-xs text-muted underline hover:text-bad">Delete this {title.toLowerCase()}</button>
	</form>
	{#if !data.details.legalName}<p class="mt-4 text-sm text-warn">Your business details are missing from the PDF. <a class="underline" href="/app/invoices?tab=settings">Add them</a>.</p>{/if}
</div>

<!-- the printed document (Download PDF = print → Save as PDF) -->
<article class="print-doc hidden w-full bg-white p-12 text-[13px] leading-relaxed text-black print:block">
	<div class="flex justify-between gap-8">
		<div>
			<p class="text-xl font-semibold">{data.details.legalName || data.agencyName}</p>
			{#if data.details.address}<p>{data.details.address}</p>{/if}
			{#if data.details.vatNumber}<p>VAT {data.details.vatNumber}</p>{/if}
			{#if data.details.email}<p>{data.details.email}</p>{/if}
			{#if data.details.phone}<p>{data.details.phone}</p>{/if}
		</div>
		<div class="text-right">
			<p class="text-3xl font-semibold">{title}</p>
			<p class="mt-1">{d.number}</p>
			<p>Date: {short(d.date)}</p>
			{#if d.due}<p>{isQuote ? 'Valid until' : 'Due'}: {short(d.due)}</p>{/if}
		</div>
	</div>
	<div class="mt-10">
		<p class="text-xs text-gray-500 uppercase">{isQuote ? 'For' : 'Bill to'}</p>
		<p class="font-medium">{data.client?.name ?? ''}</p>
		{#if data.client?.contact}<p>{data.client.contact}</p>{/if}
		{#if data.client?.address}<p>{data.client.address}</p>{/if}
		{#if data.client?.vatNumber}<p>VAT {data.client.vatNumber}</p>{/if}
	</div>
	<table class="mt-8 w-full">
		<thead><tr class="border-b border-black text-left"><th class="py-2 font-medium">Description</th><th class="py-2 text-right font-medium">Qty</th><th class="py-2 text-right font-medium">Unit price</th><th class="py-2 text-right font-medium">Amount</th></tr></thead>
		<tbody>
			{#each d.lines as l, i (i)}<tr class="border-b border-gray-200"><td class="py-2">{l.desc}</td><td class="py-2 text-right">{l.qty}</td><td class="py-2 text-right">{eur(l.price, cur)}</td><td class="py-2 text-right">{eur(l.qty * l.price, cur)}</td></tr>{/each}
		</tbody>
	</table>
	<div class="mt-4 ml-auto w-64 space-y-1">
		<div class="flex justify-between"><span>Subtotal</span><span>{eur(d.lines.reduce((t, l) => t + l.qty * l.price, 0), cur)}</span></div>
		<div class="flex justify-between"><span>VAT {d.vat}%</span><span>{eur(Math.round(d.lines.reduce((t, l) => t + l.qty * l.price, 0) * d.vat) / 100, cur)}</span></div>
		<div class="flex justify-between border-t border-black pt-1 text-base font-semibold"><span>Total</span><span>{eur(d.lines.reduce((t, l) => t + l.qty * l.price, 0) + Math.round(d.lines.reduce((t, l) => t + l.qty * l.price, 0) * d.vat) / 100, cur)}</span></div>
	</div>
	{#if d.notes}<p class="mt-8 whitespace-pre-line">{d.notes}</p>{/if}
	{#if !isQuote && data.details.iban}<p class="mt-8">Please pay {d.due ? `before ${short(d.due)} ` : ''}to <b>{data.details.iban}</b>, mentioning <b>{d.number}</b>.</p>{/if}
	{#if data.details.footer}<p class="mt-10 text-gray-500">{data.details.footer}</p>{/if}
</article>

<style>
	@media print {
		:global(aside),
		:global(header.no-print) {
			display: none !important;
		}
		:global(main) {
			padding: 0 !important;
		}
		:global(.app-shell) {
			display: block !important;
		}
		:global(main > div) {
			max-width: none !important;
			padding: 0 !important;
		}
	}
</style>
