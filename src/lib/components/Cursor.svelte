<script lang="ts">
	// A precise little cursor: a dot and a ring that lags behind and grows over anything clickable. Desktop only.
	let on = $state(false);
	let dot: HTMLDivElement;
	let ring: HTMLDivElement;
	$effect(() => {
		if (matchMedia('(hover: none), (prefers-reduced-motion: reduce)').matches) return;
		on = true;
		let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, raf = 0;
		const move = (e: PointerEvent) => {
			x = e.clientX;
			y = e.clientY;
			const hot = (e.target as HTMLElement).closest('a,button,input,label,summary,[role=button]');
			ring.classList.toggle('hot', Boolean(hot));
		};
		const loop = () => {
			rx += (x - rx) * 0.18;
			ry += (y - ry) * 0.18;
			dot.style.transform = `translate(${x}px, ${y}px)`;
			ring.style.transform = `translate(${rx}px, ${ry}px)`;
			raf = requestAnimationFrame(loop);
		};
		addEventListener('pointermove', move);
		raf = requestAnimationFrame(loop);
		document.documentElement.classList.add('has-cursor');
		return () => (removeEventListener('pointermove', move), cancelAnimationFrame(raf), document.documentElement.classList.remove('has-cursor'));
	});
</script>

<div class="pointer-events-none fixed top-0 left-0 z-[100] {on ? '' : 'hidden'}" aria-hidden="true">
	<div bind:this={dot} class="absolute -mt-[3px] -ml-[3px] size-[6px] rounded-full bg-ink mix-blend-difference invert"></div>
	<div bind:this={ring} class="cursor-ring absolute -mt-4 -ml-4 size-8 rounded-full border border-ink/40"></div>
</div>

<style>
	.cursor-ring {
		transition:
			width 0.25s,
			height 0.25s,
			margin 0.25s,
			background 0.25s;
	}
	:global(.cursor-ring.hot) {
		width: 56px;
		height: 56px;
		margin: -28px 0 0 -28px;
		background: rgb(255 255 255 / 0.25);
		backdrop-filter: blur(2px) invert(0.05);
		border-color: rgb(13 13 13 / 0.6);
	}
</style>
