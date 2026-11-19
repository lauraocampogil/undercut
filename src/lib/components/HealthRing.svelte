<script lang="ts">
	// Thick arc gauge, as in the "Automatic Payment" reference
	let { score, size = 56, dark = false }: { score: number; size?: number; dark?: boolean } = $props();
	const stroke = $derived(Math.max(5, size * 0.13));
	const r = $derived(size / 2 - stroke / 2 - 1);
	const c = $derived(2 * Math.PI * r);
	const color = $derived(score >= 75 ? (dark ? 'var(--color-accent)' : '#0D0D0D') : score >= 50 ? '#E3A21A' : '#E0473E');
</script>

<svg width={size} height={size} viewBox="0 0 {size} {size}" role="img" aria-label="Health score {score} out of 100" class="shrink-0">
	<circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={dark ? 'rgba(255,255,255,.12)' : '#E6E6E1'} stroke-width={stroke} />
	<circle
		cx={size / 2}
		cy={size / 2}
		r={r}
		fill="none"
		stroke={color}
		stroke-width={stroke}
		stroke-linecap="round"
		stroke-dasharray="{(score / 100) * c} {c}"
		transform="rotate(-90 {size / 2} {size / 2})"
	/>
	<text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-size={size * 0.28} font-weight="500" fill={dark ? '#fff' : '#0D0D0D'}>{score}</text>
</svg>
