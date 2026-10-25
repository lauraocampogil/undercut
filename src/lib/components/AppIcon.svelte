<!-- Square app icon with the mascot peeking up from the bottom edge. -->
<script lang="ts">
	import Mascot from './Mascot.svelte';
	let {
		size = 40,
		bg = 'ink',
		mood = 'spy'
	}: { size?: number; bg?: 'ink' | 'tangerine'; mood?: 'spy' | 'shock' | 'happy' } = $props();
	const m = $derived(Math.round(size * 0.84));
</script>

<span
	class="relative block shrink-0 overflow-hidden {bg === 'ink' ? 'bg-ink' : 'bg-tangerine'}"
	style="width:{size}px;height:{size}px;border-radius:{Math.round(size * 0.26)}px"
	aria-hidden="true"
>
	<span class="absolute block" style="left:{Math.round((size - m) / 2)}px;top:{size - Math.round((m * 200) / 240)}px">
		<Mascot {mood} size={m} color={bg === 'ink' ? 'tangerine' : 'ink'} />
	</span>
</span>
