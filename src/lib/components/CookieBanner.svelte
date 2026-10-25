<script lang="ts">
	import { onMount } from 'svelte';
	import { analyticsEnabled, getConsent, setConsent, initAnalytics } from '$lib/analytics';

	let open = $state(false);

	onMount(() => {
		if (!analyticsEnabled()) return;
		if (getConsent() === null) open = true;
		else void initAnalytics();
	});

	const choose = (v: 'granted' | 'denied') => {
		setConsent(v);
		open = false;
	};
</script>

{#if open}
	<div
		role="dialog"
		aria-live="polite"
		aria-label="Cookie preferences"
		class="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl flex-col gap-3 rounded-3xl bg-ink p-5 text-cream shadow-[6px_6px_0_var(--color-tangerine)] sm:flex-row sm:items-center"
	>
		<p class="text-sm leading-relaxed">
			We use cookies to understand how people use Undercut and to fix problems fast. No ads, ever.
		</p>
		<div class="flex shrink-0 gap-2">
			<button type="button" class="rounded-full px-4 py-2 text-sm font-semibold text-stone hover:text-cream" onclick={() => choose('denied')}>
				Decline
			</button>
			<button type="button" class="rounded-full bg-tangerine px-4 py-2 text-sm font-bold text-ink" onclick={() => choose('granted')}>
				Accept
			</button>
		</div>
	</div>
{/if}
