<script lang="ts">
	import { enhance } from '$app/forms';
	import { DAYS } from '$lib/format';

	let { data, form } = $props();
	const order = [1, 2, 3, 4, 5, 6, 0];
</script>

<svelte:head><title>Settings · Undercut</title></svelte:head>

<h1 class="display text-6xl">Settings</h1>

<section class="card mt-8 max-w-xl p-6">
	<h2 class="font-semibold">Weekly summary</h2>
	<p class="mt-1 text-sm text-muted">
		A short summary with the number of changes and the highlight, so you come back to your dashboard. Nothing more. Push notifications arrive in Phase 4.
	</p>
	<form method="POST" action="?/save" use:enhance class="mt-5 flex flex-wrap items-center gap-3">
		<label for="day" class="text-sm">Send every</label>
		<select id="day" name="reminder_day" class="input w-auto py-2" value={data.reminderDay}>
			{#each order as d (d)}<option value={d}>{DAYS[d]}</option>{/each}
		</select>
		<button class="btn py-2">Save</button>
		{#if form?.saved}<span class="text-sm text-up">Saved</span>{/if}
	</form>
	<form method="POST" action="?/test" use:enhance class="mt-4">
		<button class="text-sm text-muted underline hover:text-ink">Send me a test one now</button>
		{#if form?.tested}<span class="ml-2 text-sm text-up">Sent {data.demoMode ? '(check the server console)' : ''}</span>{/if}
	</form>
</section>

<section class="card mt-6 max-w-xl p-6">
	<h2 class="font-semibold">Your store</h2>
	<p class="mt-1 text-sm text-muted">{data.own?.domain ?? 'You haven’t analyzed your store yet.'}</p>
	<a href="/" class="btn-ghost mt-4">Analyze another store</a>
</section>
