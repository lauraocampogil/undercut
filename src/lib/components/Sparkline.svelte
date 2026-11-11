<script lang="ts">
	import type { Point } from '#lib/types.ts';
	let { data, color = '#111214', width = 120, height = 36 }: { data: Point[]; color?: string; width?: number; height?: number } = $props();
	const max = $derived(Math.max(1, ...data.map((d) => d.value)));
	const min = $derived(Math.min(...data.map((d) => d.value)));
	const path = $derived(
		data
			.map((d, i) => {
				const x = (i / Math.max(1, data.length - 1)) * width;
				const y = height - 3 - ((d.value - min) / Math.max(1, max - min)) * (height - 6);
				return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
			})
			.join('')
	);
</script>

<svg viewBox="0 0 {width} {height}" class="block h-auto w-full" style="max-width:{width}px" preserveAspectRatio="none" aria-hidden="true">
	<path d={path} fill="none" stroke={color} stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
</svg>
