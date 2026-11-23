<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { act } from '#lib/act.ts';
	import { dict, weekday, type UiLang } from '#lib/i18n.ts';
	let { data } = $props();

	const t = $derived(dict(page.data.ui));
	const ui = $derived((page.data.ui ?? 'fr') as UiLang);
	type Card = (typeof data.cards)[number];
	type Stage = 'contacted' | 'talking' | 'won' | 'lost' | 'new';

	// drag & drop between columns; the card moves at once, the server follows
	let moved = $state<Record<string, Stage>>({});
	let dragging = $state<string | null>(null);
	let over = $state<string | null>(null);
	const stageOf = (c: Card) => moved[c.id] ?? (c.stage as Stage);
	async function move(id: string, stage: Stage) {
		moved = { ...moved, [id]: stage };
		const f = new FormData();
		f.set('id', id);
		f.set('stage', stage);
		await fetch(act('stage'), { method: 'POST', body: f, headers: { 'x-sveltekit-action': 'true' } });
		await invalidateAll();
		const { [id]: _, ...rest } = moved;
		moved = rest;
	}

	const ago = (d?: string, sent = false) => {
		if (!d) return '';
		const n = Math.round((Date.now() - new Date(d + 'T12:00:00').getTime()) / 86400000);
		return n <= 0 ? (sent ? t.sentToday : t.today) : n === 1 ? t.yesterday : t.days(n);
	};
	const waitingLine = (c: Card) => (!c.next ? t.waitingAnswer : c.followups >= 2 ? t.waitingLast(weekday(c.next, ui)) : t.waitingNext(c.followups + 1, weekday(c.next, ui)));
	const cols = $derived(
		(
			[
				['contacted', t.colWaiting, t.colWaitingHint, t.emptyWaiting],
				['talking', t.colReplied, t.colRepliedHint, t.emptyReplied],
				['won', t.colWon, t.colWonHint, t.emptyWon],
				['lost', t.colHistory, t.colHistoryHint, t.emptyHistory]
			] as [Stage, string, string, string][]
		).map(([stage, title, hint, empty]) => ({ stage, title, hint, empty, cards: data.cards.filter((c) => stageOf(c) === stage) }))
	);
	const btn = 'btn btn-primary text-sm';
	const skipped = (c: Card) => /Skipped|Old/.test(c.note ?? '');
</script>

<svelte:head><title>{t.repliesTitle} · Undercut</title></svelte:head>

<section>
	<p class="label">{t.repliesHelp}{#if data.toSend} · <a href="/app" class="underline">{t.waitingInToday(data.toSend)}</a>{/if}</p>
	<h1 class="display mt-2 text-[48px] sm:text-[72px]"><em>{t.repliesTitle}</em></h1>
	<p class="mt-2 hidden text-xs text-muted sm:block">{t.dragHint}</p>
</section>

<div class="mt-6 grid items-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
	{#each cols as col (col.stage)}
		<section
			class="card p-4 transition-shadow {over === col.stage && dragging ? 'ring-2 ring-ink' : ''}"
			aria-label={col.title}
			ondragover={(e) => {
				e.preventDefault();
				over = col.stage;
			}}
			ondragleave={() => (over = over === col.stage ? null : over)}
			ondrop={(e) => {
				e.preventDefault();
				const id = dragging;
				dragging = null;
				over = null;
				const c = data.cards.find((x) => x.id === id);
				if (id && c && stageOf(c) !== col.stage) move(id, col.stage);
			}}
		>
			<div class="flex items-baseline justify-between gap-3 px-1.5 pt-1 pb-3">
				<h2 class="font-medium">{col.title} <span class="text-muted">{col.cards.length}</span></h2>
				<span class="text-right text-xs text-muted">{col.hint}</span>
			</div>
			<div class="flex min-h-16 flex-col gap-2.5">
				{#each col.cards as c (c.id)}
					<article
						class="flex cursor-grab flex-col gap-1.5 rounded-[18px] bg-tile p-4 active:cursor-grabbing {dragging === c.id ? 'opacity-40' : ''}"
						draggable="true"
						ondragstart={(e) => {
							dragging = c.id;
							e.dataTransfer?.setData('text/plain', c.id);
						}}
						ondragend={() => {
							dragging = null;
							over = null;
						}}
					>
						<div class="flex items-baseline justify-between gap-2">
							<h3 class="min-w-0 truncate font-medium">{c.name}</h3>
							<span class="text-xs whitespace-nowrap text-muted">{col.stage === 'contacted' ? ago(c.contactedAt, true) : ago(c.updatedAt)}</span>
						</div>
						<p class="text-sm text-ink-2">
							{#if col.stage === 'contacted'}{waitingLine(c)}
							{:else if col.stage === 'lost'}{skipped(c) ? t.skippedNote : t.noAnswerNote}{c.category ? ` · ${c.category}` : ''}
							{:else}{[c.category, c.email || c.phone].filter(Boolean).join(' · ')}{/if}
						</p>
						<div class="mt-1 flex flex-wrap items-center gap-2">
							{#if col.stage === 'contacted'}
								<button class={btn} onclick={() => move(c.id, 'talking')}>{t.theyReplied}</button>
								<button class="text-sm text-muted underline" onclick={() => move(c.id, 'lost')}>{t.notNow}</button>
							{:else if col.stage === 'talking'}
								<button class={btn} onclick={() => move(c.id, 'won')}>{t.theySigned}</button>
								{#if c.email}<a href="mailto:{c.email}" class="pill text-sm">{t.email}</a>{/if}
								{#if c.phone}<a href="tel:{c.phone}" class="pill text-sm">{t.call}</a>{/if}
								<button class="text-sm text-muted underline" onclick={() => move(c.id, 'contacted')}>{t.backWaiting}</button>
							{:else if col.stage === 'won'}
								{#if c.email}<a href="mailto:{c.email}" class="pill text-sm">{t.email}</a>{/if}
								{#if c.phone}<a href="tel:{c.phone}" class="pill text-sm">{t.call}</a>{/if}
								<button class="text-sm text-muted underline" onclick={() => move(c.id, 'talking')}>{t.backReplied}</button>
							{:else}
								<button class="pill text-sm" onclick={() => move(c.id, 'new')}>{t.restoreToday}</button>
								{#if c.contactedAt}<button class="text-sm text-muted underline" onclick={() => move(c.id, 'contacted')}>{t.backWaiting}</button>{/if}
							{/if}
						</div>
					</article>
				{:else}
					<p class="rounded-[18px] border border-dashed border-black/10 p-4 text-sm text-ink-2">{col.empty}</p>
				{/each}
			</div>
		</section>
	{/each}
</div>
