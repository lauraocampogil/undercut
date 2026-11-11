<script lang="ts">
	let { state, dark = false }: { state: 'demo' | 'google' | 'error' | 'off' | 'serpapi'; dark?: boolean } = $props();
	const label = { google: 'Live', serpapi: 'Live', demo: 'Demo', error: 'Error', off: 'Not linked' } as const;
	const live = $derived(state === 'google' || state === 'serpapi');
</script>

<span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium {dark ? 'bg-white/10 text-white/70' : 'bg-tile text-muted'}">
	<span class="size-1.5 rounded-full {live ? 'bg-good' : state === 'error' ? 'bg-bad' : 'bg-[#b5b5b0]'}"></span>{label[state]}
</span>
