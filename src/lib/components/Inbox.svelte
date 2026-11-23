<script lang="ts">
	// "To approve": what Undercut prepared today, one business at a time. Send or skip, and the next one comes up.
	import { enhance } from '$app/forms';
	import { act } from '#lib/act.ts';
	import type { Dict } from '#lib/i18n.ts';
	type Item = {
		key: string;
		kind: 'first' | 'followup' | 'payment';
		id: string;
		to?: string;
		phone?: string;
		subject: string;
		message: string;
		step?: number;
		name: string;
		meta: string;
		reasonsTitle?: 'why' | 'told';
		reasons?: string[];
		proof?: { label: string; url: string }[];
		lang?: 'fr' | 'nl' | 'en';
		instagram?: string;
	};
	let { items, week, waiting = 0, t }: { items: Item[]; week: { sent: number; replied: number; won: number }; waiting?: number; t: Dict } = $props();

	let hidden = $state<Record<string, boolean>>({});
	let done = $state<{ key: string; name: string; label: string }[]>([]);
	let sent = $state(0);
	let editing = $state(false);
	let edited = $state<Record<string, string>>({});
	let copied = $state(false);

	const queue = $derived(items.filter((i) => !hidden[i.key]));
	const cur = $derived<Item | undefined>(queue[0]);
	const total = $derived(queue.length + done.length);
	const pct = $derived(total ? Math.round((done.length / total) * 100) : 100);
	const text = (it: Item) => edited[it.key] ?? it.message;
	const mailto = (it: Item) => `mailto:${it.to ?? ''}?subject=${encodeURIComponent(it.subject)}&body=${encodeURIComponent(text(it))}`;
</script>

<section class="card p-5 sm:p-6">
	<div>
		<p class="font-medium">{t.queueTitle} <span class="text-sm font-normal text-muted">· {t.queueLeft(queue.length, done.length, total)}</span></p>
		<p class="mt-0.5 text-xs text-muted">{t.queueHelp}</p>
	</div>
	{#if total}
		<div class="mt-3 h-1 overflow-hidden rounded-full bg-tile" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div class="h-1 rounded-full bg-ink transition-[width] duration-500" style="width:{pct}%"></div></div>
	{/if}

	<div class="mt-4 grid items-start gap-4 lg:grid-cols-[1fr_260px]">
		{#if cur}
			{#key cur.key}
				<article class="min-w-0 rounded-[22px] border border-line bg-white">
					<div class="p-4 sm:p-5">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<span class="rounded-full px-2.5 py-1 text-[11px] {cur.kind === 'followup' ? 'bg-tile text-ink' : 'bg-ink text-white'}">{cur.kind === 'followup' ? t.tagFollow(cur.step ?? 1) : t.tagFirst}</span>
							<span class="text-xs text-muted">{done.length + 1} {t.of} {total}</span>
						</div>
						<h3 class="mt-3 text-[26px] leading-tight font-medium tracking-[-0.03em]">{cur.name}</h3>
						<p class="mt-1 text-sm text-ink-2">{cur.meta}</p>
						{#if cur.reasons?.length}
							<div class="mt-4 rounded-[18px] bg-tile p-4">
								<p class="label">{cur.reasonsTitle === 'told' ? t.told : t.why}</p>
								<ul class="mt-2 grid gap-1.5 text-sm">
									{#each cur.reasons as r, i (i)}<li class="flex items-baseline gap-2"><span class="text-good">✓</span>{r}</li>{/each}
								</ul>
								{#if cur.proof?.length}
									<p class="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
										<span class="text-muted">{t.check}</span>
										{#each cur.proof as p (p.url)}<a href={p.url} target="_blank" rel="noopener noreferrer" class="text-ink underline">{p.label}</a>{/each}
									</p>
								{/if}
							</div>
						{/if}
					</div>
					<div class="border-t border-line p-4 sm:p-5">
						<div class="flex flex-wrap justify-between gap-2 text-xs text-muted">
							<span>{#if cur.to}{t.to} <b class="font-medium text-ink">{cur.to}</b>{:else}{t.noEmail}{cur.phone ? t.orCall : ''}{/if}</span>
							{#if cur.lang}<span>{t.writtenIn[cur.lang]}</span>{/if}
						</div>
						<p class="mt-2 text-sm font-medium">{cur.subject}</p>
						{#if editing}
							<textarea rows="11" class="input mt-2 text-sm" value={text(cur)} oninput={(e) => (edited[cur!.key] = e.currentTarget.value)} aria-label={t.edit}></textarea>
						{:else}
							<div class="mt-2 rounded-[16px] bg-tile p-4 text-sm leading-relaxed whitespace-pre-line text-ink-2">{text(cur)}</div>
						{/if}
						<button type="button" class="mt-2 text-xs text-ink-2 underline" onclick={() => (editing = !editing)}>{editing ? t.doneEditing : t.edit}</button>
					</div>
					<form
						method="POST"
						action={act('inbox')}
						class="flex flex-wrap items-center gap-2 border-t border-line p-4 sm:p-5"
						use:enhance={({ submitter }) => {
							const it = cur!;
							const how = (submitter as HTMLButtonElement | null)?.dataset.how;
							if (how === 'mail') window.location.href = mailto(it);
							if (how === 'copy' || how === 'dm') {
								navigator.clipboard?.writeText(text(it));
								copied = true;
								setTimeout(() => (copied = false), 2500);
								if (how === 'dm' && it.instagram) window.open(it.instagram, '_blank', 'noopener');
							}
							if (how !== 'skip') sent++;
							hidden[it.key] = true;
							done = [...done, { key: it.key, name: it.name, label: how === 'skip' ? (it.kind === 'first' ? t.doneSkipped : t.doneLater) : t.doneSent }];
							editing = false;
							return async ({ update }) => update({ reset: false });
						}}
					>
						<input type="hidden" name="kind" value={cur.kind} />
						<input type="hidden" name="id" value={cur.id} />
						{#if cur.to}
							<button name="sent" value="1" data-how="mail" class="btn btn-primary text-sm">{t.sendEmail}</button>
							<button name="sent" value="1" data-how="dm" class="pill text-sm">{cur.instagram ? t.copyDm : t.copyDmPlain}</button>
						{:else}
							<button name="sent" value="1" data-how={cur.instagram ? 'dm' : 'copy'} class="btn btn-primary text-sm">{cur.instagram ? t.copyDm : t.copyMark}</button>
						{/if}
						{#if cur.phone}<a href="tel:{cur.phone}" class="pill text-sm">{t.call}</a>{/if}
						<span class="flex-1"></span>
						<button name="sent" value="0" data-how="skip" class="text-sm text-muted underline">{cur.kind === 'first' ? t.notFit : t.later}</button>
					</form>
				</article>
			{/key}
		{:else}
			<div class="rounded-[22px] bg-tile p-6 text-center">
				<p class="text-lg font-medium">{t.allDone} ✓</p>
				<p class="mx-auto mt-1 max-w-md text-sm text-ink-2">{t.allDoneText(sent, waiting)}</p>
			</div>
		{/if}

		<aside class="grid gap-3">
			{#if total}
				<ol class="grid gap-1 rounded-[18px] bg-tile p-2 text-sm">
					{#each done as d (d.key)}<li class="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-muted"><span class="truncate">{d.name}</span><span class="text-xs">{d.label}</span></li>{/each}
					{#each queue as q, i (q.key)}<li class="flex items-center justify-between gap-2 rounded-xl px-3 py-2 {i === 0 ? 'bg-white font-medium' : ''}"><span class="truncate">{q.name}</span><span class="text-xs text-muted">{i === 0 ? t.nowLabel : q.kind === 'first' ? t.newLabel : t.followLabel}</span></li>{/each}
				</ol>
			{/if}
			<div class="rounded-[18px] bg-tile p-4">
				<p class="label">{t.thisWeek}</p>
				<div class="mt-2 grid grid-cols-3 gap-2">
					<div><p class="big text-3xl">{week.sent}</p><p class="mt-1 text-[11px] text-muted">{t.statSent}</p></div>
					<div><p class="big text-3xl">{week.replied}</p><p class="mt-1 text-[11px] text-muted">{t.statReplied}</p></div>
					<div><p class="big text-3xl">{week.won}</p><p class="mt-1 text-[11px] text-muted">{t.statWon}</p></div>
				</div>
				<a href="/app/pipeline" class="mt-3 inline-block text-xs text-ink-2 underline">{t.seeReplies}</a>
			</div>
		</aside>
	</div>
	{#if copied}<p class="mt-3 text-sm text-good" role="status">{t.copied}</p>{/if}
</section>
