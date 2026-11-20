<script lang="ts">
	import { enhance } from '$app/forms';
	import { eur, host, STATUS_LABEL } from '#lib/biz-format.ts';
	let { data, form } = $props();
	let adding = $state(false);
	let filter = $state<'all' | 'active' | 'paused' | 'ended'>('all');
	const list = $derived(filter === 'all' ? data.clients : data.clients.filter((c) => c.status === filter));
	const count = (s: string) => data.clients.filter((c) => c.status === s).length;
</script>

<svelte:head><title>Clients · Undercut</title></svelte:head>

<header class="flex flex-wrap items-end justify-between gap-4">
	<div>
		<h1 class="text-[34px] leading-tight font-medium tracking-tight sm:text-[44px]">Clients</h1>
		<p class="mt-1 text-sm text-ink-2">{data.money.active} active · {eur(data.money.mrr, data.currency)} per month in retainers</p>
	</div>
	<button class="btn btn-primary" onclick={() => (adding = !adding)}>{adding ? 'Close' : '+ Add client'}</button>
</header>

{#if adding}
	<form method="POST" action="?/client" use:enhance class="card mt-6 grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
		<input type="hidden" name="go" value="1" />
		<label class="text-sm"><span class="label">Client or company name *</span><input name="name" required class="input mt-1.5" placeholder="Corner Bakery" /></label>
		<label class="text-sm"><span class="label">Contact person</span><input name="contact" class="input mt-1.5" placeholder="Sam Taylor" /></label>
		<label class="text-sm"><span class="label">Email</span><input name="email" type="email" class="input mt-1.5" /></label>
		<label class="text-sm"><span class="label">Phone</span><input name="phone" class="input mt-1.5" /></label>
		<label class="text-sm"><span class="label">Website</span><input name="website" class="input mt-1.5" placeholder="cornerbakery.com" /></label>
		<label class="text-sm"><span class="label">Monthly fee (€)</span><input name="fee" inputmode="decimal" class="input mt-1.5" placeholder="e.g. 450 — leave empty for one-off projects" /></label>
		<label class="text-sm sm:col-span-2"><span class="label">What you do for them (comma separated)</span><input name="services" class="input mt-1.5" placeholder="Website, SEO, Instagram" /></label>
		{#if form?.clientError}<p class="text-sm text-bad sm:col-span-2">{form.clientError}</p>{/if}
		<div class="sm:col-span-2"><button class="btn btn-primary">Save client</button></div>
	</form>
{/if}

<div class="mt-6 flex flex-wrap gap-2">
	{#each [['all', 'All', data.clients.length], ['active', 'Active', count('active')], ['paused', 'Paused', count('paused')], ['ended', 'Ended', count('ended')]] as [k, l, n] (k)}
		<button class="pill {filter === k ? 'pill-active' : ''}" onclick={() => (filter = k as typeof filter)}>{l} <span class="opacity-50">{n}</span></button>
	{/each}
</div>

{#if !data.clients.length}
	<div class="card mt-6 p-8 text-center">
		<p class="text-lg font-medium">No clients yet</p>
		<p class="mx-auto mt-2 max-w-md text-sm text-ink-2">Add the people you already work for. When a prospect says yes, press “Make client” in your pipeline and it lands here with its details.</p>
		<button class="btn btn-primary mt-5" onclick={() => (adding = true)}>+ Add my first client</button>
	</div>
{:else}
	<div class="card mt-4 overflow-hidden">
		<table class="w-full text-left text-sm">
			<thead class="hidden border-b border-line text-xs text-muted sm:table-header-group">
				<tr><th class="px-5 py-3 font-normal">Client</th><th class="px-3 py-3 font-normal">Services</th><th class="px-3 py-3 font-normal">Monthly</th><th class="px-3 py-3 font-normal">Paid so far</th><th class="px-3 py-3 font-normal">Open tasks</th><th class="px-5 py-3 font-normal">Status</th></tr>
			</thead>
			<tbody>
				{#each list as c (c.id)}
					<tr class="relative border-b border-line last:border-0 hover:bg-black/[.02]">
						<td class="px-5 py-4">
							<a href="/app/crm/{c.id}" class="font-medium after:absolute after:inset-0">{c.name}</a>
							<span class="block text-xs text-muted">{c.contact ?? ''}{c.contact && c.website ? ' · ' : ''}{host(c.website)}</span>
						</td>
						<td class="hidden px-3 py-4 text-ink-2 sm:table-cell">{c.services.join(', ') || '—'}</td>
						<td class="hidden px-3 py-4 sm:table-cell">{c.fee ? eur(c.fee, data.currency) : '—'}</td>
						<td class="hidden px-3 py-4 sm:table-cell">{c.billed ? eur(c.billed, data.currency) : '—'}</td>
						<td class="hidden px-3 py-4 sm:table-cell">{c.openTasks || '—'}</td>
						<td class="px-5 py-4 text-right sm:text-left"><span class="rounded-full px-2.5 py-1 text-xs {c.status === 'active' ? 'bg-good-bg text-good' : 'bg-tile text-ink-2'}">{STATUS_LABEL[c.status]}</span></td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
