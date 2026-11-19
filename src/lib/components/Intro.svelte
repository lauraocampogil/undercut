<script lang="ts">
	// Short intro, once per visit: a counter runs to 100, the wordmark resolves, the curtain lifts.
	let show = $state(false);
	let n = $state(0);
	let leaving = $state(false);
	$effect(() => {
		try {
			if (sessionStorage.getItem('uc-intro') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
			sessionStorage.setItem('uc-intro', '1');
		} catch {
			return;
		}
		show = true;
		const t0 = performance.now();
		let raf = 0;
		const step = (t: number) => {
			const p = Math.min(1, (t - t0) / 1100);
			n = Math.round(100 * (1 - Math.pow(1 - p, 3)));
			if (p < 1) raf = requestAnimationFrame(step);
			else {
				setTimeout(() => (leaving = true), 180);
				setTimeout(() => (show = false), 1100);
			}
		};
		raf = requestAnimationFrame(step);
		return () => cancelAnimationFrame(raf);
	});
</script>

{#if show}
	<div class="fixed inset-0 z-[90] flex flex-col justify-between bg-paper p-5 transition-transform duration-[900ms] ease-[cubic-bezier(.7,0,.2,1)] sm:p-8 {leaving ? '-translate-y-full' : ''}" aria-hidden="true">
		<div class="flex justify-between font-mono text-[11px] tracking-wide text-muted uppercase"><span>Undercut · Brussels</span><span>Loading dashboard</span></div>
		<div class="flex items-end justify-between gap-6">
			<p class="text-[22vw] leading-[0.8] font-medium tracking-[-0.07em] sm:text-[16vw]">undercut</p>
			<p class="font-mono text-[11vw] leading-none tabular-nums sm:text-[6vw]">{String(n).padStart(3, '0')}</p>
		</div>
		<div class="h-px w-full bg-black/10"><div class="h-px bg-ink" style="width:{n}%"></div></div>
	</div>
{/if}
