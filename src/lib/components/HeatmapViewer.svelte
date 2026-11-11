<script lang="ts">
	// Draws a click heatmap or a scroll map on top of a sandboxed snapshot of the real page.
	type P = { x: number; y: number; v: number };
	let {
		src,
		width,
		height,
		points,
		reach,
		foldPx,
		rage = [],
		mode = 'clicks'
	}: { src: string; width: number; height: number; points: P[]; reach: number[]; foldPx: number; rage?: { label: string; count: number; x: number; y: number }[]; mode?: 'clicks' | 'scroll' } = $props();

	let box = $state<HTMLDivElement>();
	let canvas = $state<HTMLCanvasElement>();
	let boxW = $state(800);
	const scale = $derived(Math.min(1, boxW / width));
	const H = $derived(Math.min(height, 9000));

	$effect(() => {
		if (!box) return;
		const ro = new ResizeObserver(([e]) => (boxW = e.contentRect.width));
		ro.observe(box);
		return () => ro.disconnect();
	});

	// classic heat palette: transparent → blue → cyan → lime → yellow → red
	function palette() {
		const c = document.createElement('canvas');
		c.width = 256;
		c.height = 1;
		const g = c.getContext('2d')!;
		const grad = g.createLinearGradient(0, 0, 256, 0);
		grad.addColorStop(0.0, 'rgba(0,0,255,0)');
		grad.addColorStop(0.2, 'rgb(0,80,255)');
		grad.addColorStop(0.45, 'rgb(0,220,200)');
		grad.addColorStop(0.65, 'rgb(198,244,50)');
		grad.addColorStop(0.82, 'rgb(255,200,0)');
		grad.addColorStop(1.0, 'rgb(255,40,20)');
		g.fillStyle = grad;
		g.fillRect(0, 0, 256, 1);
		return g.getImageData(0, 0, 256, 1).data;
	}

	$effect(() => {
		if (!canvas || mode !== 'clicks') return;
		const ctx = canvas.getContext('2d')!;
		canvas.width = width;
		canvas.height = H;
		ctx.clearRect(0, 0, width, H);
		const max = Math.max(1, ...points.map((p) => p.v));
		const r = width < 600 ? 20 : 26;
		for (const p of points) {
			const x = p.x * width;
			const g = ctx.createRadialGradient(x, p.y, 0, x, p.y, r);
			const a = 0.05 + (p.v / max) * 0.18;
			g.addColorStop(0, `rgba(0,0,0,${a})`);
			g.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = g;
			ctx.fillRect(x - r, p.y - r, r * 2, r * 2);
		}
		const img = ctx.getImageData(0, 0, width, H);
		const pal = palette();
		let peak = 1;
		for (let i = 3; i < img.data.length; i += 4) if (img.data[i] > peak) peak = img.data[i];
		for (let i = 0; i < img.data.length; i += 4) {
			const alpha = img.data[i + 3];
			if (alpha < 6) {
				img.data[i + 3] = 0;
				continue;
			}
			const t = Math.min(1, alpha / peak);
			const k = Math.round(t * 255) * 4;
			img.data[i] = pal[k];
			img.data[i + 1] = pal[k + 1];
			img.data[i + 2] = pal[k + 2];
			img.data[i + 3] = Math.round(70 + t * 150);
		}
		ctx.putImageData(img, 0, 0);
	});

	// red = seen by (almost) everyone → yellow → green → blue = almost nobody
	const bandColor = (pct: number) => `hsla(${Math.round(220 - (pct / 100) * 220)}, 90%, 52%, 0.42)`;
	const marks = $derived(
		[75, 50, 25]
			.map((p) => {
				const i = reach.findIndex((v) => v < p);
				return i > 0 ? { p, y: (i / 20) * height } : null;
			})
			.filter(Boolean) as { p: number; y: number }[]
	);
</script>

<div bind:this={box} class="w-full">
	<div class="relative mx-auto overflow-hidden rounded-[18px] bg-white shadow-[0_0_0_1px_var(--color-line)]" style="width:{width * scale}px;height:{H * scale}px">
		<div class="absolute top-0 left-0 origin-top-left" style="width:{width}px;height:{H}px;transform:scale({scale})">
			<iframe {src} title="Page snapshot" sandbox="" scrolling="no" class="pointer-events-none absolute inset-0 border-0" style="width:{width}px;height:{H}px"></iframe>
			{#if mode === 'clicks'}
				<div class="absolute inset-0 bg-ink/25"></div>
				<canvas bind:this={canvas} class="absolute inset-0" style="width:{width}px;height:{H}px"></canvas>
				{#each rage as r (r.label)}
					<div class="absolute -translate-x-1/2 -translate-y-1/2" style="left:{r.x * width}px;top:{r.y}px">
						<span class="block size-16 animate-ping rounded-full border-4 border-[#ff3b30] opacity-60"></span>
						<span class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff3b30] px-3 py-1 text-[22px] font-semibold whitespace-nowrap text-white">Rage clicks · {r.count}</span>
					</div>
				{/each}
			{:else}
				{#each reach as pct, i (i)}
					<div class="absolute right-0 left-0" style="top:{(i / 20) * height}px;height:{height / 20}px;background:{bandColor(pct)}"></div>
				{/each}
				<div class="absolute right-0 left-0 border-t-4 border-dashed border-ink" style="top:{foldPx}px">
					<span class="absolute top-2 left-4 rounded-full bg-ink px-4 py-1.5 text-[22px] text-white">Average fold — 100% see above</span>
				</div>
				{#each marks as m (m.p)}
					<div class="absolute right-0 left-0 border-t-4 border-ink/70" style="top:{m.y}px">
						<span class="absolute top-2 right-4 rounded-full bg-white px-4 py-1.5 text-[24px] font-semibold text-ink shadow">{m.p}% scroll this far</span>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>
