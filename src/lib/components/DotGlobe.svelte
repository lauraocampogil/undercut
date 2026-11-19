<script lang="ts">
	// A slowly turning globe of dots — the businesses around you. A few light up in the accent colour: prospects.
	let { size = 560, points = 1100, hot = 16, cls = '', dark = false }: { size?: number; points?: number; hot?: number; cls?: string; dark?: boolean } = $props();
	let canvas: HTMLCanvasElement;

	$effect(() => {
		const ctx = canvas.getContext('2d')!;
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		const accent = getComputedStyle(canvas).getPropertyValue('--color-accent').trim() || '#0d0d0d';
		let W = 0;
		const resize = () => {
			W = canvas.clientWidth;
			canvas.width = W * dpr;
			canvas.height = W * dpr;
		};
		resize();
		// fibonacci sphere (deterministic)
		const pts = Array.from({ length: points }, (_, i) => {
			const y = 1 - (i / (points - 1)) * 2;
			const r = Math.sqrt(1 - y * y);
			const th = i * 2.399963;
			return { x: Math.cos(th) * r, y, z: Math.sin(th) * r, hot: false, ph: (i * 0.618) % 1 };
		});
		for (let k = 0; k < hot; k++) pts[Math.floor(((k * 7919) % points + points * 0.15) % points)].hot = true;

		let a = 0.6;
		let raf = 0;
		let visible = true;
		const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const tilt = -0.35;
		const draw = (t: number) => {
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, W, W);
			const R = W * 0.46;
			const c = W / 2;
			const scan = ((t / 4200) % 1) * 2.4 - 1.2; // a scanning band sweeps across
			const ca = Math.cos(a), sa = Math.sin(a), ct = Math.cos(tilt), st = Math.sin(tilt);
			for (const p of pts) {
				const x1 = p.x * ca + p.z * sa;
				const z1 = -p.x * sa + p.z * ca;
				const y2 = p.y * ct - z1 * st;
				const z2 = p.y * st + z1 * ct;
				const depth = (z2 + 1) / 2; // 0 back → 1 front
				const px = c + x1 * R;
				const py = c + y2 * R;
				if (p.hot && z2 > -0.1) {
					const pulse = (t / 1600 + p.ph) % 1;
					ctx.fillStyle = accent;
					ctx.globalAlpha = 0.25 * (1 - pulse) * depth;
					ctx.beginPath();
					ctx.arc(px, py, 3 + pulse * 14, 0, Math.PI * 2);
					ctx.fill();
					ctx.globalAlpha = 0.6 + depth * 0.4;
					ctx.beginPath();
					ctx.arc(px, py, 2.6 + depth * 1.6, 0, Math.PI * 2);
					ctx.fill();
				} else {
					const b = z2 > 0 ? Math.max(0, 1 - Math.abs(x1 - scan) / 0.09) : 0;
					ctx.fillStyle = dark ? '#ffffff' : '#0d0d0d';
					ctx.globalAlpha = 0.05 + depth * 0.34 + b * 0.5;
					ctx.beginPath();
					ctx.arc(px, py, 0.5 + depth * 1.2 + b * 1.1, 0, Math.PI * 2);
					ctx.fill();
				}
			}
			ctx.globalAlpha = 1;
		};
		const loop = (t: number) => {
			if (visible) {
				a += 0.0016;
				draw(t);
			}
			raf = requestAnimationFrame(loop);
		};
		if (still) draw(0);
		else raf = requestAnimationFrame(loop);
		const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
		io.observe(canvas);
		const ro = new ResizeObserver(() => (resize(), still && draw(0)));
		ro.observe(canvas);
		return () => (cancelAnimationFrame(raf), io.disconnect(), ro.disconnect());
	});
</script>

<canvas bind:this={canvas} class="aspect-square w-full {cls}" style="max-width:{size}px" aria-hidden="true"></canvas>
