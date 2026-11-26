<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	let { data } = $props();
</script>

<svelte:head><title>Undercut</title><meta name="robots" content="noindex" /></svelte:head>

<main class="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-6">
	<Logo />
	{#if data.ok}
		<h1 class="text-2xl font-medium tracking-tight">You’re unsubscribed</h1>
		<p class="text-ink-2">{data.email} won’t get any more emails from Undercut. Changed your mind? Write to hello@getundercut.app.</p>
	{:else}
		<h1 class="text-2xl font-medium tracking-tight">This link doesn’t work</h1>
		<p class="text-ink-2">It may be incomplete. Open it again from the email, or write to hello@getundercut.app and we’ll remove you by hand.</p>
	{/if}
</main>
