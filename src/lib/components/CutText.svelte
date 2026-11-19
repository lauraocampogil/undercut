<script lang="ts">
	// Undercut's signature: text sliced on the diagonal like the logo, the lower half slid forward.
	// Cycles through `words` (the old word slices apart, the new one slices together) or shows `text`.
	// `scroll` drives the slide with the CSS variable --p (use with the scrub action on a parent).
	let { words = [], text = '', every = 2800, cls = '', shift = 0.08, scroll = false }: { words?: string[]; text?: string; every?: number; cls?: string; shift?: number; scroll?: boolean } = $props();
	let i = $state(0);
	let phase = $state<'in' | 'out'>('in');
	const list = $derived(words.length ? words : [text]);
	$effect(() => {
		if (list.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		let t2: ReturnType<typeof setTimeout>;
		const t = setInterval(() => {
			phase = 'out';
			t2 = setTimeout(() => {
				i = (i + 1) % list.length;
				phase = 'in';
			}, 420);
		}, every);
		return () => (clearInterval(t), clearTimeout(t2));
	});
	const word = $derived(list[i] ?? '');
</script>

<span class="cut {phase} {scroll ? 'cut-scroll' : ''} {cls}" style="--shift:{shift}em" aria-label={word}>
	<span class="cut-ghost" aria-hidden="true">{word}</span>
	<span class="cut-top" aria-hidden="true">{word}</span>
	<span class="cut-bot" aria-hidden="true">{word}</span>
</span>

<style>
	.cut {
		position: relative;
		display: inline-block;
		white-space: nowrap;
	}
	.cut-ghost {
		visibility: hidden;
	}
	.cut-top,
	.cut-bot {
		position: absolute;
		inset: 0;
		transition:
			transform 0.7s cubic-bezier(0.2, 0.75, 0.15, 1),
			opacity 0.45s ease;
	}
	/* same angle as the logo cut */
	.cut-top {
		clip-path: polygon(0 0, 100% 0, 100% 40%, 0 63%);
	}
	.cut-bot {
		clip-path: polygon(0 63%, 100% 40%, 100% 100%, 0 100%);
		transform: translateX(var(--shift));
	}
	.cut.out .cut-top {
		transform: translate(-0.35em, -0.08em);
		opacity: 0;
	}
	.cut.out .cut-bot {
		transform: translate(0.5em, 0.08em);
		opacity: 0;
	}
	.cut:hover .cut-bot {
		transform: translateX(calc(var(--shift) * 2.5));
	}
	.cut-scroll .cut-bot {
		transform: translateX(calc(var(--p, 0) * var(--shift) * 2.5));
		transition: none;
	}
	.cut-scroll .cut-top {
		transform: translateX(calc(var(--p, 0) * var(--shift) * -0.5));
		transition: none;
	}
	:global(.js) .cut.in .cut-top {
		animation: cut-in-top 0.8s cubic-bezier(0.2, 0.75, 0.15, 1) both;
	}
	:global(.js) .cut.in .cut-bot {
		animation: cut-in-bot 0.9s cubic-bezier(0.2, 0.75, 0.15, 1) both;
	}
	.cut-scroll.in .cut-top,
	.cut-scroll.in .cut-bot {
		animation: none !important;
	}
	@keyframes cut-in-top {
		from {
			transform: translate(-0.4em, -0.06em);
			opacity: 0;
		}
	}
	@keyframes cut-in-bot {
		from {
			transform: translate(0.6em, 0.06em);
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.cut-top,
		.cut-bot {
			animation: none !important;
			transition: none !important;
		}
	}
</style>
