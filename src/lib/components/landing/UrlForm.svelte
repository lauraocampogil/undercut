<!-- The single conversion action of the landing: paste a store URL, run a real analysis. -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { track } from '$lib/analytics';

	let {
		id,
		dark = false,
		value = '',
		error = null,
		onloading
	}: { id: string; dark?: boolean; value?: string; error?: string | null; onloading?: (v: boolean) => void } = $props();

	let loading = $state(false);
</script>

<form
	method="POST"
	action="/?/analyze"
	class="flex w-full max-w-xl flex-col gap-2 rounded-[28px] p-2 sm:flex-row sm:rounded-full {dark ? 'bg-cream' : 'bg-white shadow-[0_0_0_2px_var(--color-ink)]'}"
	use:enhance={() => {
		loading = true;
		onloading?.(true);
		track('analysis_started', { placement: id });
		return async ({ result, update }) => {
			if (result.type === 'failure') track('analysis_failed', { placement: id });
			await update();
			loading = false;
			onloading?.(false);
		};
	}}
>
	<input type="hidden" name="placement" value={id} />
	<label for="{id}-url" class="sr-only">Your Shopify store URL</label>
	<input
		id="{id}-url"
		name="url"
		type="text"
		inputmode="url"
		autocomplete="url"
		placeholder="yourstore.com"
		required
		{value}
		disabled={loading}
		class="min-w-0 flex-1 bg-transparent px-5 py-3 text-[17px] text-ink outline-none placeholder:text-muted/60"
	/>
	<button class="btn-accent text-[17px]" disabled={loading}>
		{loading ? 'Analyzing…' : 'Analyze for free →'}
	</button>
</form>
{#if error}<p class="mt-3 text-sm font-medium text-down" role="alert">{error}</p>{/if}
