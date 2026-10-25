<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import DemoBanner from '$lib/components/DemoBanner.svelte';
	import Mascot from '$lib/components/Mascot.svelte';
	import Sparkle from '$lib/components/Sparkle.svelte';
	import UnixLogo from '$lib/components/UnixLogo.svelte';
	import Marquee from '$lib/components/landing/Marquee.svelte';
	import Notification from '$lib/components/landing/Notification.svelte';
	import SiteNav from '$lib/components/landing/SiteNav.svelte';
	import UrlForm from '$lib/components/landing/UrlForm.svelte';
	import { track } from '$lib/analytics';
	import { magnetic, parallax, reveal, splitReveal } from '$lib/motion';

	let { data, form } = $props();

	const STEPS = ['Reading your catalog', 'Looking for similar stores', 'Checking which ones run on Shopify', 'Comparing catalogs and prices'];
	let loading = $state(false);
	let step = $state(0);
	let timer: ReturnType<typeof setInterval> | undefined;

	const onloading = (v: boolean) => {
		loading = v;
		clearInterval(timer);
		if (v) {
			step = 0;
			timer = setInterval(() => (step = Math.min(step + 1, STEPS.length - 1)), 6000);
		}
	};
	const errorFor = (id: string) => (form?.placement === id ? form.error : null);

	const pains = [
		{ big: '10 tabs', title: 'Every Monday, by hand', text: 'You open each competitor’s store and compare prices one product at a time. And you still miss things.' },
		{ big: 'Too late', title: 'You see their sale after it starts', text: 'By the time you notice their campaign, your customers have already bought from them.' },
		{ big: '$99+', title: 'Tools built for big brands', text: 'Most price trackers cost $99 a month or more and take weeks to set up.' }
	];
	const steps = [
		{ n: '1', bg: 'bg-ink text-cream', tilt: -2, title: 'Paste your URL', text: 'We read your categories, prices and country in about 30 seconds.' },
		{ n: '2', bg: 'bg-tangerine', tilt: 1.5, title: 'Confirm your rivals', text: 'We suggest the 5 most similar stores. Remove or add any of them.' },
		{ n: '3', bg: 'bg-lime', tilt: -1, title: 'Get notified', text: 'Sales, price drops and new products, on your phone and your computer.' }
	];
	const plans = [
		{ name: 'Free', price: '€0', per: false, features: ['1 competitor', 'Changes dashboard', 'Weekly summary'], cta: 'Start free', featured: false },
		{ name: 'Starter', price: '€19', per: true, features: ['5 competitors', 'Push alerts on phone and desktop', 'Full price history'], cta: 'Try free for 14 days', featured: true },
		{ name: 'Pro', price: '€39', per: true, features: ['15 competitors', 'Real-time alerts with your threshold', 'Checks every 6 hours'], cta: 'Go Pro', featured: false }
	];
	const faqs = [
		{ q: 'Do I need to install anything on my store?', a: 'No. All we need is the URL. We read public catalog data, the same any shopper sees.' },
		{ q: 'What if you get my competitors wrong?', a: 'Change them in one click: remove the wrong ones and add any store by pasting its URL.' },
		{ q: 'Does it work if my competitors aren’t on Shopify?', a: 'For now we track Shopify stores. WooCommerce and other platforms are coming.' },
		{ q: 'Can I cancel anytime?', a: 'Yes. No commitment: cancel from Settings and you’re done.' }
	];
	const changes = [
		{ tag: '−25%', bg: 'bg-tangerine', title: 'Vintage Foot: 37 products on sale', sub: 'Likely a campaign · 2 h ago' },
		{ tag: '+9%', bg: 'bg-cream', title: 'Kit Story raises 8 shirts', sub: 'An opportunity for you · yesterday' },
		{ tag: 'New', bg: 'bg-sand', title: 'Goal House launches 3 products', sub: 'New collection · yesterday' }
	];
	const section = 'py-[clamp(120px,13vw,200px)]';
</script>

<svelte:head>
	<title>Undercut · Know what your competitors do on Shopify</title>
	<meta name="description" content="Paste your Shopify store URL. See your 5 closest competitors in 30 seconds and get notified when they change prices, start a sale or launch products." />
	<meta property="og:title" content="Undercut · Know what your competitors do. Before anyone else." />
	<meta property="og:description" content="Competitor price and sale alerts for Shopify stores. Free to start." />
	<meta property="og:type" content="website" />
</svelte:head>

<DemoBanner demoMode={data.demoMode} hasSearch={data.hasSearch} />

<div class="overflow-x-clip">
	<SiteNav loggedIn={!!data.account} />

	<!-- Hero: fits in one screen -->
	<section id="start" class="mx-auto grid min-h-[calc(100svh-88px)] max-w-7xl grid-cols-1 items-center gap-12 px-4 pt-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:pb-20">
		<div class="flex min-w-0 flex-col gap-6">
			<h1 data-motion use:splitReveal={{ immediate: true, delay: 0.1 }} class="display text-[clamp(54px,min(7.6vw,12svh),136px)]">
				Know what your <span class="text-tangerine">competitors</span> do. Before anyone else.
			</h1>
			<p data-motion use:reveal={{ immediate: true, delay: 0.7, y: 20 }} class="max-w-xl text-lg leading-relaxed">
				Paste your store URL. In 30 seconds you’ll see your 5 closest competitors and how your prices compare. Then we ping you every time they move.
			</p>
			<div data-motion use:reveal={{ immediate: true, delay: 0.85, y: 20 }}>
				<UrlForm id="hero" value={form?.placement === 'hero' ? form.url : ''} error={errorFor('hero')} {onloading} />
			</div>
			{#if loading}
				<ol class="flex max-w-sm flex-col gap-3" aria-live="polite">
					{#each STEPS as s, i (s)}
						<li class="flex items-center gap-3 text-sm font-medium transition {i > step ? 'opacity-30' : ''}">
							{#if i < step}
								<span class="grid size-5 place-items-center rounded-full bg-ink text-[11px] text-cream">✓</span>
							{:else if i === step}
								<span class="size-5 animate-spin rounded-full border-2 border-ink border-t-transparent"></span>
							{:else}
								<span class="size-5 rounded-full border-2 border-line"></span>
							{/if}
							{s}…
						</li>
					{/each}
				</ol>
			{:else}
				<p data-motion use:reveal={{ immediate: true, delay: 1, y: 10 }} class="text-sm text-muted">Free · no credit card · nothing to install on your store</p>
			{/if}
		</div>

		<!-- Hero visual: the mascot peeks over this week's changes -->
		<div class="relative mx-auto w-full max-w-[460px]" aria-hidden="true">
			<Sparkle size={36} twinkle class="absolute top-6 -left-2 z-20" />
			<Sparkle size={20} color="#111111" twinkle delay={0.8} class="absolute top-0 right-6 z-20" />
			<Sparkle size={16} twinkle delay={1.6} class="absolute top-28 right-0 z-20" />
			<div class="relative flex flex-col items-center pt-2">
				<!-- the clip makes the mascot rise from behind the card edge -->
				<div class="relative z-10 -mb-[7px] h-[140px] overflow-hidden">
					<div data-motion use:reveal={{ immediate: true, delay: 1.1, y: 150 }}>
						<Mascot size={160} animated />
					</div>
				</div>
				<div data-motion use:reveal={{ immediate: true, delay: 0.35, y: 60, scale: 0.94 }} class="relative w-full rounded-[32px] bg-ink p-6 text-cream">
					<span class="text-[13px] tracking-[0.08em] text-stone uppercase">This week</span>
					<div data-motion use:reveal={{ immediate: true, delay: 0.7, y: 24, children: true, stagger: 0.12 }} class="mt-3.5 flex flex-col gap-3">
						{#each changes as row (row.title)}
							<div class="flex items-center gap-3.5 rounded-2xl bg-night p-3.5">
								<span class="grid h-11 w-[52px] shrink-0 place-items-center rounded-xl text-sm font-bold text-ink {row.bg}">{row.tag}</span>
								<div class="min-w-0"><p class="font-semibold">{row.title}</p><p class="text-[13px] text-stone">{row.sub}</p></div>
							</div>
						{/each}
					</div>
				</div>
			</div>
			<div data-motion use:reveal={{ immediate: true, delay: 1.5, y: 30, rotate: -8, scale: 0.8 }} class="absolute -right-3 -bottom-8 z-20">
				<div class="ping flex w-[280px] items-center gap-2.5 rounded-[20px] bg-card px-4 py-3 shadow-[0_0_0_2px_var(--color-ink),6px_6px_0_var(--color-ink)]">
					<AppIcon size={32} bg="tangerine" mood="shock" />
					<span class="text-sm leading-snug"><strong>Price drop!</strong> Classic Jerseys cuts 21 prices</span>
				</div>
			</div>
		</div>
	</section>

	<!-- Moving band -->
	<div class="relative z-10 -mb-8 -rotate-2 border-y-2 border-ink bg-tangerine py-3 text-ink">
		<Marquee items={['Price drops', 'New products', 'Sale campaigns', 'Sold out', 'Back in stock']} />
	</div>

	<!-- Problem -->
	<div class="bumps" style="--edge: var(--color-ink)"></div>
	<section class="bg-ink px-4 text-cream sm:px-6 {section}">
		<div class="mx-auto flex max-w-7xl flex-col gap-16">
			<div class="flex flex-col gap-5">
				<p data-motion use:reveal class="eyebrow text-stone">The problem</p>
				<h2 data-motion use:splitReveal class="display max-w-5xl text-[clamp(44px,6.4vw,96px)]">
					Watching competitors shouldn’t be <span class="text-tangerine">a second job.</span>
				</h2>
			</div>
			<div data-motion use:reveal={{ children: true, y: 60, stagger: 0.15 }} class="grid gap-5 md:grid-cols-3">
				{#each pains as p (p.title)}
					<div class="flex flex-col gap-3 rounded-[28px] bg-cream p-8 text-ink transition-[translate,rotate] duration-300 hover:-translate-y-2 hover:-rotate-1">
						<span class="display text-6xl text-tangerine">{p.big}</span>
						<h3 class="text-[22px] font-semibold">{p.title}</h3>
						<p class="leading-relaxed text-muted">{p.text}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>
	<div class="drips" style="--edge: var(--color-ink)"></div>

	<!-- How it works -->
	<section id="how" class="mx-auto flex max-w-7xl scroll-mt-6 flex-col gap-16 px-4 sm:px-6 {section}">
		<div class="flex flex-wrap items-end justify-between gap-6">
			<h2 data-motion use:splitReveal class="display text-[clamp(44px,6.4vw,96px)]">Ready in 3 steps.<br />Zero setup.</h2>
			<p data-motion use:reveal={{ delay: 0.2 }} class="max-w-sm text-lg leading-relaxed">No app to install, no store to connect: we read the public catalog, the same one any shopper sees.</p>
		</div>
		<div data-motion use:reveal={{ children: true, y: 70, rotate: 3, stagger: 0.15 }} class="grid gap-5 md:grid-cols-3">
			{#each steps as s (s.n)}
				<div class="flex flex-col gap-4 rounded-[28px] bg-card p-8 shadow-[0_0_0_2px_var(--color-ink),6px_6px_0_var(--color-ink)] transition-[translate,box-shadow] duration-300 hover:translate-x-1 hover:translate-y-1 hover:shadow-[0_0_0_2px_var(--color-ink),2px_2px_0_var(--color-ink)]" style="rotate:{s.tilt}deg">
					<span class="grid size-14 place-items-center rounded-full text-[22px] font-bold {s.bg}">{s.n}</span>
					<h3 class="text-2xl font-semibold">{s.title}</h3>
					<p class="leading-relaxed text-muted">{s.text}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- Notifications -->
	<div class="bumps" style="--edge: var(--color-tangerine)"></div>
	<section class="relative bg-tangerine px-4 sm:px-6 {section}">
		<Sparkle size={44} color="#111111" twinkle class="absolute top-24 right-[8%]" />
		<Sparkle size={24} color="#FFF1D6" twinkle delay={1.2} class="absolute bottom-28 left-[46%]" />
		<div class="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
			<div class="flex flex-col gap-7">
				<h2 data-motion use:splitReveal class="display text-[clamp(44px,6.4vw,96px)]">One ping.<br />Not another report.</h2>
				<p data-motion use:reveal class="max-w-lg text-lg leading-relaxed sm:text-[19px]">
					Undercut only reaches out when something deserves your attention. No three-page emails: one notification, one tap, and it’s all in your dashboard.
				</p>
				<ul data-motion use:reveal={{ children: true, y: 16, stagger: 0.1 }} class="flex flex-col gap-3 text-[17px] font-medium">
					{#each ['Sale campaigns the moment they start', 'Price drops on products like yours', 'You choose what pings you, and when'] as li (li)}
						<li class="flex items-center gap-3"><span class="grid size-6 place-items-center rounded-full bg-ink text-[13px] text-tangerine" aria-hidden="true">✓</span>{li}</li>
					{/each}
				</ul>
			</div>
			<div class="relative flex flex-col items-center gap-6" aria-hidden="true">
				<div data-motion use:reveal={{ y: 0, rotate: 6, scale: 0.7 }} class="w-full max-w-[420px]">
					<Notification class="float-a w-full" title="Vintage Foot put 37 products on sale" body="−25% on average. Tap to see which." />
				</div>
				<div data-motion use:reveal={{ y: 0, rotate: -6, scale: 0.7, delay: 0.25 }} class="w-full max-w-[380px] lg:ml-16">
					<Notification class="float-b w-full" mood="spy" when="Mon 9:00" title="Your week: 14 changes across 5 competitors" />
				</div>
				<div use:parallax={50} class="absolute -bottom-24 left-2 hidden lg:block"><Mascot mood="shock" size={120} color="ink" hole="#FF6A3D" animated /></div>
			</div>
		</div>
	</section>
	<div class="drips" style="--edge: var(--color-tangerine)"></div>

	<!-- Pricing -->
	<section id="pricing" class="mx-auto flex max-w-7xl scroll-mt-6 flex-col gap-16 px-4 sm:px-6 {section}">
		<h2 data-motion use:splitReveal class="display text-center text-[clamp(44px,6.4vw,96px)]">Pricing for<br />real stores.</h2>
		<div data-motion use:reveal={{ children: true, y: 80, stagger: 0.14 }} class="grid gap-5 md:grid-cols-3">
			{#each plans as p (p.name)}
				<div class="relative flex flex-col gap-5 rounded-[28px] p-9 transition-[translate] duration-300 hover:-translate-y-2 {p.featured ? 'bg-ink text-cream md:-translate-y-4 md:hover:-translate-y-6' : 'bg-card shadow-[inset_0_0_0_2px_var(--color-ink)]'}">
					{#if p.featured}
						<span class="absolute -top-3.5 right-7 flex items-center gap-1.5 rounded-full bg-tangerine px-3 py-1.5 text-[13px] font-bold text-ink"><Sparkle size={12} color="#111111" twinkle />Recommended</span>
					{/if}
					<h3 class="text-[22px] font-semibold">{p.name}</h3>
					<p><span class="display text-7xl">{p.price}</span>{#if p.per}<span class={p.featured ? 'text-stone' : 'text-muted'}> /month</span>{/if}</p>
					<ul class="flex list-disc flex-col gap-2 pl-5 leading-snug">{#each p.features as f (f)}<li>{f}</li>{/each}</ul>
					<a
						href="#start"
						onclick={() => track('cta_clicked', { placement: `pricing_${p.name.toLowerCase()}` })}
						class="mt-auto rounded-full py-3.5 text-center font-semibold transition {p.featured ? 'bg-tangerine font-bold text-ink hover:brightness-95' : 'shadow-[inset_0_0_0_2px_var(--color-ink)] hover:bg-ink hover:text-cream'}"
						>{p.cta}</a
					>
				</div>
			{/each}
		</div>
	</section>

	<!-- FAQ -->
	<section id="faq" class="mx-auto flex max-w-3xl scroll-mt-6 flex-col gap-8 px-4 pb-[clamp(120px,13vw,200px)] sm:px-6">
		<h2 data-motion use:splitReveal class="display text-[clamp(44px,5.4vw,80px)]">FAQ</h2>
		<div data-motion use:reveal={{ children: true, y: 20, stagger: 0.08 }} class="border-b-2 border-ink">
			{#each faqs as f, i (f.q)}
				<details class="group border-t-2 border-ink py-5" open={i === 0}>
					<summary class="flex cursor-pointer list-none items-center justify-between gap-4 text-xl font-semibold transition-colors hover:text-tangerine">
						{f.q}<span class="text-2xl transition duration-300 group-open:rotate-45" aria-hidden="true">+</span>
					</summary>
					<p class="mt-3 leading-relaxed text-muted">{f.a}</p>
				</details>
			{/each}
		</div>
	</section>

	<!-- Final CTA + footer -->
	<div class="bumps" style="--edge: var(--color-ink)"></div>
	<section id="final-cta" class="relative bg-ink px-4 pt-[clamp(120px,13vw,200px)] pb-14 text-cream sm:px-6">
		<Sparkle size={40} twinkle class="absolute top-24 left-[10%]" />
		<Sparkle size={22} color="#C8F25A" twinkle delay={1} class="absolute top-40 right-[12%]" />
		<div class="mx-auto flex max-w-7xl flex-col items-center gap-10 text-center">
			<h2 data-motion use:splitReveal class="display text-[clamp(44px,8vw,136px)]">Who should we<br /><span class="text-tangerine">watch for you?</span></h2>
			<div class="flex w-full max-w-xl flex-col items-center">
				<div class="relative z-10 -mb-[7px] h-[126px] overflow-hidden">
					<div data-motion use:reveal={{ y: 140, delay: 0.3 }}><Mascot mood="happy" size={150} hole="#111111" animated /></div>
				</div>
				<div class="w-full" use:magnetic={0.08}>
					<UrlForm id="final" dark value={form?.placement === 'final' ? form.url : ''} error={errorFor('final')} />
				</div>
			</div>
			<footer class="mt-24 flex w-full flex-wrap items-center justify-between gap-6 border-t border-white/15 pt-8 text-sm text-stone">
				<span class="wordmark text-[22px] text-cream">undercut</span>
				<nav aria-label="Footer" class="flex gap-5">
					<a href="/privacy" class="hover:text-cream">Privacy</a>
					<a href="/terms" class="hover:text-cream">Terms</a>
					<a href="mailto:hello@undercut.app" class="hover:text-cream">Contact</a>
				</nav>
				<a href="https://unixcreativestudio.com" target="_blank" rel="noopener" class="flex items-center gap-2.5 hover:text-cream" aria-label="Made by Unix Studio">
					<span>Made by</span>
					<UnixLogo size={24} />
				</a>
			</footer>
		</div>
	</section>
</div>

<style>
	@media (prefers-reduced-motion: no-preference) {
		.ping {
			animation: ping 3.6s ease-in-out 2.4s infinite;
		}
		:global(.float-a) {
			animation: float 5s ease-in-out infinite;
		}
		:global(.float-b) {
			animation: float 5s ease-in-out 1.2s infinite;
		}
	}
	@keyframes ping {
		0%, 82%, 100% { transform: rotate(0); }
		86% { transform: rotate(-4deg) scale(1.04); }
		90% { transform: rotate(3deg) scale(1.04); }
		94% { transform: rotate(-2deg); }
	}
	@keyframes float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-10px); }
	}
</style>
