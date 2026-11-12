<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();
	let running = $state(false);
	const dot = { good: 'bg-good', warn: 'bg-[#E3A21A]', bad: 'bg-bad' };
	const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
	const unread = $derived(data.alerts.filter((a) => !a.read).length);
</script>

<svelte:head><title>Alerts · Undercut</title></svelte:head>

<section class="flex flex-wrap items-end justify-between gap-4">
	<div>
		<p class="label">Only what needs you — by email, Slack and here</p>
		<h1 class="display mt-2 text-[56px] sm:text-[72px]">Alerts</h1>
	</div>
	<div class="flex flex-wrap gap-2">
		<form method="POST" action="?/run" use:enhance={() => { running = true; return async ({ update }) => { await update(); running = false; }; }}>
			<button class="btn btn-primary" disabled={running}>{running ? 'Checking all clients…' : 'Check now'}</button>
		</form>
		{#if unread}<form method="POST" action="?/read" use:enhance><button class="btn btn-ghost">Mark all as read</button></form>{/if}
		<a href="/app/settings/alerts" class="btn btn-ghost">Settings</a>
	</div>
</section>

{#if form && 'found' in form}<p class="mt-4 rounded-[20px] bg-good-bg p-4 text-sm text-good">{form.found ? `${form.found} new alert${form.found > 1 ? 's' : ''}.` : 'All clients checked — nothing new.'}</p>{/if}

<ul class="mt-6 grid gap-3">
	{#each data.alerts as a (a.id)}
		<li class="flex items-start gap-4 p-5 {a.read ? 'card' : a.level === 'bad' ? 'card-dark' : 'card ring-2 ring-[#E3A21A]/40'}">
			<span class="mt-2 size-2.5 shrink-0 rounded-full {dot[a.level]}"></span>
			<div class="min-w-0 flex-1">
				<p class="text-xs {a.read || a.level !== 'bad' ? 'text-muted' : 'text-white/50'}">{a.clientName} · {when(a.createdAt)}{a.sentTo.length ? ` · sent by ${a.sentTo.join(' + ')}` : ''}</p>
				<p class="mt-1 font-medium">{a.title}</p>
				<p class="mt-1 text-sm {a.read || a.level !== 'bad' ? 'text-ink-2' : 'text-white/70'}">{a.detail}</p>
			</div>
			<a href={a.href} class="btn shrink-0 px-4 py-2 text-sm {!a.read && a.level === 'bad' ? 'btn-accent' : 'btn-ghost'}">Open →</a>
		</li>
	{:else}
		<li class="card p-10 text-center">
			<p class="display text-4xl">Nothing to worry about ✓</p>
			<p class="mt-2 text-sm text-muted">Undercut checks every client daily and only writes when something drops, breaks or needs a reply.</p>
		</li>
	{/each}
</ul>
