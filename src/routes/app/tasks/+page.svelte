<script lang="ts">
	import { enhance } from '$app/forms';
	import { dayLabel, short, todayIso } from '#lib/biz-format.ts';
	let { data, form } = $props();
	let show = $state<'open' | 'done'>('open');
	const t = todayIso();
	const keep = () => async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => update({ reset: false });
	const clear = () => async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => update();
	const list = $derived(data.tasks.filter((k) => (show === 'open' ? !k.done : k.done)));
	const days = $derived.by(() => {
		const m = new Map<string, typeof data.agenda>();
		for (const a of data.agenda) {
			const key = a.late ? 'late' : a.date;
			m.set(key, [...(m.get(key) ?? []), a]);
		}
		return [...m.entries()];
	});
	const KIND: Record<string, string> = { meeting: 'Meeting', task: 'Task', followup: 'Follow-up', invoice: 'Invoice' };
</script>

<svelte:head><title>Tasks & agenda · Undercut</title></svelte:head>

<h1 class="text-[34px] leading-tight font-medium tracking-tight sm:text-[44px]">Tasks & agenda</h1>

<div class="mt-6 grid items-start gap-4 lg:grid-cols-2">
	<!-- tasks -->
	<section class="card p-5 sm:p-6">
		<div class="flex items-center justify-between gap-3">
			<h2 class="font-medium">Tasks</h2>
			<div class="flex gap-1.5">
				<button class="pill text-xs {show === 'open' ? 'pill-active' : ''}" onclick={() => (show = 'open')}>To do {data.tasks.filter((k) => !k.done).length}</button>
				<button class="pill text-xs {show === 'done' ? 'pill-active' : ''}" onclick={() => (show = 'done')}>Done {data.tasks.filter((k) => k.done).length}</button>
			</div>
		</div>
		<form method="POST" action="?/task" use:enhance={clear} class="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
			<input name="title" required placeholder="What needs doing?" class="input text-sm sm:col-span-2" />
			<div class="flex gap-2">
				<select name="clientId" class="input min-w-0 flex-1 text-sm"><option value="">No client</option>{#each data.clients as c (c.id)}<option value={c.id}>{c.name}</option>{/each}</select>
				<input name="due" type="date" class="input w-40 min-w-0 text-sm" aria-label="Due date" />
			</div>
			<button class="btn btn-primary text-sm">Add task</button>
		</form>
		{#if form?.taskError}<p class="mt-2 text-sm text-bad">{form.taskError}</p>{/if}
		<ul class="mt-4 divide-y divide-line">
			{#each list as k (k.id)}
				<li class="group flex items-center gap-3 py-2.5 text-sm">
					<form method="POST" action="?/toggleTask" use:enhance={keep}><input type="hidden" name="id" value={k.id} /><button class="grid size-5 place-items-center rounded-md border {k.done ? 'border-ink bg-ink text-white' : 'border-ink/25 hover:border-ink'}" aria-label={k.done ? 'Mark as not done' : 'Mark as done'}>{k.done ? '✓' : ''}</button></form>
					<span class="min-w-0 flex-1">
						<span class="block truncate {k.done ? 'text-muted line-through' : ''}">{k.title}</span>
						{#if k.clientId && data.names[k.clientId]}<a href="/app/crm/{k.clientId}" class="text-xs text-muted hover:underline">{data.names[k.clientId]}</a>{/if}
					</span>
					{#if k.due}<span class="shrink-0 text-xs {!k.done && k.due < t ? 'text-bad' : 'text-muted'}">{k.due === t ? 'Today' : short(k.due)}</span>{/if}
					<form method="POST" action="?/deleteTask" use:enhance={keep}><input type="hidden" name="id" value={k.id} /><button class="text-xs text-muted opacity-0 group-hover:opacity-100 hover:text-bad focus:opacity-100" aria-label="Delete task">✕</button></form>
				</li>
			{:else}
				<li class="py-3 text-sm text-muted">{show === 'open' ? 'Nothing to do. Add your first task above.' : 'No finished tasks yet.'}</li>
			{/each}
		</ul>
	</section>

	<!-- agenda -->
	<section class="card p-5 sm:p-6">
		<h2 class="font-medium">Next 14 days</h2>
		<form method="POST" action="?/meeting" use:enhance={clear} class="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
			<input name="title" required placeholder="Add a meeting or call" class="input text-sm sm:col-span-2" />
			<div class="flex gap-2">
				<input name="date" type="date" required value={t} class="input min-w-0 flex-1 text-sm" aria-label="Date" />
				<input name="time" type="time" class="input w-28 min-w-0 text-sm" aria-label="Time" />
				<select name="clientId" class="input min-w-0 flex-1 text-sm"><option value="">No client</option>{#each data.clients as c (c.id)}<option value={c.id}>{c.name}</option>{/each}</select>
			</div>
			<button class="btn btn-primary text-sm">Add</button>
		</form>
		{#if form?.meetingError}<p class="mt-2 text-sm text-bad">{form.meetingError}</p>{/if}
		<div class="mt-5 space-y-5">
			{#each days as [key, items] (key)}
				<div>
					<p class="text-xs font-medium {key === 'late' ? 'text-bad' : 'text-muted'}">{key === 'late' ? 'Late' : key === t ? 'Today' : dayLabel(key)}</p>
					<ul class="mt-1.5 space-y-1.5">
						{#each items as a (a.kind + a.id)}
							<li class="group flex items-center gap-3 rounded-[14px] bg-tile px-3 py-2.5 text-sm">
								<span class="w-12 shrink-0 text-xs text-muted">{a.time ?? (key === 'late' ? short(a.date).slice(0, 6) : '')}</span>
								<a href={a.href} class="min-w-0 flex-1 hover:underline"><span class="block truncate">{a.title}</span>{#if a.sub}<span class="block truncate text-xs text-muted">{a.sub}</span>{/if}</a>
								<span class="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] text-ink-2">{KIND[a.kind]}</span>
								{#if a.kind === 'meeting'}<form method="POST" action="?/deleteMeeting" use:enhance={keep}><input type="hidden" name="id" value={a.id} /><button class="text-xs text-muted opacity-0 group-hover:opacity-100 hover:text-bad focus:opacity-100" aria-label="Delete meeting">✕</button></form>{/if}
							</li>
						{/each}
					</ul>
				</div>
			{:else}
				<p class="text-sm text-muted">Nothing in the next 14 days. Meetings you add, tasks with a date, prospect follow-ups and invoices due all show up here.</p>
			{/each}
		</div>
	</section>
</div>
