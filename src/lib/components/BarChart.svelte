<script lang="ts">
	// Rounded grey bars, the best day in lime with a black value pill (reference "Sales funnel")
	import { day, n } from '#lib/format.ts';
	type P = { date: string; value: number };
	let { data, height = 220, unit = 'visits', dark = false }: { data: P[]; height?: number; unit?: string; dark?: boolean } = $props();
	let hover = $state<number | null>(null);
	const max = $derived(Math.max(1, ...data.map((d) => d.value)));
	const best = $derived(data.reduce((bi, d, i) => (d.value > data[bi].value ? i : bi), 0));
	const active = $derived(hover ?? best);
	const W = 700;
	const top = 34;
	const bottom = 26;
	const gap = $derived(data.length > 40 ? 2 : data.length > 20 ? 5 : 10);
	const bw = $derived((W - gap * (data.length - 1)) / data.length);
	const h = (v: number) => Math.max(6, (v / max) * (height - top - bottom));
	const x = (i: number) => i * (bw + gap);
	const labelEvery = $derived(Math.ceil(data.length / 7));
</script>

<svg viewBox="0 0 {W} {height}" class="block w-full" role="img" aria-label="Bar chart of {unit} per day" onpointerleave={() => (hover = null)}>
	{#each data as d, i (d.date)}
		{@const bh = h(d.value)}
		<rect
			x={x(i)}
			y={height - bottom - bh}
			width={bw}
			height={bh}
			rx={Math.min(bw / 2, 14)}
			fill={i === active ? 'var(--color-accent)' : dark ? 'rgba(255,255,255,.14)' : '#E7E7E2'}
			class="transition-[fill] duration-150"
			role="presentation"
			onpointerenter={() => (hover = i)}
		/>
		{#if (i % labelEvery === 0 && Math.abs(i - active) > 1) || i === active}
			<text x={i === 0 ? x(i) : i === data.length - 1 ? x(i) + bw : x(i) + bw / 2} y={height - 6} text-anchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} font-size="11" fill={i === active ? (dark ? '#fff' : '#0D0D0D') : '#9A9CA1'} font-weight={i === active ? 600 : 400}>{day(d.date)}</text>
		{/if}
	{/each}
	{#if data[active]}
		{@const ax = Math.min(W - 44, Math.max(44, x(active) + bw / 2))}
		{@const ay = height - bottom - h(data[active].value) - 12}
		<g pointer-events="none">
			<rect x={ax - 42} y={ay - 22} width="84" height="26" rx="13" fill={dark ? '#fff' : '#0D0D0D'} />
			<text x={ax} y={ay - 5} text-anchor="middle" font-size="12" font-weight="600" fill={dark ? '#0D0D0D' : '#fff'}>{n(data[active].value)}</text>
		</g>
	{/if}
</svg>
