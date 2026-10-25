/**
 * Motion helpers (GSAP + ScrollTrigger + SplitText) exposed as Svelte actions.
 * Everything respects prefers-reduced-motion and leaves content visible if JS fails.
 */
import { browser } from '$app/environment';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

if (browser) {
	gsap.registerPlugin(ScrollTrigger, SplitText);
	// Layout shifts once fonts and images arrive: recompute every trigger position.
	const refresh = () => ScrollTrigger.refresh();
	document.fonts?.ready.then(refresh);
	window.addEventListener('load', refresh, { once: true });
}

const reduced = () => browser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Marks an element as handled so the pre-hydration CSS stops hiding it. */
const show = (node: HTMLElement) => node.setAttribute('data-ready', '');

interface SplitOptions {
	/** Seconds before starting. */
	delay?: number;
	/** Seconds between letters. */
	stagger?: number;
	/** Play on load instead of when scrolled into view. */
	immediate?: boolean;
}

/**
 * Letter-by-letter reveal for headlines: each character rises out of a line mask.
 * Usage: <h2 use:splitReveal>…</h2>
 */
export function splitReveal(node: HTMLElement, opts: SplitOptions = {}) {
	if (reduced()) {
		show(node);
		return {};
	}
	let split: SplitText | null = null;
	let tween: gsap.core.Tween | null = null;

	const run = () => {
		split = SplitText.create(node, { type: 'lines,words,chars', mask: 'lines', linesClass: 'split-line' });
		show(node);
		tween = gsap.from(split.chars, {
			yPercent: 115,
			rotate: 6,
			duration: 0.9,
			ease: 'expo.out',
			stagger: opts.stagger ?? 0.022,
			delay: opts.delay ?? 0,
			scrollTrigger: opts.immediate ? undefined : { trigger: node, start: 'top 88%', toggleActions: 'play none none none' }
		});
	};

	// Wait for the brand fonts so lines are measured with the right glyph widths.
	if (document.fonts?.status === 'loaded') run();
	else document.fonts.ready.then(run);

	return {
		destroy() {
			tween?.scrollTrigger?.kill();
			tween?.kill();
			split?.revert();
		}
	};
}

interface RevealOptions {
	y?: number;
	delay?: number;
	/** Animate direct children one after another instead of the node itself. */
	children?: boolean;
	stagger?: number;
	immediate?: boolean;
	scale?: number;
	rotate?: number;
}

/** Fade-and-rise when scrolled into view. */
export function reveal(node: HTMLElement, opts: RevealOptions = {}) {
	if (reduced()) {
		show(node);
		return {};
	}
	const targets = opts.children ? Array.from(node.children) : node;
	show(node);
	const tween = gsap.from(targets, {
		y: opts.y ?? 40,
		scale: opts.scale ?? 1,
		rotate: opts.rotate ?? 0,
		autoAlpha: 0,
		duration: 0.9,
		ease: 'power3.out',
		delay: opts.delay ?? 0,
		stagger: opts.stagger ?? 0.12,
		// Trigger on the untransformed parent: a node moved down by `y` could sit below
		// the last scroll position and never fire.
		scrollTrigger: opts.immediate
			? undefined
			: { trigger: opts.children ? node : (node.parentElement ?? node), start: 'top 85%', toggleActions: 'play none none none' }
	});
	return {
		destroy() {
			tween.scrollTrigger?.kill();
			tween.kill();
		}
	};
}

/** Subtle parallax: moves the node while the page scrolls. */
export function parallax(node: HTMLElement, amount = 60) {
	if (reduced()) return {};
	const tween = gsap.to(node, {
		y: -amount,
		ease: 'none',
		scrollTrigger: { trigger: node, start: 'top bottom', end: 'bottom top', scrub: true }
	});
	return {
		destroy() {
			tween.scrollTrigger?.kill();
			tween.kill();
		}
	};
}

/** Magnetic hover for buttons: the element leans toward the pointer. */
export function magnetic(node: HTMLElement, strength = 0.25) {
	if (reduced() || !window.matchMedia('(pointer: fine)').matches) return {};
	const xTo = gsap.quickTo(node, 'x', { duration: 0.4, ease: 'power3.out' });
	const yTo = gsap.quickTo(node, 'y', { duration: 0.4, ease: 'power3.out' });
	const move = (e: PointerEvent) => {
		const r = node.getBoundingClientRect();
		xTo((e.clientX - (r.left + r.width / 2)) * strength);
		yTo((e.clientY - (r.top + r.height / 2)) * strength);
	};
	const leave = () => {
		xTo(0);
		yTo(0);
	};
	node.addEventListener('pointermove', move);
	node.addEventListener('pointerleave', leave);
	return {
		destroy() {
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerleave', leave);
		}
	};
}

export { gsap, ScrollTrigger };
