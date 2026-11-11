<script lang="ts">
	// invert: for metrics where lower is better (Google position)
	let { value, invert = false, suffix = '%', dark = false }: { value: number; invert?: boolean; suffix?: string; dark?: boolean } = $props();
	const good = $derived(invert ? value < 0 : value > 0);
	const flat = $derived(value === 0);
	const cls = $derived(
		flat ? (dark ? 'bg-white/10 text-white/60' : 'bg-tile text-muted') : good ? (dark ? 'bg-accent text-accent-ink' : 'bg-good-bg text-good') : dark ? 'bg-[#ff6b5e]/20 text-[#ff8a80]' : 'bg-bad-bg text-bad'
	);
</script>

<span class="num inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium {cls}">
	{#if !flat}<span aria-hidden="true">{value > 0 ? '↑' : '↓'}</span>{/if}{Math.abs(value)}{suffix}
</span>
