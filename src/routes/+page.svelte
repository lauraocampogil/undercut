<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import Brand from '$lib/components/Brand.svelte';
	import DemoBanner from '$lib/components/DemoBanner.svelte';
	import Mascot from '$lib/components/Mascot.svelte';
	import Sparkle from '$lib/components/Sparkle.svelte';
	import Notification from '$lib/components/landing/Notification.svelte';
	import UrlForm from '$lib/components/landing/UrlForm.svelte';
	import { track } from '$lib/analytics';

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
		{ big: '10', title: 'tabs open every Monday', text: 'You check their sites by hand, product by product, and still miss changes.' },
		{ big: 'Oops', title: 'sales you spot too late', text: 'By the time you see their campaign, your customers have already bought there.' },
		{ big: '$99', title: 'a month, at least', text: 'Price tools are built for big brands. You just want to know what changed.' }
	];
	const steps = [
		{ n: '1', bg: 'bg-ink text-cream', title: 'Paste your URL', text: 'We analyze your categories, prices and country in about 30 seconds.' },
		{ n: '2', bg: 'bg-tangerine', title: 'Confirm your rivals', text: 'We suggest the 5 most similar stores. Remove or add any of them.' },
		{ n: '3', bg: 'bg-lime', title: 'Get notified', text: 'Sales, price drops and new products, on your phone and your computer.' }
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
	<!-- Header -->
	<header class="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-5 sm:px-6">
		<Brand />
		<nav aria-label="Main" class="order-3 flex w-full gap-6 text-[15px] font-medium sm:order-none sm:ml-auto sm:w-auto">
			<a href="#how" class="hover:text-tangerine">How it works</a>
			<a href="#pricing" class="hover:text-tangerine">Pricing</a>
			<a href="#faq" class="hover:text-tangerine">FAQ</a>
			<a href={data.account ? '/dashboard' : '/login'} class="hover:text-tangerine">{data.account ? 'Dashboard' : 'Log in'}</a>
		</nav>
		<a href="#start" class="btn ml-auto sm:ml-0" onclick={() => track('cta_clicked', { placement: 'header' })}>Analyze my store</a>
	</header>

	<!-- Hero -->
	<section id="start" class="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 pt-10 pb-24 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:pt-14">
		<div class="flex min-w-0 flex-col gap-7">
			<span class="self-start rounded-full bg-lime px-3.5 py-2 text-sm font-semibold">For Shopify stores · free beta</span>
			<h1 class="display text-[clamp(44px,8vw,120px)] [overflow-wrap:anywhere]">
				Know what your <span class="text-tangerine">competitors</span> do. Before anyone else.
			</h1>
			<p class="max-w-xl text-lg leading-relaxed sm:text-xl">
				Paste your store URL. In 30 seconds you’ll see your 5 closest competitors and how your prices compare. Then we ping you every time they make a move.
			</p>
			<UrlForm id="hero" value={form?.placement === 'hero' ? form.url : ''} error={errorFor('hero')} {onloading} />
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
				<p class="text-sm text-muted">Free · no credit card · nothing to install on your store</p>
			{/if}
		</div>

		<!-- Hero visual: the mascot peeking over this week's changes -->
		<div class="relative mx-auto w-full max-w-[480px] pt-[150px]" aria-hidden="true">
			<Sparkle size={34} class="absolute top-16 left-0" />
			<Sparkle size={22} color="#111111" class="absolute top-10 right-5" />
			<div class="absolute top-0 left-1/2 z-10 -translate-x-1/2"><Mascot size={180} /></div>
			<div class="relative flex flex-col gap-3.5 rounded-[32px] bg-ink p-6 text-cream sm:p-7">
				<span class="text-[13px] tracking-[0.08em] text-stone uppercase">This week</span>
				{#each [
					{ tag: '−25%', bg: 'bg-tangerine', title: 'Vintage Foot: 37 products on sale', sub: 'Likely a campaign · 2 h ago' },
					{ tag: '+9%', bg: 'bg-lime', title: 'Kit Story raises 8 shirts', sub: 'An opportunity for you · yesterday' },
					{ tag: 'New', bg: 'bg-cream', title: 'Goal House launches 3 products', sub: 'New collection · yesterday' }
				] as row (row.title)}
					<div class="flex items-center gap-3.5 rounded-2xl bg-night p-3.5">
						<span class="grid h-11 w-[52px] shrink-0 place-items-center rounded-xl text-sm font-bold text-ink {row.bg}">{row.tag}</span>
						<div class="min-w-0"><p class="font-semibold">{row.title}</p><p class="text-[13px] text-stone">{row.sub}</p></div>
					</div>
				{/each}
			</div>
			<div class="absolute -right-2 -bottom-9 z-20 flex w-[290px] items-center gap-2.5 rounded-[20px] bg-card px-4 py-3 shadow-[0_0_0_2px_var(--color-ink),6px_6px_0_var(--color-ink)]">
				<AppIcon size={32} bg="tangerine" mood="shock" />
				<span class="text-sm leading-snug"><strong>Price drop!</strong> Classic Jerseys cuts 21 prices</span>
			</div>
		</div>
	</section>

	<!-- Problem -->
	<div class="bumps" style="--edge: var(--color-ink)"></div>
	<section class="bg-ink px-4 pt-16 pb-24 text-cream sm:px-6">
		<div class="mx-auto flex max-w-7xl flex-col gap-12">
			<h2 class="display max-w-4xl text-[clamp(44px,6vw,88px)]">Your competitors move. <span class="text-tangerine">You find out too late.</span></h2>
			<div class="grid gap-5 md:grid-cols-3">
				{#each pains as p (p.title)}
					<div class="flex flex-col gap-3 rounded-[28px] bg-cream p-8 text-ink">
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
	<section id="how" class="mx-auto flex max-w-7xl scroll-mt-6 flex-col gap-12 px-4 py-28 sm:px-6">
		<div class="flex flex-wrap items-end justify-between gap-6">
			<h2 class="display text-[clamp(44px,6vw,88px)]">Ready in 3 steps.<br />Zero setup.</h2>
			<p class="max-w-sm text-lg leading-relaxed">No app to install, no store to connect: we read the public catalog, the same one any shopper sees.</p>
		</div>
		<div class="grid gap-5 md:grid-cols-3">
			{#each steps as s (s.n)}
				<div class="flex flex-col gap-4 rounded-[28px] bg-card p-8 shadow-[inset_0_0_0_2px_var(--color-ink)]">
					<span class="grid size-14 place-items-center rounded-full text-[22px] font-bold {s.bg}">{s.n}</span>
					<h3 class="text-2xl font-semibold">{s.title}</h3>
					<p class="leading-relaxed text-muted">{s.text}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- Notifications -->
	<div class="bumps" style="--edge: var(--color-tangerine)"></div>
	<section class="bg-tangerine px-4 pt-20 pb-28 sm:px-6">
		<div class="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 lg:grid-cols-2">
			<div class="flex flex-col gap-6">
				<h2 class="display text-[clamp(44px,6vw,88px)]">One ping.<br />Not another report.</h2>
				<p class="max-w-lg text-lg leading-relaxed sm:text-[19px]">
					Undercut only reaches out when something deserves your attention. No three-page emails: one notification, one tap, and it’s all in your dashboard.
				</p>
				<ul class="flex flex-col gap-3 text-[17px] font-medium">
					{#each ['Sale campaigns the moment they start', 'Price drops on products like yours', 'You choose what pings you, and when'] as li (li)}
						<li class="flex items-center gap-3"><span class="grid size-6 place-items-center rounded-full bg-ink text-[13px] text-tangerine" aria-hidden="true">✓</span>{li}</li>
					{/each}
				</ul>
			</div>
			<div class="flex flex-col items-center gap-5" aria-hidden="true">
				<Notification class="w-full max-w-[420px]" title="Vintage Foot put 37 products on sale" body="−25% on average. Tap to see which." />
				<Notification class="w-full max-w-[380px] opacity-95" mood="spy" when="Mon 9:00" title="Your week: 14 changes across 5 competitors" />
			</div>
		</div>
	</section>
	<div class="drips" style="--edge: var(--color-tangerine)"></div>

	<!-- Pricing -->
	<section id="pricing" class="mx-auto flex max-w-7xl scroll-mt-6 flex-col gap-12 px-4 py-28 sm:px-6">
		<h2 class="display text-center text-[clamp(44px,6vw,88px)]">Pricing for<br />real stores.</h2>
		<div class="grid gap-5 md:grid-cols-3">
			{#each plans as p (p.name)}
				<div class="relative flex flex-col gap-5 rounded-[28px] p-9 {p.featured ? 'bg-ink text-cream' : 'bg-card shadow-[inset_0_0_0_2px_var(--color-ink)]'}">
					{#if p.featured}<span class="absolute -top-3.5 right-7 rounded-full bg-lime px-3 py-1.5 text-[13px] font-bold text-ink">Recommended</span>{/if}
					<h3 class="text-[22px] font-semibold">{p.name}</h3>
					<p><span class="display text-7xl">{p.price}</span>{#if p.per}<span class={p.featured ? 'text-stone' : 'text-muted'}> /month</span>{/if}</p>
					<ul class="flex list-disc flex-col gap-2 pl-5 leading-snug">{#each p.features as f (f)}<li>{f}</li>{/each}</ul>
					<a
						href="#start"
						onclick={() => track('cta_clicked', { placement: `pricing_${p.name.toLowerCase()}` })}
						class="mt-auto rounded-full py-3.5 text-center font-semibold {p.featured ? 'bg-tangerine font-bold text-ink' : 'shadow-[inset_0_0_0_2px_var(--color-ink)] hover:bg-white'}"
						>{p.cta}</a
					>
				</div>
			{/each}
		</div>
	</section>

	<!-- FAQ -->
	<section id="faq" class="mx-auto flex max-w-3xl scroll-mt-6 flex-col gap-6 px-4 pb-28 sm:px-6">
		<h2 class="display text-[clamp(40px,5vw,72px)]">FAQ</h2>
		<div class="border-b-2 border-ink">
			{#each faqs as f, i (f.q)}
				<details class="group border-t-2 border-ink py-5" open={i === 0}>
					<summary class="flex cursor-pointer list-none items-center justify-between gap-4 text-xl font-semibold">
						{f.q}<span class="text-2xl transition group-open:rotate-45" aria-hidden="true">+</span>
					</summary>
					<p class="mt-3 leading-relaxed text-muted">{f.a}</p>
				</details>
			{/each}
		</div>
	</section>

	<!-- Final CTA + footer -->
	<div class="bumps" style="--edge: var(--color-ink)"></div>
	<section class="bg-ink px-4 pt-24 pb-14 text-cream sm:px-6">
		<div class="mx-auto flex max-w-7xl flex-col items-center gap-8 text-center">
			<h2 class="display text-[clamp(44px,8vw,128px)]">Who should we<br /><span class="text-tangerine">watch for you?</span></h2>
			<div class="flex w-full max-w-xl flex-col items-center">
				<div class="relative z-10 -mb-[7px]"><Mascot mood="happy" size={150} hole="#111111" /></div>
				<UrlForm id="final" dark value={form?.placement === 'final' ? form.url : ''} error={errorFor('final')} />
			</div>
			<footer class="mt-16 flex w-full flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-6 text-sm text-stone">
				<span class="wordmark text-[22px] text-cream">undercut</span>
				<nav aria-label="Footer" class="flex gap-5">
					<a href="/privacy" class="hover:text-cream">Privacy</a>
					<a href="/terms" class="hover:text-cream">Terms</a>
					<a href="mailto:hello@undercut.app" class="hover:text-cream">Contact</a>
				</nav>
				<span>Made in Brussels</span>
			</footer>
		</div>
	</section>
</div>
