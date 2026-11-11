<script lang="ts">
	// Lighthouse-style score circle: green ≥ 90, orange 50–89, red < 50
	let { score, label, size = 84 }: { score: number; label: string; size?: number } = $props();
	const stroke = $derived(size * 0.09);
	const r = $derived(size / 2 - stroke / 2 - 1);
	const c = $derived(2 * Math.PI * r);
	const color = $derived(score >= 90 ? '#0CCE6B' : score >= 50 ? '#FFA400' : '#FF4E42');
	const bg = $derived(score >= 90 ? '#E6F9EF' : score >= 50 ? '#FFF4E0' : '#FFEDEB');
</script>

<div class="flex flex-col items-center gap-2 text-center">
	<svg width={size} height={size} viewBox="0 0 {size} {size}" role="img" aria-label="{label}: {score} out of 100">
		<circle cx={size / 2} cy={size / 2} r={r} fill={bg} stroke={bg} stroke-width={stroke} />
		<circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} stroke-width={stroke} stroke-linecap="round" stroke-dasharray="{(score / 100) * c} {c}" transform="rotate(-90 {size / 2} {size / 2})" />
		<text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-size={size * 0.3} font-weight="500" fill={color}>{score}</text>
	</svg>
	<span class="text-xs font-medium">{label}</span>
</div>
