<script lang="ts">
	import AppIcon from './AppIcon.svelte';
	let { href = '/', dark = false }: { href?: string; dark?: boolean } = $props();
</script>

<a {href} class="flex items-center gap-2 {dark ? 'text-cream' : 'text-ink'}" aria-label="Undercut home">
	<AppIcon size={36} bg={dark ? 'tangerine' : 'ink'} />
	<span class="wordmark text-2xl">undercut</span>
</a>
