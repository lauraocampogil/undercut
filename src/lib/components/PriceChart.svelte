<script lang="ts">
	import { money } from '$lib/format';

	type Point = { day: string; price: number; compare_at: number | null };
	let { points, currency }: { points: Point[]; currency: string | null } = $props();

	const W = 640,
		H = 220,
		P = { l: 56, r: 16, t: 16, b: 28 };

	const geo = $derived.by(() => {
		if (!points.length) return null;
		const values = points.flatMap((p) => [p.price, p.compare_at ?? p.price]);
		let lo = Math.min(...values),
			hi = Math.max(...values);
		if (lo === hi) {
			lo *= 0.9;
			hi *= 1.1;
		}
		const pad = (hi - lo) * 0.15;
		lo -= pad;
		hi += pad;
		const t = (d: string) => Date.parse(d);
		const t0 = t(points[0].day),
			t1 = t(points.at(-1)!.day);
		const x = (d: string) => (t1 === t0 ? (P.l + W - P.r) / 2 : P.l + ((t(d) - t0) / (t1 - t0)) * (W - P.l - P.r));
		const y = (v: number) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
		// stepped line: a price holds until the next change
		let d = '';
		points.forEach((p, i) => {
			const px = x(p.day),
				py = y(p.price);
			d += i === 0 ? `M${px} ${py}` : `H${px}V${py}`;
		});
		const ticks = [lo + pad, (lo + hi) / 2, hi - pad];
		return { x, y, d, ticks };
	});
</script>

{#if geo}
	<svg viewBox="0 0 {W} {H}" class="h-auto w-full" role="img" aria-label="Price history">
		{#each geo.ticks as v (v)}
			<line x1={P.l} x2={W - P.r} y1={geo.y(v)} y2={geo.y(v)} stroke="var(--color-line)" />
			<text x={P.l - 8} y={geo.y(v) + 4} text-anchor="end" font-size="11" fill="var(--color-muted)">{money(v, currency)}</text>
		{/each}
		{#each points.filter((p) => p.compare_at) as p (p.day)}
			<circle cx={geo.x(p.day)} cy={geo.y(p.compare_at!)} r="2.5" fill="var(--color-muted)" opacity="0.5" />
		{/each}
		<path d={geo.d} fill="none" stroke="var(--color-accent)" stroke-width="2" />
		{#each points as p (p.day)}
			<circle cx={geo.x(p.day)} cy={geo.y(p.price)} r="3.5" fill="white" stroke="var(--color-accent)" stroke-width="2" />
		{/each}
		<text x={P.l} y={H - 6} font-size="11" fill="var(--color-muted)">{points[0].day}</text>
		<text x={W - P.r} y={H - 6} font-size="11" text-anchor="end" fill="var(--color-muted)">{points.at(-1)!.day}</text>
	</svg>
{/if}
