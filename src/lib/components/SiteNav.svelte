<script lang="ts">
	// Public header. At the top: full width. After scrolling: it turns into a floating white pill.
	// A dark pill slides under the link of the section in view; links get an underline on hover.
	import Logo from '#lib/components/Logo.svelte';
	import { SITE, LANGS, type Lang } from '#lib/site-i18n.ts';
	let { signedIn = false, lang = 'en' as Lang, cta = '/app/analyses', ctaLabel = '' }: { signedIn?: boolean; lang?: Lang; cta?: string; ctaLabel?: string } = $props();
	const t = $derived(SITE[lang].nav);
	const links = $derived([
		['top', t.top],
		['how', t.how],
		['founders', t.founders],
		['pricing', t.pricing]
	]);

	let scrolled = $state(false);
	let active = $state('');
	let menu = $state(false);
	let langOpen = $state(false);
	const LANG_NAMES: Record<Lang, string> = { en: 'English', fr: 'Français', es: 'Español' };
	let linkEls: Record<string, HTMLAnchorElement> = $state({});
	// pill position under the active link (kept apart from what the effect reads, so it cannot loop)
	let pillX = $state(0);
	let pillW = $state(0);
	let pillShow = $state(false);

	$effect(() => {
		const onScroll = () => {
			scrolled = scrollY > 24;
			let cur = '';
			for (const [id] of links) {
				const el = document.getElementById(id);
				if (el && el.getBoundingClientRect().top < innerHeight * 0.4) cur = id;
			}
			active = cur;
		};
		onScroll();
		addEventListener('scroll', onScroll, { passive: true });
		return () => removeEventListener('scroll', onScroll);
	});
	// move the pill under the active link
	$effect(() => {
		const el = active ? linkEls[active] : null;
		if (el) {
			pillX = el.offsetLeft;
			pillW = el.offsetWidth;
			pillShow = true;
		} else pillShow = false;
	});
	$effect(() => {
		if (!langOpen) return;
		const close = (e: PointerEvent) => {
			if (!(e.target as HTMLElement).closest('[aria-haspopup="listbox"], .lang-pop')) langOpen = false;
		};
		addEventListener('pointerdown', close);
		return () => removeEventListener('pointerdown', close);
	});
</script>

<div class="nav-in sticky top-0 z-50 px-3 pt-3 sm:px-5">
	<nav class="mx-auto flex items-center justify-between gap-4 transition-all duration-500 ease-[cubic-bezier(.2,.75,.15,1)] {scrolled ? 'max-w-[980px] rounded-full border border-line bg-white py-2 pr-2 pl-5' : 'max-w-[1200px] border border-transparent px-2 py-3 sm:px-3'}">
		<a href="/" aria-label="Undercut" class="shrink-0 transition-transform duration-500 {scrolled ? 'scale-90' : ''}"><Logo /></a>

		<div class="relative hidden items-center lg:flex">
			<span class="absolute inset-y-0 rounded-full bg-ink transition-all duration-500 ease-[cubic-bezier(.2,.75,.15,1)] {pillShow ? 'opacity-100' : 'opacity-0'}" style="left:{pillX}px; width:{pillW}px" aria-hidden="true"></span>
			{#each links as [id, label]}
				<a bind:this={linkEls[id]} href="/#{id}" class="navlink relative px-4 py-2 text-sm transition-colors duration-300 {active === id ? 'text-white' : 'text-ink-2 hover:text-ink'}">{label}</a>
			{/each}
		</div>

		<div class="flex items-center gap-2 text-sm">
			<div class="relative hidden sm:block">
				<button class="flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs uppercase transition-colors hover:border-black/25" aria-haspopup="listbox" aria-expanded={langOpen} onclick={() => (langOpen = !langOpen)}>
					{lang}
					<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="transition-transform duration-300 {langOpen ? 'rotate-180' : ''}"><path d="m6 9 6 6 6-6" /></svg>
				</button>
				{#if langOpen}
					<div class="lang-pop absolute top-full right-0 z-10 mt-2 w-40 rounded-2xl border border-line bg-white p-1.5" role="listbox">
						{#each LANGS as l}
							<a href="?lang={l}" hreflang={l} role="option" aria-selected={l === lang} class="flex items-center justify-between rounded-xl px-3 py-2 text-sm {l === lang ? 'bg-[#f4f4f2] font-medium' : 'text-ink-2 hover:bg-[#fafaf8]'}">{LANG_NAMES[l]}<span class="text-xs text-muted uppercase">{l}</span></a>
						{/each}
					</div>
				{/if}
			</div>
			{#if signedIn}<a href="/app/analyses" class="btn btn-primary">{t.openApp}</a>{:else}<a href="/login" class="btn btn-ghost hidden md:inline-flex">{t.login}</a><a href={cta} class="btn btn-primary">{ctaLabel || t.add}</a>{/if}
			<button class="grid size-10 place-items-center rounded-full border border-line lg:hidden" aria-label="Menu" aria-expanded={menu} onclick={() => (menu = !menu)}>
				<span class="relative block h-3 w-4">
					<span class="absolute left-0 h-px w-4 bg-ink transition-all duration-300 {menu ? 'top-1.5 rotate-45' : 'top-0'}"></span>
					<span class="absolute top-1.5 left-0 h-px w-4 bg-ink transition-opacity duration-300 {menu ? 'opacity-0' : ''}"></span>
					<span class="absolute left-0 h-px w-4 bg-ink transition-all duration-300 {menu ? 'top-1.5 -rotate-45' : 'top-3'}"></span>
				</span>
			</button>
		</div>
	</nav>

	{#if menu}
		<div class="mx-auto mt-2 max-w-[980px] rounded-3xl border border-line bg-white p-3 lg:hidden">
			{#each links as [id, label], i}
				<a href="/#{id}" onclick={() => (menu = false)} class="menu-item block rounded-2xl px-4 py-3 text-lg hover:bg-[#fafaf8]" style="--d:{i * 60}ms">{label}</a>
			{/each}
			<div class="mt-2 flex items-center gap-1 px-4 pb-2 text-xs">
				{#each LANGS as l}<a href="?lang={l}" class="rounded-full px-2.5 py-1 uppercase {l === lang ? 'bg-ink text-white' : 'border border-line text-muted'}">{l}</a>{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	/* header slides down once on load */
	.nav-in {
		animation: nav-in 0.8s cubic-bezier(0.2, 0.75, 0.15, 1) both;
	}
	@keyframes nav-in {
		from {
			opacity: 0;
			transform: translateY(-16px);
		}
	}
	/* underline that grows from the left on hover (not on the active, filled link) */
	.navlink::after {
		content: '';
		position: absolute;
		left: 1rem;
		right: 1rem;
		bottom: 0.35rem;
		height: 1px;
		background: currentColor;
		transform: scaleX(0);
		transform-origin: left;
		transition: transform 0.35s cubic-bezier(0.2, 0.75, 0.15, 1);
	}
	.navlink:not(.text-white):hover::after {
		transform: scaleX(1);
	}
	/* mobile menu items arrive one after another */
	.menu-item {
		animation: menu-in 0.45s cubic-bezier(0.2, 0.75, 0.15, 1) var(--d) both;
	}
	@keyframes menu-in {
		from {
			opacity: 0;
			transform: translateY(-6px);
		}
	}
	.lang-pop {
		animation: menu-in 0.3s cubic-bezier(0.2, 0.75, 0.15, 1) both;
	}
	@media (prefers-reduced-motion: reduce) {
		.lang-pop,
		.nav-in,
		.menu-item {
			animation: none;
		}
	}
</style>
