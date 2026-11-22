<script lang="ts">
	import { enhance } from '$app/forms';
	import { act } from '#lib/act.ts';
	import { eur } from '#lib/biz-format.ts';
	let { data } = $props();

	type Card = (typeof data.waiting)[number];
	let showLost = $state(false);
	const keep = () => async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => update({ reset: false });
	const DAY = 86400000;
	const ago = (d?: string) => {
		if (!d) return '';
		const n = Math.round((Date.now() - new Date(d + 'T12:00:00').getTime()) / DAY);
		return n <= 0 ? 'Today' : n === 1 ? 'Yesterday' : `${n} days`;
	};
	const day = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long' });
	const waitingLine = (c: Card) => {
		if (!c.next) return 'Waiting for their answer';
		if (c.followups >= 2) return `Last follow-up sent · moves to Not now on ${day(c.next)}`;
		return `Follow-up ${c.followups + 1} on ${day(c.next)}${c.followups ? ' · last one after that' : ''}`;
	};
	const cols = $derived([
		{ key: 'waiting', title: 'Waiting for a reply', hint: 'Undercut follows up', cards: data.waiting, empty: 'Messages you send from Today land here.' },
		{ key: 'replied', title: 'Replied', hint: 'Your turn', cards: data.replied, empty: 'When someone answers, tap “They replied” on their card.' },
		{ key: 'won', title: 'Clients', hint: 'Won', cards: data.won, empty: 'Signed clients show up here.' }
	]);
</script>

<svelte:head><title>Pipeline · Undercut</title></svelte:head>

<section>
	<p class="label">Everyone you wrote to · Undercut follows up for you{#if data.toSend} · <a href="/app" class="underline">{data.toSend} waiting in Today</a>{/if}</p>
	<h1 class="display mt-2 text-[48px] sm:text-[72px]">Your <em>pipeline</em></h1>
</section>

<div class="mt-6 grid items-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
	{#each cols as col (col.key)}
		<section class="card p-4" aria-label={col.title}>
			<div class="flex items-baseline justify-between gap-3 px-1.5 pt-1 pb-3">
				<h2 class="font-medium">{col.title} <span class="text-muted">{col.cards.length}</span></h2>
				<span class="text-xs text-muted">{col.hint}</span>
			</div>
			<div class="flex flex-col gap-2.5">
				{#each col.cards as c (c.id)}
					<article class="flex flex-col gap-1.5 rounded-[18px] bg-tile p-4">
						<div class="flex items-baseline justify-between gap-2">
							<h3 class="min-w-0 truncate font-medium">{c.name}</h3>
							<span class="text-xs whitespace-nowrap text-muted">{col.key === 'waiting' ? (ago(c.contactedAt) === 'Today' ? 'Sent today' : ago(c.contactedAt)) : col.key === 'replied' ? ago(c.updatedAt) : `Since ${new Date(c.updatedAt + 'T12:00:00').toLocaleDateString('en-GB', { month: 'short' })}`}</span>
						</div>
						<p class="text-sm text-ink-2">
							{#if col.key === 'waiting'}{waitingLine(c)}
							{:else if col.key === 'replied'}{c.note || c.category}
							{:else}{[c.category, c.value ? `${eur(c.value)}/month` : ''].filter(Boolean).join(' · ')}{/if}
						</p>
						<div class="mt-1 flex flex-wrap items-center gap-2">
							{#if col.key === 'waiting'}
								<form method="POST" action={act('stage')} use:enhance={keep}><input type="hidden" name="id" value={c.id} /><button name="stage" value="talking" class="btn btn-primary text-sm">They replied</button></form>
								<form method="POST" action={act('stage')} use:enhance={keep}><input type="hidden" name="id" value={c.id} /><button name="stage" value="lost" class="text-sm text-muted underline">Not now</button></form>
							{:else if col.key === 'replied'}
								<form method="POST" action={act('makeClient')}><input type="hidden" name="id" value={c.id} /><button class="btn btn-primary text-sm">They signed</button></form>
								{#if c.email}<a href="mailto:{c.email}" class="pill text-sm">Email</a>{/if}
								{#if c.phone}<a href="tel:{c.phone}" class="pill text-sm">Call</a>{/if}
								<form method="POST" action={act('stage')} use:enhance={keep}><input type="hidden" name="id" value={c.id} /><button name="stage" value="lost" class="text-sm text-muted underline">Not now</button></form>
							{:else if c.clientId}
								<a href="/app/crm/{c.clientId}" class="pill text-sm">Open client</a>
							{:else}
								<form method="POST" action={act('makeClient')}><input type="hidden" name="id" value={c.id} /><button class="pill text-sm">Open client</button></form>
							{/if}
						</div>
					</article>
				{:else}
					<p class="rounded-[18px] bg-tile p-4 text-sm text-ink-2">{col.empty}</p>
				{/each}
			</div>
		</section>
	{/each}
</div>

<p class="mt-5 text-sm text-muted">
	No answer after 2 follow-ups? They move to
	<button class="text-ink underline" onclick={() => (showLost = !showLost)} aria-expanded={showLost}>Not now ({data.lost.length})</button>
	and you never chase them again.
</p>
{#if showLost}
	<ul class="mt-3 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
		{#each data.lost as c (c.id)}
			<li class="card flex items-center justify-between gap-3 px-4 py-3">
				<span class="min-w-0"><span class="block truncate font-medium">{c.name}</span><span class="block text-xs text-muted">{c.category}</span></span>
				<form method="POST" action={act('stage')} use:enhance={keep}><input type="hidden" name="id" value={c.id} /><button name="stage" value="talking" class="pill text-sm">They replied</button></form>
			</li>
		{:else}
			<li class="text-sm text-muted">Nobody here.</li>
		{/each}
	</ul>
{/if}
