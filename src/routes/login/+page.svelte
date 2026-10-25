<script lang="ts">
	import Brand from '$lib/components/Brand.svelte';
	import DemoBanner from '$lib/components/DemoBanner.svelte';

	let { data, form } = $props();
</script>

<svelte:head><title>Log in · Undercut</title></svelte:head>

<DemoBanner demoMode={data.demoMode} hasSearch={data.hasSearch} />

<main class="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4">
	<Brand />
	{#if form?.sent}
		<h1 class="mt-10 font-display text-4xl">Check your email</h1>
		<p class="mt-3 text-muted">We sent a link to <strong class="text-ink">{form.email}</strong>. Open it to log in.</p>
	{:else}
		<h1 class="mt-10 font-display text-4xl">
			{data.analysis ? 'Save your competitors' : 'Log in to Undercut'}
		</h1>
		<p class="mt-3 text-muted">
			{data.demoMode ? 'Demo mode: you log in straight away with your email.' : 'We’ll email you a magic link. No password.'}
		</p>
		<form method="POST" class="mt-8 space-y-3">
			<input type="hidden" name="analysis" value={data.analysis ?? ''} />
			<input name="email" type="email" class="input" placeholder="you@yourstore.com" value={form?.email ?? ''} required autocomplete="email" />
			<button class="btn w-full">{data.demoMode ? 'Log in' : 'Email me the link'}</button>
			{#if form?.error}<p class="text-sm text-down">{form.error}</p>{/if}
		</form>
	{/if}
</main>
