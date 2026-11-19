<script lang="ts">
	// A word that decodes into the next one, letter by letter (mono, like a terminal).
	let { words, every = 2600, cls = '' }: { words: string[]; every?: number; cls?: string } = $props();
	let text = $state('');
	$effect.pre(() => {
		if (!text) text = words[0];
	});
	const glyphs = '▚▞▙▟░▒#*+=/<>01';
	$effect(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		let i = 0;
		let raf = 0;
		const t = setInterval(() => {
			i = (i + 1) % words.length;
			const target = words[i];
			const from = text;
			const len = Math.max(from.length, target.length);
			const start = performance.now();
			const step = (now: number) => {
				const p = Math.min(1, (now - start) / 700);
				let out = '';
				for (let k = 0; k < len; k++) {
					const done = k / len < p;
					out += done ? (target[k] ?? '') : k < Math.max(target.length, from.length * (1 - p)) ? glyphs[Math.floor(Math.random() * glyphs.length)] : '';
				}
				text = out;
				if (p < 1) raf = requestAnimationFrame(step);
				else text = target;
			};
			raf = requestAnimationFrame(step);
		}, every);
		return () => (clearInterval(t), cancelAnimationFrame(raf));
	});
</script>

<span class={cls} aria-live="off">{text}</span>
