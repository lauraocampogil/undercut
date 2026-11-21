<script lang="ts">
	// "To approve": what Undercut prepared today. Each message can be edited, then sent from the user's own email or copied to a DM.
	import { enhance } from '$app/forms';
	import { act } from '#lib/act.ts';
	type Item = { key: string; kind: 'first' | 'followup' | 'payment'; id: string; title: string; why: string; to?: string; phone?: string; subject: string; message: string; step?: number; late?: boolean };
	let { items, clients, error = '', brief, briefMsg = '' }: { items: Item[]; clients: { id: string; name: string }[]; error?: string; brief: { on: boolean; ready: boolean }; briefMsg?: string } = $props();

	let edited = $state<Record<string, string>>({});
	let open = $state<string | null>(null);
	let adding = $state(false);
	let done = $state<Record<string, string>>({});
	const text = (it: Item) => edited[it.key] ?? it.message;
	const TAG: Record<string, (it: Item) => string> = {
		first: () => 'First message',
		followup: (it) => `Follow-up ${it.step}`,
		payment: (it) => (it.step === 2 ? 'Payment reminder 2' : 'Payment reminder')
	};
	const mailto = (it: Item) => `mailto:${it.to ?? ''}?subject=${encodeURIComponent(it.subject)}&body=${encodeURIComponent(text(it))}`;
	const visible = $derived(items.filter((it) => !done[it.key]));
	const today = new Date().toISOString().slice(0, 10);
</script>

<section class="card p-5 sm:p-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<p class="font-medium">To approve <span class="text-sm font-normal text-muted">· {visible.length} for today</span></p>
			<p class="mt-0.5 text-xs text-muted">Undercut wrote these from your prospects, follow-ups and payments. Read, edit if you want, then send. Nothing goes out without you.</p>
		</div>
		<button type="button" class="pill text-sm" onclick={() => (adding = !adding)}>{adding ? 'Close' : '+ Someone owes me money'}</button>
	</div>
	<div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
		<span>Morning email (weekdays, 7:00):</span>
		<form method="POST" action={act('brief')} use:enhance={() => async ({ update }) => update({ reset: false })}><input type="hidden" name="on" value={brief.on ? '0' : '1'} /><button class="rounded-full px-2.5 py-1 {brief.on ? 'bg-ink text-white' : 'bg-tile text-ink'}">{brief.on ? 'On' : 'Off'}</button></form>
		{#if brief.ready}<form method="POST" action={act('briefTest')} use:enhance={() => async ({ update }) => update({ reset: false })}><button class="underline">Send me today’s now</button></form>{:else}<span>· starts once email is set up</span>{/if}
		{#if briefMsg}<span class="text-ink">{briefMsg}</span>{/if}
	</div>

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

	<ul class="mt-4 grid gap-2">
		{#each visible as it (it.key)}
			<li class="rounded-[18px] border border-line bg-white">
				<button type="button" class="flex w-full items-center gap-3 p-3.5 text-left" onclick={() => (open = open === it.key ? null : it.key)} aria-expanded={open === it.key}>
					<span class="shrink-0 rounded-full px-2.5 py-1 text-[11px] {it.kind === 'payment' ? 'bg-bad-bg text-bad' : it.kind === 'followup' ? 'bg-tile text-ink' : 'bg-ink text-white'}">{TAG[it.kind](it)}</span>
					<span class="min-w-0 flex-1"><b class="block truncate text-sm font-medium">{it.title}</b><span class="block truncate text-xs text-muted">{it.why}</span></span>
					<span class="text-muted">{open === it.key ? '−' : '+'}</span>
				</button>
				{#if open === it.key}
					<div class="border-t border-line p-3.5">
						<textarea rows="7" class="input text-sm" value={text(it)} oninput={(e) => (edited[it.key] = e.currentTarget.value)} aria-label="Message"></textarea>
						<form
							method="POST"
							action={act('inbox')}
							class="mt-3 flex flex-wrap items-center gap-2"
							use:enhance={({ submitter }) => {
								const how = (submitter as HTMLButtonElement | null)?.dataset.how;
								if (how === 'mail') window.location.href = mailto(it);
								if (how === 'copy') navigator.clipboard.writeText(text(it));
								done[it.key] = how === 'skip' ? 'Skipped' : how === 'copy' ? 'Copied, marked as sent' : 'Marked as sent';
								return async ({ update }) => update({ reset: false });
							}}
						>
							<input type="hidden" name="kind" value={it.kind} /><input type="hidden" name="id" value={it.id} />
							{#if it.to}<button name="sent" value="1" data-how="mail" class="btn btn-primary text-sm">Send from my email</button>{/if}
							<button name="sent" value="1" data-how="copy" class="{it.to ? 'pill' : 'btn btn-primary'} text-sm">Copy {it.kind === 'payment' ? '' : 'for a DM '}& mark sent</button>
							{#if it.phone}<a href="tel:{it.phone}" class="pill text-sm">Call {it.phone}</a>{/if}
							<button name="sent" value="0" data-how="skip" class="text-sm text-muted underline">{it.kind === 'first' ? 'Not a fit' : 'Later'}</button>
						</form>
						{#if it.kind === 'payment'}
							<form method="POST" action={act('paid')} use:enhance={() => { done[it.key] = 'Paid'; return async ({ update }) => update({ reset: false }); }} class="mt-2"><input type="hidden" name="id" value={it.id} /><button class="text-xs text-good underline">They paid</button></form>
						{/if}
					</div>
				{/if}
			</li>
		{:else}
			<li class="rounded-[18px] bg-tile p-4 text-sm text-ink-2">All done for today. New prospects, follow-ups and payment reminders appear here when they are due.</li>
		{/each}
	</ul>
	{#if Object.keys(done).length}<p class="mt-3 text-xs text-muted">{Object.values(done).length} handled today. Follow-ups come back here in 4 days if nobody answers.</p>{/if}
</section>
