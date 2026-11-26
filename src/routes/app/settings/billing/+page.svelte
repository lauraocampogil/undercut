<script lang="ts">
	import { appT } from '#lib/app-i18n.ts';
	let { data, form } = $props();
	const t = $derived(appT(data.lang));
	const B = $derived(t.billing);
</script>

<svelte:head><title>{B.title} · Undercut</title></svelte:head>

<section class="flex max-w-2xl flex-col gap-6">
	{#if data.status === 'success'}<p class="rounded-xl bg-good-bg px-4 py-3 text-sm text-good">{B.success}</p>{/if}
	{#if data.status === 'failed'}<p class="rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">{B.failed}</p>{/if}
	{#if data.status === 'cancelled'}<p class="rounded-xl bg-tile px-4 py-3 text-sm">{B.cancelled}</p>{/if}
	{#if form?.error}<p class="rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">{form.error}</p>{/if}

	<div class="card flex flex-col gap-4 p-6">
		<div class="flex items-baseline justify-between gap-4">
			<p class="font-medium">{B.plan}</p>
			<p>{#if data.founder}<span class="mr-2 text-muted line-through">{data.price.full.replace('/mo', '')}</span>{/if}<span class="big text-4xl">{(data.founder ? data.price.founder : data.price.full).replace('/mo', '')}</span> <span class="text-sm text-muted">{B.month}</span></p>
		</div>
		{#if data.lifetime}<p class="rounded-xl bg-good-bg px-4 py-3 text-sm text-good">{B.lifetime}</p>{/if}
		{#if data.freeUntil}<p class="rounded-xl bg-good-bg px-4 py-3 text-sm text-good">{B.freeUntil(new Date(data.freeUntil).toLocaleDateString(t.locale, { day: 'numeric', month: 'long' }))}</p>{/if}
		{#if data.founder && !data.full && !data.freeUntil}<p class="rounded-xl bg-good-bg px-4 py-3 text-sm text-good">{B.founder}</p>{/if}
		<ul class="flex flex-col gap-1.5 text-sm text-ink-2">
			<li>{B.f1}</li>
			<li>{B.f2(data.price.paidAnalyses, data.price.freeAnalyses)}</li>
			<li>{B.f3}</li>
		</ul>
		{#if data.full}
			<p class="text-sm text-good">{B.yours}</p>
			{#if data.hasCustomer}<form method="POST" action="?/portal"><button class="btn btn-ghost">{B.manage}</button></form>{/if}
		{:else if data.lifetime}
			<!-- nothing to pay -->
		{:else if data.stripe}
			<form method="POST" action="?/subscribe"><button class="btn btn-primary">{B.unlock}</button></form>
		{:else}
			<p class="text-sm text-ink-2">{B.soon}</p>
			<a href="/waitlist" class="btn btn-primary self-start">{B.join}</a>
		{/if}
	</div>
</section>
