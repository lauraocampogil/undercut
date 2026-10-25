<!--
  The Undercut mascot: a price tag that peeks over edges.
  Its body ends flat at y=200 of the 240×210 viewBox and the hands hang below,
  so placing it with a negative bottom margin of ~4% of its width makes it "grip" an edge.
-->
<script lang="ts">
	type Mood = 'spy' | 'shock' | 'happy';
	let {
		mood = 'spy',
		color = 'tangerine',
		size = 240,
		hole = '#FFF1D6',
		label,
		class: klass = ''
	}: { mood?: Mood; color?: 'tangerine' | 'ink'; size?: number; hole?: string; label?: string; class?: string } = $props();

	const ink = $derived(color === 'ink');
	const body = $derived(ink ? '#111111' : '#FF6A3D');
	const face = $derived(ink ? '#FFF1D6' : '#111111');
	const cheek = $derived(ink ? '#FF6A3D' : '#FFB59E');
</script>

<svg
	width={size}
	height={Math.round((size * 210) / 240)}
	viewBox="0 0 240 210"
	class="block shrink-0 {klass}"
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
>
	<path d="M120 58 C 120 30, 150 12, 182 20" fill="none" stroke="#111111" stroke-width="5" stroke-linecap="round" />
	<path d="M44 200 V98 L120 36 L196 98 V200 Z" fill={body} stroke={body} stroke-width="20" stroke-linejoin="round" />
	<circle cx="120" cy="72" r="11" fill={hole} stroke="#111111" stroke-width="4" />
	{#if mood === 'spy'}
		<path d="M66 140 A24 24 0 0 1 114 140 Z" fill="#FFFFFF" />
		<path d="M126 140 A24 24 0 0 1 174 140 Z" fill="#FFFFFF" />
		<path d="M86 140 A14 14 0 0 1 114 140 Z" fill="#111111" />
		<path d="M146 140 A14 14 0 0 1 174 140 Z" fill="#111111" />
		<circle cx="107" cy="131" r="3" fill="#FFFFFF" />
		<circle cx="167" cy="131" r="3" fill="#FFFFFF" />
		<path d="M110 162 Q120 170 130 162" fill="none" stroke={face} stroke-width="5" stroke-linecap="round" />
	{:else if mood === 'shock'}
		<circle cx="90" cy="130" r="22" fill="#FFFFFF" />
		<circle cx="150" cy="130" r="22" fill="#FFFFFF" />
		<circle cx="90" cy="132" r="10" fill="#111111" />
		<circle cx="150" cy="132" r="10" fill="#111111" />
		<circle cx="94" cy="127" r="3" fill="#FFFFFF" />
		<circle cx="154" cy="127" r="3" fill="#FFFFFF" />
		<ellipse cx="120" cy="170" rx="7" ry="9" fill={face} />
	{:else}
		<path d="M70 138 Q90 120 110 138" fill="none" stroke={face} stroke-width="7" stroke-linecap="round" />
		<path d="M130 138 Q150 120 170 138" fill="none" stroke={face} stroke-width="7" stroke-linecap="round" />
		<path d="M108 160 Q120 172 132 160" fill="none" stroke={face} stroke-width="5" stroke-linecap="round" />
	{/if}
	<ellipse cx="66" cy="160" rx="11" ry="6.5" fill={cheek} />
	<ellipse cx="174" cy="160" rx="11" ry="6.5" fill={cheek} />
	<rect x="38" y="188" width="38" height="22" rx="11" fill={body} stroke={face === '#FFF1D6' ? '#FFF1D6' : '#111111'} stroke-width="4" />
	<rect x="164" y="188" width="38" height="22" rx="11" fill={body} stroke={face === '#FFF1D6' ? '#FFF1D6' : '#111111'} stroke-width="4" />
</svg>
