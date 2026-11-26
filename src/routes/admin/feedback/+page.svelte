<script lang="ts">
	let { data } = $props();
	const L: Record<string, string> = { yes: 'Yes', maybe: 'Maybe', no: 'No', very: 'Very disappointed', somewhat: 'Somewhat', not: 'Not disappointed', less: 'At a lower price' };
	const fields = [
		['used', 'Used it for'],
		['why', 'Why they would (or wouldn’t) use it'],
		['recommend', 'Who they would recommend it to'],
		['foundWhat', 'What they’ll change'],
		['liked', 'Liked'],
		['confusing', 'Confusing / broken'],
		['missing', 'Missing'],
		['other', 'Other']
	] as const;
</script>

<svelte:head><title>Beta feedback · Undercut admin</title></svelte:head>

<main class="mx-auto flex max-w-[1100px] flex-col gap-8 px-5 py-10 sm:px-8">
	<header>
		<a href="/admin/waitlist" class="text-sm text-muted">← Waitlist</a>
		<h1 class="mt-2 text-4xl font-medium tracking-tight">Beta feedback</h1>
		<p class="mt-1 text-ink-2">{data.all.length} answers from {data.people} people</p>
	</header>

	<section class="grid gap-3 sm:grid-cols-3">
		<div class="card p-5"><p class="text-xs text-muted">“Very disappointed” without it</p><p class="big mt-1 text-4xl">{data.veryDisappointed ?? '—'}{data.veryDisappointed != null ? '%' : ''}</p><p class="mt-1 text-xs text-muted">40% or more = people really need it</p></div>
		<div class="card p-5"><p class="text-xs text-muted">Would pay €49/month</p><p class="big mt-1 text-4xl">{data.wouldPay ?? '—'}{data.wouldPay != null ? '%' : ''}</p><p class="mt-1 text-xs text-muted">{data.payAny ?? 0}% would pay something</p></div>
		<div class="card p-5"><p class="text-xs text-muted">Found something to change</p><p class="big mt-1 text-4xl">{data.found ?? '—'}{data.found != null ? '%' : ''}</p><p class="mt-1 text-xs text-muted">answered “Yes”</p></div>
	</section>

	{#each data.all as f (f.at + f.email)}
		<article class="card flex flex-col gap-3 p-6">
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<p class="font-medium">{f.name || f.email} <span class="text-sm font-normal text-muted">{f.email} · {f.analyses} products analysed</span></p>
				<p class="text-xs text-muted">{f.at.slice(0, 16).replace('T', ' ')}</p>
			</div>
			<p class="flex flex-wrap gap-2 text-xs">
				{#if f.found}<span class="rounded-full bg-tile px-2.5 py-1">Found something: {L[f.found]}</span>{/if}
				{#if f.disappointed}<span class="rounded-full px-2.5 py-1 {f.disappointed === 'very' ? 'bg-good-bg text-good' : 'bg-tile'}">{L[f.disappointed]}</span>{/if}
				{#if f.pay}<span class="rounded-full px-2.5 py-1 {f.pay === 'yes' ? 'bg-good-bg text-good' : 'bg-tile'}">Pay €49: {L[f.pay]}{f.price ? ` (${f.price})` : ''}</span>{/if}
			</p>
			<dl class="grid gap-3 text-sm sm:grid-cols-2">
				{#each fields as [k, label]}
					{#if f[k]}<div><dt class="text-xs text-muted">{label}</dt><dd class="mt-0.5 whitespace-pre-line">{f[k]}</dd></div>{/if}
				{/each}
			</dl>
		</article>
	{:else}
		<p class="text-sm text-muted">No feedback yet.</p>
	{/each}
</main>
