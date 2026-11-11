<script lang="ts">
	let { href, label = 'Open', dark = false, target }: { href: string; label?: string; dark?: boolean; target?: string } = $props();
</script>

<a {href} {target} class="icon-btn {dark ? 'border-white/20 text-white hover:bg-white hover:text-ink' : ''}" aria-label={label}>
	<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 17 17 7M8 7h9v9" /></svg>
</a>
