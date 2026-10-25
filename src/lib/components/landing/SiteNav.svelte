<!--
  Playful navigation: a fixed bar that hides while scrolling down and comes back when
  scrolling up, a floating CTA that only shows while the bar is hidden (and the hero
  and final CTA are out of view), and a menu card with "sticker" links.
-->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { track } from '$lib/analytics';
	import { gsap } from '$lib/motion';
	import AppIcon from '../AppIcon.svelte';
	import Brand from '../Brand.svelte';
	import Mascot from '../Mascot.svelte';
	import Sparkle from '../Sparkle.svelte';

	let { loggedIn = false }: { loggedIn?: boolean } = $props();

	let open = $state(false);
	let ctaOut = $state(false); // hero and final CTA both out of view
	let navHidden = $state(false);
	let scrolled = $state(false);
	const floating = $derived(ctaOut && navHidden && !open);
	let card: HTMLElement | undefined = $state();
	let closeBtn: HTMLButtonElement | undefined = $state();
	let menuBtn: HTMLButtonElement | undefined = $state();

	const links = [
		{ href: '#how', label: 'How it works', tilt: -6, kind: 'icon' },
		{ href: '#pricing', label: 'Pricing', tilt: 5, kind: 'burst' },
		{ href: '#faq', label: 'FAQ', tilt: -4, kind: 'question' },
		{ href: '/login', label: 'Log in', tilt: 6, kind: 'mascot' }
	] as const;

	async function openMenu() {
		open = true;
		document.documentElement.style.overflow = 'hidden';
		await tick();
		closeBtn?.focus();
		if (!card || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		gsap.fromTo(card, { scale: 0.86, y: 30, autoAlpha: 0 }, { scale: 1, y: 0, autoAlpha: 1, duration: 0.55, ease: 'back.out(1.6)' });
		gsap.fromTo(
			card.querySelectorAll('[data-sticker]'),
			{ scale: 0, rotate: -30 },
			{ scale: 1, rotate: (i, el) => Number((el as HTMLElement).dataset.tilt ?? 0), duration: 0.6, ease: 'elastic.out(1, 0.55)', stagger: 0.07, delay: 0.12 }
		);
	}

	function closeMenu() {
		open = false;
		document.documentElement.style.overflow = '';
		menuBtn?.focus();
	}

	onMount(() => {
		const hero = document.getElementById('start');
		const final = document.getElementById('final-cta');
		const visible = new Set<Element>();
		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target);
				ctaOut = visible.size === 0;
			},
			{ threshold: 0.15 }
		);
		if (hero) io.observe(hero);
		if (final) io.observe(final);
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && open && closeMenu();
		window.addEventListener('keydown', onKey);

		// Hide the bar on scroll down, bring it back on scroll up.
		let last = window.scrollY;
		let frame = 0;
		const onScroll = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				const y = window.scrollY;
				scrolled = y > 12;
				if (y < 120) navHidden = false;
				else if (y > last + 6) navHidden = true;
				else if (y < last - 6) navHidden = false;
				last = y;
			});
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => {
			io.disconnect();
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('scroll', onScroll);
		};
	});
</script>

<div class="h-[88px]" aria-hidden="true"></div>
<div
	class="fixed inset-x-0 top-0 z-40 transition-[translate,background-color,box-shadow] duration-500 ease-[cubic-bezier(.2,.8,.2,1)] {navHidden ? '-translate-y-full' : 'translate-y-0'} {scrolled
		? 'bg-cream/90 shadow-[0_2px_0_var(--color-ink)] backdrop-blur-md'
		: 'bg-transparent'}"
>
<header class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
	<Brand />
	<div class="flex items-center gap-3">
		<a
			href="#start"
			class="hidden rounded-full bg-cream px-5 py-2.5 text-[15px] font-semibold shadow-[0_0_0_2px_var(--color-ink),4px_4px_0_var(--color-ink)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0_0_0_2px_var(--color-ink),2px_2px_0_var(--color-ink)] sm:inline-flex"
			onclick={() => track('cta_clicked', { placement: 'nav' })}>Analyze my store</a
		>
		<button
			bind:this={menuBtn}
			type="button"
			class="menu-btn grid size-12 place-items-center rounded-full bg-cream shadow-[0_0_0_2px_var(--color-ink),4px_4px_0_var(--color-ink)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0_0_0_2px_var(--color-ink),2px_2px_0_var(--color-ink)]"
			aria-label="Open menu"
			aria-expanded={open}
			aria-controls="site-menu"
			onclick={openMenu}
		>
			<svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true"><path d="M1 1h18M1 7h18M1 13h18" stroke="#111" stroke-width="2.2" stroke-linecap="round" /></svg>
		</button>
	</div>
</header>
</div>

<!-- Floating CTA: appears once the hero is out of view -->
<a
	href="#start"
	class="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-cream py-2 pr-5 pl-2 font-semibold shadow-[0_0_0_2px_var(--color-ink),5px_5px_0_var(--color-ink)] transition-all duration-500 ease-[cubic-bezier(.2,1.4,.4,1)] {floating
		? 'translate-y-0 opacity-100'
		: 'pointer-events-none translate-y-[160%] opacity-0'}"
	tabindex={floating ? 0 : -1}
	onclick={() => track('cta_clicked', { placement: 'floating' })}
>
	<AppIcon size={36} bg="tangerine" />
	Analyze my store →
</a>

{#if open}
	<div class="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4 backdrop-blur-sm" role="presentation" onclick={(e) => e.target === e.currentTarget && closeMenu()}>
		<div
			bind:this={card}
			id="site-menu"
			role="dialog"
			aria-modal="true"
			aria-label="Menu"
			tabindex="-1"
			class="menu-card relative w-full max-w-lg rounded-[36px] p-8 shadow-[0_0_0_2px_var(--color-ink),8px_8px_0_var(--color-ink)] sm:p-10"
		>
			<button
				bind:this={closeBtn}
				type="button"
				class="absolute -top-4 -right-4 grid size-12 place-items-center rounded-full bg-cream shadow-[0_0_0_2px_var(--color-ink),3px_3px_0_var(--color-ink)]"
				aria-label="Close menu"
				onclick={closeMenu}
			>
				<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2l12 12M14 2L2 14" stroke="#111" stroke-width="2.2" stroke-linecap="round" /></svg>
			</button>

			<nav aria-label="Main" class="grid grid-cols-2 gap-x-6 gap-y-8 py-2">
				{#each links as l (l.href)}
					<a
						href={l.kind === 'mascot' && loggedIn ? '/dashboard' : l.href}
						class="sticker group flex flex-col items-center gap-2"
						data-sticker
						data-tilt={l.tilt}
						style="transform: rotate({l.tilt}deg)"
						onclick={closeMenu}
					>
						<span class="grid h-24 place-items-center transition group-hover:-translate-y-1.5 group-hover:rotate-3">
							{#if l.kind === 'icon'}
								<AppIcon size={84} />
							{:else if l.kind === 'burst'}
								<svg width="92" height="92" viewBox="0 0 100 100" aria-hidden="true">
									<path d="M50 2l8 14 15-7 2 16 16 1-6 15 14 9-13 10 7 15-16 2-1 16-15-5-9 13-9-13-15 5-1-16-16-2 7-15L2 50l14-9-6-15 16-1 2-16 15 7z" fill="#FF6A3D" stroke="#111" stroke-width="3" stroke-linejoin="round" />
									<text x="50" y="62" text-anchor="middle" font-family="Bricolage Grotesque Variable, sans-serif" font-weight="800" font-size="34" fill="#111">€</text>
								</svg>
							{:else if l.kind === 'question'}
								<span class="relative grid size-20 place-items-center rounded-full bg-ink text-4xl font-extrabold text-cream">?<Sparkle size={22} twinkle class="absolute -top-1 -right-1" /></span>
							{:else}
								<Mascot mood="happy" size={92} />
							{/if}
						</span>
						<span class="rounded-full bg-ink px-4 py-1.5 text-sm font-bold text-cream shadow-[2px_2px_0_var(--color-tangerine)]">
							{l.kind === 'mascot' && loggedIn ? 'Dashboard' : l.label}
						</span>
					</a>
				{/each}
			</nav>

			<a href="#start" class="btn-accent mt-8 w-full text-lg" onclick={() => { closeMenu(); track('cta_clicked', { placement: 'menu' }); }}>
				Analyze my store →
			</a>
		</div>
	</div>
{/if}

<style>
	.menu-card {
		background-color: #fff8ea;
		background-image:
			linear-gradient(rgba(17, 17, 17, 0.06) 1px, transparent 1px),
			linear-gradient(90deg, rgba(17, 17, 17, 0.06) 1px, transparent 1px);
		background-size: 24px 24px;
	}
</style>
