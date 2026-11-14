// Tiny motion kit for the marketing pages — no dependencies.
// Everything respects prefers-reduced-motion (see .reveal / .split rules in layout.css).

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

let io: IntersectionObserver | null = null;
const callbacks = new WeakMap<Element, () => void>();
function observe(node: Element, cb: () => void) {
	io ??= new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				if (!e.isIntersecting) continue;
				callbacks.get(e.target)?.();
				io!.unobserve(e.target);
			}
		},
		{ rootMargin: '0px 0px -12% 0px', threshold: 0.01 }
	);
	callbacks.set(node, cb);
	io.observe(node);
	return () => io?.unobserve(node);
}

/** Fade/slide in when scrolled into view. Children with [data-stagger] get staggered delays. */
export function reveal(node: HTMLElement, opts: { delay?: number } = {}) {
	node.classList.add('reveal');
	if (opts.delay) node.style.setProperty('--d', `${opts.delay}ms`);
	node.querySelectorAll<HTMLElement>('[data-stagger]').forEach((c, i) => c.style.setProperty('--d', `${(opts.delay ?? 0) + i * 80}ms`));
	const off = observe(node, () => node.classList.add('in'));
	return { destroy: off };
}

/** Count a number up from 0 when it enters the viewport. */
export function countUp(node: HTMLElement, opts: { to: number; decimals?: number; prefix?: string; suffix?: string; ms?: number }) {
	const fmt = (v: number) => `${opts.prefix ?? ''}${v.toLocaleString('en', { minimumFractionDigits: opts.decimals ?? 0, maximumFractionDigits: opts.decimals ?? 0 })}${opts.suffix ?? ''}`;
	if (reduced()) {
		node.textContent = fmt(opts.to);
		return;
	}
	node.textContent = fmt(0);
	const off = observe(node, () => {
		const t0 = performance.now();
		const ms = opts.ms ?? 1400;
		const step = (t: number) => {
			const p = Math.min(1, (t - t0) / ms);
			node.textContent = fmt(opts.to * (1 - Math.pow(1 - p, 4)));
			if (p < 1) requestAnimationFrame(step);
		};
		requestAnimationFrame(step);
	});
	return { destroy: off };
}

/**
 * Scroll progress of an element through the viewport, written to the CSS variable --p (0 → 1).
 * start/end are viewport fractions (1 = bottom of the screen, 0 = top).
 */
export function scrub(node: HTMLElement, opts: { start?: number; end?: number; target?: 'self' | 'parent' } = {}) {
	if (reduced()) {
		node.style.setProperty('--p', '1');
		return;
	}
	const el = opts.target === 'parent' ? node.parentElement! : node;
	let raf = 0;
	const update = () => {
		raf = 0;
		const r = el.getBoundingClientRect();
		const vh = innerHeight;
		// p = 0 when the top reaches start·vh, p = 1 when the bottom reaches end·vh
		const s = (opts.start ?? 1) * vh;
		const e = (opts.end ?? 0) * vh - r.height;
		const p = (s - r.top) / (s - e || 1);
		node.style.setProperty('--p', Math.max(0, Math.min(1, p)).toFixed(4));
	};
	const onScroll = () => (raf ||= requestAnimationFrame(update));
	update();
	addEventListener('scroll', onScroll, { passive: true });
	addEventListener('resize', onScroll);
	return {
		destroy() {
			removeEventListener('scroll', onScroll);
			removeEventListener('resize', onScroll);
			cancelAnimationFrame(raf);
		}
	};
}

/** Follow the pointer: writes --mx / --my (-1 → 1) for subtle parallax. */
export function pointer(node: HTMLElement) {
	if (reduced() || matchMedia('(hover: none)').matches) return;
	const move = (e: PointerEvent) => {
		const r = node.getBoundingClientRect();
		node.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
		node.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
	};
	node.addEventListener('pointermove', move);
	return { destroy: () => node.removeEventListener('pointermove', move) };
}

/** Only adds .in when visible (for split headlines, bars, rings…). */
export function inview(node: HTMLElement, opts: { delay?: number } = {}) {
	if (opts.delay) node.style.setProperty('--d', `${opts.delay}ms`);
	if (reduced()) {
		node.classList.add('in');
		return;
	}
	const off = observe(node, () => node.classList.add('in'));
	return { destroy: off };
}
