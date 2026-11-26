<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
</script>

<svelte:head><title>Undercut</title></svelte:head>

<main class="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-6">
	<Logo />
	<h1 class="text-2xl font-medium tracking-tight">This link doesn’t work</h1>
	<p class="text-ink-2">It may be incomplete. Open the link from the email again, or join the list with your email: you’ll get a new one.</p>
	<a href="/waitlist" class="btn btn-primary self-start">Back to the waitlist</a>
</main>
