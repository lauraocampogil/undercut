<script lang="ts">
	import { page } from '$app/state';
	import Mascot from '$lib/components/Mascot.svelte';
	import Sparkle from '$lib/components/Sparkle.svelte';
	import { errorMessage } from '$lib/httpErrors';

	const status = $derived(page.status);
	const message = $derived(errorMessage(status));
	const title = $derived(status === 404 ? 'Nothing to see here.' : status >= 500 ? 'Oops, our bad.' : 'That didn’t work.');
</script>

<svelte:head>
	<title>{status} · Undercut</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="relative grid min-h-screen place-items-center overflow-hidden bg-cream px-5 py-16 sm:px-8">
	<Sparkle size={36} twinkle class="absolute top-[18%] left-[14%]" />
	<Sparkle size={20} color="#111111" twinkle delay={0.8} class="absolute top-[26%] right-[16%]" />
	<Sparkle size={16} twinkle delay={1.6} class="absolute bottom-[22%] left-[22%]" />

	<div class="flex max-w-xl flex-col items-center gap-6 text-center">
		<div class="flex flex-col items-center">
			<div class="relative z-10 -mb-[7px]">
				<Mascot mood="shock" size={150} animated />
			</div>
			<div class="rounded-[28px] bg-ink px-10 pt-6 pb-4 text-cream">
				<span class="display text-[clamp(80px,16vw,150px)] leading-none">{status}</span>
			</div>
		</div>

		<h1 class="display text-[clamp(40px,6vw,64px)] text-ink">{title}</h1>
		<p class="text-lg leading-relaxed text-muted">{message}</p>

		<div class="mt-2 flex flex-wrap justify-center gap-3">
			<a href="/" class="btn-accent">Back to home</a>
			{#if status >= 500}
				<button type="button" class="btn-ghost font-bold" onclick={() => location.reload()}>Try again</button>
			{:else}
				<a href="/dashboard" class="btn-ghost font-bold">Go to dashboard</a>
			{/if}
		</div>
	</div>
</main>
