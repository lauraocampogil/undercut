<script lang="ts">
	let { demoMode, hasSearch }: { demoMode: boolean; hasSearch: boolean } = $props();
</script>

{#if demoMode || !hasSearch}
	<div class="bg-ink px-4 py-2 text-center text-xs font-medium text-stone">
		{#if demoMode}Demo mode: data lives in <code>data/db.json</code> and login skips email verification.{/if}
		{#if !hasSearch}
			No <code>SERPAPI_KEY</code> or <code>BRAVE_SEARCH_KEY</code>: automatic discovery is off, add competitors by hand.{/if}
	</div>
{/if}
