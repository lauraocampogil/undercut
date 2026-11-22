<script lang="ts">
	// "To approve": what Undercut prepared today, one card at a time. Send or skip, and the next one comes up.
	import { enhance } from '$app/forms';
	import { act } from '#lib/act.ts';
	type Item = {
		key: string;
		kind: 'first' | 'followup' | 'payment';
		id: string;
		title: string;
		why: string;
		to?: string;
		phone?: string;
		subject: string;
		message: string;
		step?: number;
		late?: boolean;
		name: string;
		meta: string;
		reasonsTitle?: string;
		reasons?: string[];
		proof?: { label: string; url: string }[];
		lang?: 'fr' | 'nl' | 'en';
		instagram?: string;
	};
	let {
		items,
		clients,
		error = '',
		brief,
		briefMsg = '',
		week,
		waiting = 0
	}: { items: Item[]; clients: { id: string; name: string }[]; error?: string; brief: { on: boolean; ready: boolean }; briefMsg?: string; week: { sent: number; replied: number; won: number }; waiting?: number } = $props();

	let hidden = $state<Record<string, boolean>>({});
	let done = $state<{ key: string; name: string; label: string }[]>([]);
	let sent = $state(0);
	let editing = $state(false);
	let edited = $state<Record<string, string>>({});
	let copied = $state(false);
	let adding = $state(false);

	const queue = $derived(items.filter((i) => !hidden[i.key]));
	const cur = $derived<Item | undefined>(queue[0]);
	const total = $derived(queue.length + done.length);
	const pct = $derived(total ? Math.round((done.length / total) * 100) : 100);
	const today = new Date().toISOString().slice(0, 10);
	const LANG = { fr: 'French', nl: 'Dutch', en: 'English' } as const;
	const text = (it: Item) => edited[it.key] ?? it.message;
	const mailto = (it: Item) => `mailto:${it.to ?? ''}?subject=${encodeURIComponent(it.subject)}&body=${encodeURIComponent(text(it))}`;
	const tag = (it: Item) => (it.kind === 'first' ? 'New prospect' : it.kind === 'followup' ? `Follow-up ${it.step} of 2` : it.step === 2 ? 'Payment reminder 2' : 'Payment reminder');
	const heading = (it: Item) => (it.kind === 'payment' ? it.title.replace('owes', 'owes you') : it.name);
</script>

<section class="card p-5 sm:p-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<p class="font-medium">To approve <span class="text-sm font-normal text-muted">· {queue.length} left{total ? `, ${done.length} of ${total} done` : ''}</span></p>
			<p class="mt-0.5 text-xs text-muted">One at a time: read it, edit if you want, then send or skip. Nothing goes out without you.</p>
		</div>
		<button type="button" class="pill text-sm" onclick={() => (adding = !adding)}>{adding ? 'Close' : '+ Someone owes me money'}</button>
	</div>
	{#if total}
		<div class="mt-3 h-1 overflow-hidden rounded-full bg-tile" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Done today"><div class="h-1 rounded-full bg-ink transition-[width] duration-500" style="width:{pct}%"></div></div>
	{/if}

	{#if adding}
		<form method="POST" action={act('payment')} use:enhance={() => async ({ update, result }) => { await update(); if (result.type === 'success') adding = false; }} class="mt-4 grid gap-3 rounded-[18px] bg-tile p-4 sm:grid-cols-2">
			<label class="text-sm"><span class="label">Who</span>
				<select name="clientId" class="input mt-1.5"><option value="">Someone else (type below)</option>{#each clients as c (c.id)}<option value={c.id}>{c.name}</option>{/each}</select>
			</label>
			<label class="text-sm"><span class="label">Or their name</span><input name="who" class="input mt-1.5" placeholder="Corner Bakery" /></label>
			<label class="text-sm"><span class="label">Amount (€)</span><input name="amount" inputmode="decimal" required class="input mt-1.5" placeholder="450" /></label>
			<label class="text-sm"><span class="label">Due on</span><input name="due" type="date" required value={today} class="input mt-1.5" /></label>
			<label class="text-sm"><span class="label">What for</span><input name="label" class="input mt-1.5" placeholder="e.g. facture 2026-014 (written in the message)" /></label>
			<label class="text-sm"><span class="label">Their email (optional)</span><input name="email" type="email" class="input mt-1.5" /></label>
			{#if error}<p class="text-sm text-bad sm:col-span-2">{error}</p>{/if}
			<p class="text-xs text-muted sm:col-span-2">Keep invoicing in your usual tool. When the date passes, Undercut writes the reminder for you.</p>
			<div class="sm:col-span-2"><button class="btn btn-primary text-sm">Save</button></div>
		</form>
	{/if}

	<div class="mt-4 grid items-start gap-4 lg:grid-cols-[1fr_260px]">
		{#if cur}
			{#key cur.key}
				<article class="min-w-0 rounded-[22px] border border-line bg-white">
					<div class="p-4 sm:p-5">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<span class="rounded-full px-2.5 py-1 text-[11px] {cur.kind === 'payment' ? 'bg-bad-bg text-bad' : cur.kind === 'followup' ? 'bg-tile text-ink' : 'bg-ink text-white'}">{tag(cur)}</span>
							<span class="text-xs text-muted">{done.length + 1} of {total}</span>
						</div>
						<h3 class="mt-3 text-[26px] leading-tight font-medium tracking-[-0.03em]">{heading(cur)}</h3>
						<p class="mt-1 text-sm text-ink-2">{cur.meta}</p>
						{#if cur.reasons?.length}
							<div class="mt-4 rounded-[18px] bg-tile p-4">
								<p class="label">{cur.reasonsTitle}</p>
								<ul class="mt-2 grid gap-1.5 text-sm">
									{#each cur.reasons as r, i (i)}<li class="flex items-baseline gap-2"><span class="text-good">✓</span>{r}</li>{/each}
								</ul>
								{#if cur.proof?.length}
									<p class="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
										<span class="text-muted">Check it yourself:</span>
										{#each cur.proof as p (p.url)}<a href={p.url} target="_blank" rel="noopener noreferrer" class="text-ink underline">{p.label}</a>{/each}
									</p>
								{/if}
							</div>
						{/if}
					</div>
					<div class="border-t border-line p-4 sm:p-5">
						<div class="flex flex-wrap justify-between gap-2 text-xs text-muted">
							<span>{#if cur.to}To: <b class="font-medium text-ink">{cur.to}</b>{:else}No email found: copy it for a DM{cur.phone ? ' or call' : ''}{/if}</span>
							{#if cur.lang}<span>Written in {LANG[cur.lang]}</span>{/if}
						</div>
						<p class="mt-2 text-sm font-medium">{cur.subject}</p>
						{#if editing}
							<textarea rows="11" class="input mt-2 text-sm" value={text(cur)} oninput={(e) => (edited[cur!.key] = e.currentTarget.value)} aria-label="Message"></textarea>
						{:else}
							<div class="mt-2 rounded-[16px] bg-tile p-4 text-sm leading-relaxed whitespace-pre-line text-ink-2">{text(cur)}</div>
						{/if}
						<button type="button" class="mt-2 text-xs text-ink-2 underline" onclick={() => (editing = !editing)}>{editing ? 'Done editing' : 'Edit message'}</button>
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
							if (how !== 'skip' && how !== 'paid') sent++;
							hidden[it.key] = true;
							done = [...done, { key: it.key, name: it.name, label: how === 'skip' ? (it.kind === 'first' ? 'Skipped' : 'Later') : how === 'paid' ? 'Paid' : 'Sent' }];
							editing = false;
							return async ({ update }) => update({ reset: false });
						}}
					>
						<input type="hidden" name="kind" value={cur.kind} />
						<input type="hidden" name="id" value={cur.id} />
						{#if cur.to}
							<button name="sent" value="1" data-how="mail" class="btn btn-primary text-sm">{cur.kind === 'payment' ? 'Send reminder' : 'Send from my email'}</button>
						{:else}
							<button name="sent" value="1" data-how="copy" class="btn btn-primary text-sm">Copy & mark sent</button>
						{/if}
						{#if cur.kind === 'payment'}
							<button formaction={act('paid')} data-how="paid" class="pill text-sm">They paid</button>
						{:else if cur.to}
							<button name="sent" value="1" data-how="dm" class="pill text-sm">{cur.instagram ? 'Copy for Instagram DM' : 'Copy for a DM'}</button>
						{/if}
						{#if cur.phone}<a href="tel:{cur.phone}" class="pill text-sm">Call</a>{/if}
						<span class="flex-1"></span>
						<button name="sent" value="0" data-how="skip" class="text-sm text-muted underline">{cur.kind === 'first' ? 'Not a fit' : 'Later'}</button>
					</form>
				</article>
			{/key}
		{:else}
			<div class="rounded-[22px] bg-tile p-6 text-center">
				<p class="text-lg font-medium">All done for today ✓</p>
				<p class="mx-auto mt-1 max-w-md text-sm text-ink-2">{sent ? `You sent ${sent} message${sent === 1 ? '' : 's'}. ` : ''}Undercut follows up after 4 days if nobody answers, and payment reminders come back here when they’re due.{waiting ? ` ${waiting} more ready for tomorrow.` : ''}</p>
			</div>
		{/if}

		<aside class="grid gap-3">
			{#if total}
				<ol class="grid gap-1 rounded-[18px] bg-tile p-2 text-sm">
					{#each done as d (d.key)}<li class="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-muted"><span class="truncate">{d.name}</span><span class="text-xs">{d.label}</span></li>{/each}
					{#each queue as q, i (q.key)}<li class="flex items-center justify-between gap-2 rounded-xl px-3 py-2 {i === 0 ? 'bg-white font-medium' : ''}"><span class="truncate">{q.name}</span><span class="text-xs text-muted">{i === 0 ? 'Now' : q.kind === 'first' ? 'New' : q.kind === 'followup' ? 'Follow-up' : 'Payment'}</span></li>{/each}
				</ol>
			{/if}
			<div class="rounded-[18px] bg-tile p-4">
				<p class="label">This week</p>
				<div class="mt-2 grid grid-cols-3 gap-2">
					<div><p class="big text-3xl">{week.sent}</p><p class="mt-1 text-[11px] text-muted">sent</p></div>
					<div><p class="big text-3xl">{week.replied}</p><p class="mt-1 text-[11px] text-muted">replied</p></div>
					<div><p class="big text-3xl">{week.won}</p><p class="mt-1 text-[11px] text-muted">won</p></div>
				</div>
				<a href="/app/pipeline" class="mt-3 inline-block text-xs text-ink-2 underline">See who replied →</a>
			</div>
		</aside>
	</div>
	{#if copied}<p class="mt-3 text-sm text-good" role="status">Copied. Paste it in your DM or email.</p>{/if}

	<div class="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
		<span>Morning email (weekdays, 7:00):</span>
		<form method="POST" action={act('brief')} use:enhance={() => async ({ update }) => update({ reset: false })}><input type="hidden" name="on" value={brief.on ? '0' : '1'} /><button class="rounded-full px-2.5 py-1 {brief.on ? 'bg-ink text-white' : 'bg-tile text-ink'}">{brief.on ? 'On' : 'Off'}</button></form>
		{#if brief.ready}<form method="POST" action={act('briefTest')} use:enhance={() => async ({ update }) => update({ reset: false })}><button class="underline">Send me today’s now</button></form>{:else}<span>· starts once email is set up</span>{/if}
		{#if briefMsg}<span class="text-ink">{briefMsg}</span>{/if}
	</div>
</section>
