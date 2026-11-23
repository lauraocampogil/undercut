<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { act } from '#lib/act.ts';
	import { dict, weekday, type UiLang } from '#lib/i18n.ts';
	let { data } = $props();

	const t = $derived(dict(page.data.ui));
	const ui = $derived((page.data.ui ?? 'fr') as UiLang);
	type Card = (typeof data.waiting)[number];
	let showLost = $state(false);
	const keep = () => async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => update({ reset: false });
	const ago = (d?: string) => {
		if (!d) return '';
		const n = Math.round((Date.now() - new Date(d + 'T12:00:00').getTime()) / 86400000);
		return n <= 0 ? t.sentToday : n === 1 ? t.yesterday : t.days(n);
	};
	const waitingLine = (c: Card) => (!c.next ? t.waitingAnswer : c.followups >= 2 ? t.waitingLast(weekday(c.next, ui)) : t.waitingNext(c.followups + 1, weekday(c.next, ui)));
	const cols = $derived([
		{ key: 'waiting', title: t.colWaiting, hint: t.colWaitingHint, cards: data.waiting, empty: t.emptyWaiting },
		{ key: 'replied', title: t.colReplied, hint: t.colRepliedHint, cards: data.replied, empty: t.emptyReplied },
		{ key: 'won', title: t.colWon, hint: t.colWonHint, cards: data.won, empty: t.emptyWon }
	]);
</script>

<svelte:head><title>{t.repliesTitle} · Undercut</title></svelte:head>

<section>
	<p class="label">{t.repliesHelp}{#if data.toSend} · <a href="/app" class="underline">{t.waitingInToday(data.toSend)}</a>{/if}</p>
	<h1 class="display mt-2 text-[48px] sm:text-[72px]"><em>{t.repliesTitle}</em></h1>
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
							<span class="text-xs whitespace-nowrap text-muted">{col.key === 'waiting' ? ago(c.contactedAt) : ago(c.updatedAt)}</span>
						</div>
						<p class="text-sm text-ink-2">{col.key === 'waiting' ? waitingLine(c) : [c.category, c.email || c.phone].filter(Boolean).join(' · ')}</p>
						<div class="mt-1 flex flex-wrap items-center gap-2">
							{#if col.key === 'waiting'}
								<form method="POST" action={act('stage')} use:enhance={keep}><input type="hidden" name="id" value={c.id} /><button name="stage" value="talking" class="btn btn-primary text-sm">{t.theyReplied}</button></form>
								<form method="POST" action={act('stage')} use:enhance={keep}><input type="hidden" name="id" value={c.id} /><button name="stage" value="lost" class="text-sm text-muted underline">{t.notNow}</button></form>
							{:else if col.key === 'replied'}
								<form method="POST" action={act('stage')} use:enhance={keep}><input type="hidden" name="id" value={c.id} /><button name="stage" value="won" class="btn btn-primary text-sm">{t.theySigned}</button></form>
								{#if c.email}<a href="mailto:{c.email}" class="pill text-sm">{t.email}</a>{/if}
								{#if c.phone}<a href="tel:{c.phone}" class="pill text-sm">{t.call}</a>{/if}
								<form method="POST" action={act('stage')} use:enhance={keep}><input type="hidden" name="id" value={c.id} /><button name="stage" value="lost" class="text-sm text-muted underline">{t.notNow}</button></form>
							{:else}
								{#if c.email}<a href="mailto:{c.email}" class="pill text-sm">{t.email}</a>{/if}
								{#if c.phone}<a href="tel:{c.phone}" class="pill text-sm">{t.call}</a>{/if}
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
	{t.lostLine(data.lost.length)}
	<button class="text-ink underline" onclick={() => (showLost = !showLost)} aria-expanded={showLost}>{t.lostLink(data.lost.length)}</button>
	{t.lostEnd}
</p>
{#if showLost}
	<ul class="mt-3 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
		{#each data.lost as c (c.id)}
			<li class="card flex items-center justify-between gap-3 px-4 py-3">
				<span class="min-w-0"><span class="block truncate font-medium">{c.name}</span><span class="block text-xs text-muted">{c.category}</span></span>
				<form method="POST" action={act('stage')} use:enhance={keep}><input type="hidden" name="id" value={c.id} /><button name="stage" value="talking" class="pill text-sm">{t.theyReplied}</button></form>
			</li>
		{:else}
			<li class="text-sm text-muted">{t.nobody}</li>
		{/each}
	</ul>
{/if}
