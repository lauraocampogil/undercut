<script lang="ts">
	import { slide } from 'svelte/transition';
	import Logo from '#lib/components/Logo.svelte';
	import SplitText from '#lib/components/SplitText.svelte';
	import { reveal, countUp, scrub, pointer, inview } from '#lib/motion.ts';
	import { PLANS } from '#lib/plans.ts';
	let { data } = $props();

	let open = $state<number | null>(0);
	let menu = $state(false);
	let y = $state(0);

	// rotating word in the hero
	const words = ['understand', 'read', 'act on', 'love'];
	let wi = $state(0);
	$effect(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const t = setInterval(() => (wi = (wi + 1) % words.length), 2600);
		return () => clearInterval(t);
	});

	// light rays behind the hero (deterministic so SSR = client)
	const rays = Array.from({ length: 90 }, (_, i) => {
		const a = (i / 90) * Math.PI * 2;
		const r1 = 120 + ((i * 37) % 60);
		const r2 = 520 + ((i * 53) % 200);
		return { x1: 500 + Math.cos(a) * r1, y1: 500 + Math.sin(a) * r1, x2: 500 + Math.cos(a) * r2, y2: 500 + Math.sin(a) * r2, w: 1 + ((i * 7) % 5), o: 0.05 + ((i * 13) % 10) / 55 };
	});

	const statement =
		'Your clients don’t want dashboards. They want to know [where leads come from], [what stops people from calling], and [what you fixed this week]. Undercut answers that — every Monday, for every client.';
	const lit = statement.split(' ').map((w) => ({ t: w.replace(/[[\]]/g, ''), hi: false, raw: w }));
	{
		let on = false;
		for (const w of lit) {
			if (w.raw.startsWith('[')) on = true;
			w.hi = on;
			if (w.raw.includes(']')) on = false;
		}
	}

	const channels = [
		['Google Search', 46],
		['Google Maps', 24],
		['Instagram', 14],
		['Direct', 10],
		['Ads', 6]
	] as const;
	const steps = [
		{ t: 'Connect Google', d: 'One login: Analytics, Search Console, Business Profile and Tag Manager for every client. We match the properties for you.' },
		{ t: 'Paste one line', d: 'The snippet counts leads, draws heatmaps and publishes fixes. WordPress, Webflow, Wix, Shopify or Tag Manager — 2 minutes.' },
		{ t: 'Get your Monday list', d: 'Each client gets a health score and a short list of what to fix — most of it in one click.' }
	];
	const faqs = [
		{ q: 'Do I still need Google Analytics?', a: 'No. Undercut reads GA4 if your clients have it, but the snippet alone counts visits, sources, landing pages and leads — cookieless, so many clients can drop GA4 and the cookie banner.' },
		{ q: 'Is it GDPR-friendly?', a: 'The snippet sets no cookies, stores no IP address and never records what people type in forms. Fonts are self-hosted. Data is hosted in the EU.' },
		{ q: 'How do “fixes” go live without touching the CMS?', a: 'Approved fixes (titles, descriptions, image texts, structured data) are applied by the snippet when the page loads, and Google reads them. Each one also comes with the code for a permanent fix in the CMS.' },
		{ q: 'Is pricing per website or per pageview?', a: 'Per client. Traffic does not change your bill — a client with 500k pageviews costs the same as one with 5k.' },
		{ q: 'Can my clients log in?', a: 'Yes, on the Agency plan: invite a client and they only see their own dashboard and report.' },
		{ q: 'Does it work for apps?', a: 'Yes. Link the app’s Firebase project to GA4 and add the App Store ID: users, retention, crashes and reviews appear next to the website.' }
	];
	const tools = ['Google Analytics 4', 'Search Console', 'Business Profile', 'Tag Manager', 'Lighthouse', 'W3C', 'Firebase', 'App Store', 'WordPress', 'Webflow', 'Shopify', 'Wix', 'Slack'];
	const cta = $derived(data.hasWorkspace ? { href: '/app', label: 'Open the app' } : { href: '/signup', label: 'Start free' });
</script>

<svelte:window bind:scrollY={y} />
<svelte:head>
	<title>Undercut — analytics your clients actually understand</title>
	<meta name="description" content="Analytics for agencies: leads by channel, why numbers changed, SEO fixes in one click, heatmaps, alerts and white-label reports — for every client, in plain words." />
</svelte:head>

{#snippet ring(v: number, label: string, i: number)}
	<div class="flex flex-col items-center gap-2">
		<div class="relative grid place-items-center">
		<svg viewBox="0 0 36 36" class="size-16 -rotate-90 sm:size-[72px]">
			<circle cx="18" cy="18" r="15.5" fill="none" stroke="#F3F3F0" stroke-width="3.5" />
			<circle cx="18" cy="18" r="15.5" fill="none" stroke={v >= 90 ? '#2F9E44' : '#E3A21A'} stroke-width="3.5" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100" class="transition-[stroke-dashoffset] duration-[1400ms] ease-[cubic-bezier(.2,.75,.15,1)] group-[.in]:[stroke-dashoffset:var(--o)]" style="--o:{100 - v};transition-delay:{200 + i * 120}ms" />
		</svg>
		<p class="absolute text-sm font-semibold">{v}</p>
		</div>
		<p class="text-[11px] text-muted">{label}</p>
	</div>
{/snippet}

{#snippet burst(cls: string)}
	<svg viewBox="0 0 1000 1000" class="pointer-events-none absolute {cls}" aria-hidden="true">
		<g class="spin-slow origin-center [transform-box:fill-box]">
			{#each rays as r, i (i)}<line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke="#C6F432" stroke-width={r.w} stroke-opacity={r.o} stroke-linecap="round" />{/each}
		</g>
	</svg>
{/snippet}

<div class="min-h-dvh overflow-x-clip bg-paper">
	<!-- nav -->
	<header class="fixed inset-x-0 top-0 z-50 px-3 pt-3">
		<div class="mx-auto flex max-w-[1240px] items-center justify-between gap-4 rounded-full px-3 py-2 transition-all duration-500 sm:px-4 {y > 40 ? 'bg-white/85 shadow-[0_10px_40px_-20px_rgba(0,0,0,.35)] backdrop-blur-xl' : ''}">
			<a href="/" aria-label="Undercut home"><Logo light={y <= 40} /></a>
			<nav class="hidden items-center gap-1 text-sm md:flex">
				{#each [['#features', 'Features'], ['#how', 'How it works'], ['#pricing', 'Pricing'], ['#faq', 'FAQ']] as [h, l] (h)}
					<a href={h} class="rounded-full px-4 py-2 transition-colors {y > 40 ? 'hover:bg-tile' : 'text-white/80 hover:bg-white/10 hover:text-white'}">{l}</a>
				{/each}
			</nav>
			<div class="flex items-center gap-2">
				<a href="/app" class="hidden px-3 text-sm sm:block {y > 40 ? '' : 'text-white/80 hover:text-white'}">Log in</a>
				<a href={cta.href} class="btn btn-accent group">{data.hasWorkspace ? 'Open app' : 'Start free'}<span class="transition-transform group-hover:translate-x-0.5">→</span></a>
				<button class="icon-btn md:hidden {y > 40 ? '' : 'border-white/20! bg-white/10! text-white'}" onclick={() => (menu = !menu)} aria-label="Menu" aria-expanded={menu}>☰</button>
			</div>
		</div>
		{#if menu}
			<nav class="mx-auto mt-2 grid max-w-[1240px] gap-1 rounded-[24px] bg-white p-2 text-sm shadow-xl md:hidden" transition:slide={{ duration: 250 }}>
				{#each [['#features', 'Features'], ['#how', 'How it works'], ['#pricing', 'Pricing'], ['#faq', 'FAQ'], ['/app', 'Log in']] as [h, l] (h)}<a href={h} class="rounded-xl px-3 py-2.5 hover:bg-tile" onclick={() => (menu = false)}>{l}</a>{/each}
			</nav>
		{/if}
	</header>

	<!-- hero -->
	<section class="px-3 pt-3" use:scrub={{ start: 0.1, end: 0 }} use:pointer>
		<div class="relative isolate overflow-hidden rounded-[36px] bg-ink pt-32 text-white sm:rounded-[44px] sm:pt-40">
			<div class="absolute top-[38%] left-1/2 -z-10 size-[1400px] -translate-x-1/2 -translate-y-1/2" style="opacity:calc(1 - var(--p,0) * .6)">
				{@render burst('inset-0 size-full')}
			</div>
			<div class="absolute top-[42%] left-1/2 -z-10 size-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/25 blur-[120px]"></div>

			<div class="mx-auto max-w-5xl px-5 text-center">
				<a href="#features" class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.06] py-1 pr-3 pl-1 text-xs backdrop-blur" use:reveal={{ delay: 50 }}>
					<span class="rounded-full bg-accent px-2 py-0.5 font-medium text-accent-ink">New</span>Leads by channel, counted automatically <span class="text-white/50">›</span>
				</a>
				<h1 class="display mt-7 text-[52px] leading-[0.95] sm:text-[104px]">
					<SplitText as="span" class="block" text="Analytics your clients" delay={150} />
					<span class="block">
						<SplitText as="span" text="actually" delay={350} />
						<span class="relative inline-grid overflow-hidden pb-[0.12em] align-top" use:inview={{ delay: 500 }}>
							{#key wi}
								<em class="col-start-1 row-start-1 text-accent [animation:word-in_.7s_var(--ease-out)_both]">{words[wi]}.</em>
							{/key}
						</span>
					</span>
				</h1>
				<p class="mx-auto mt-6 max-w-xl text-base text-white/65 sm:text-lg" use:reveal={{ delay: 650 }}>Where leads come from, why numbers moved and what to fix this week — for every client, in plain words. Most fixes take one click.</p>
				<div class="mt-8 flex flex-wrap justify-center gap-3" use:reveal={{ delay: 800 }}>
					<a href={cta.href} class="btn btn-accent group px-6 py-3 text-base">{cta.label} — 14 days<span class="transition-transform group-hover:translate-x-1">→</span></a>
					<a href="/app" class="btn border border-white/20 px-6 py-3 text-base text-white hover:bg-white/10">See the live demo</a>
				</div>
			</div>

			<!-- product on stage -->
			<div class="relative mx-auto mt-14 h-[460px] max-w-5xl sm:mt-16 sm:h-[560px]" use:reveal={{ delay: 900 }}>
				<!-- phone -->
				<div class="absolute top-0 left-1/2 w-[270px] sm:w-[300px]" style="transform:translate(calc(-50% + var(--mx,0) * -6px), calc(var(--p,0) * -60px))">
					<div class="rounded-[44px] border border-white/15 bg-[#1b1b1b] p-2.5 shadow-[0_60px_120px_-30px_rgba(198,244,50,.35)]">
						<div class="overflow-hidden rounded-[36px] bg-paper pb-10 text-ink">
							<div class="flex items-center justify-between px-6 pt-3 text-[10px] font-semibold"><span>9:41</span><span class="h-5 w-20 rounded-full bg-ink"></span><span>●●●</span></div>
							<div class="px-4 pt-4">
								<div class="flex items-center justify-between">
									<div><p class="text-[10px] text-muted">Client</p><p class="text-sm font-semibold">Kiné Schaerbeek</p></div>
									<span class="grid size-11 place-items-center rounded-full border-[5px] border-accent bg-white text-xs font-semibold">72</span>
								</div>
								<div class="mt-3 rounded-[20px] bg-ink p-4 text-white">
									<p class="text-[10px] text-white/50">Leads this week</p>
									<p class="mt-1 flex items-end gap-2"><span class="big text-[38px] leading-none">46</span><span class="mb-1 rounded-full bg-accent px-1.5 text-[10px] text-accent-ink">↑ 24%</span></p>
									<div class="mt-3 flex h-12 items-end gap-1">
										{#each [30, 45, 38, 60, 52, 75, 90] as h, i (i)}<span class="flex-1 origin-bottom rounded-t-[4px] {i === 6 ? 'bg-accent' : 'bg-white/20'} [animation:grow-y_1s_var(--ease-out)_both]" style="height:{h}%;animation-delay:{1100 + i * 70}ms"></span>{/each}
									</div>
								</div>
								<div class="mt-2 grid grid-cols-2 gap-2">
									<div class="rounded-[16px] bg-white p-3"><p class="text-[10px] text-muted">From Maps</p><p class="text-lg font-semibold">11</p></div>
									<div class="rounded-[16px] bg-white p-3"><p class="text-[10px] text-muted">SEO health</p><p class="text-lg font-semibold">94</p></div>
								</div>
								<button class="mt-2 flex w-full items-center justify-between rounded-full bg-accent px-4 py-2.5 text-xs font-medium text-accent-ink">⚡ 3 fixes ready<span>Fix all →</span></button>
							</div>
						</div>
					</div>
				</div>

				<!-- floating cards -->
				<div class="absolute top-10 left-2 sm:left-6" style="transform:translate(calc(var(--mx,0) * 14px), calc(var(--my,0) * 10px + var(--p,0) * -160px))">
					<div class="floaty w-[180px] rounded-[20px] bg-white p-3 text-ink shadow-2xl sm:w-[230px]">
						<p class="flex items-center gap-2 text-[11px] text-muted"><span class="relative flex size-2"><span class="ping-soft absolute inset-0 rounded-full bg-good"></span><span class="relative size-2 rounded-full bg-good"></span></span>New lead · 2 min ago</p>
						<p class="mt-1 text-sm font-medium">WhatsApp click</p>
						<p class="text-xs text-muted">via Google Maps · /contact</p>
					</div>
				</div>
				<div class="absolute top-4 right-2 hidden sm:right-8 sm:block" style="transform:translate(calc(var(--mx,0) * -18px), calc(var(--my,0) * -12px + var(--p,0) * -220px))">
					<div class="floaty w-[200px] rounded-[20px] bg-white p-4 text-ink shadow-2xl [animation-delay:-2s]">
						<p class="text-[11px] text-muted">Lighthouse · mobile</p>
						<p class="big mt-1 text-[52px] leading-none text-good">94</p>
						<p class="text-xs text-muted">was 61 before the fixes</p>
					</div>
				</div>
				<div class="absolute bottom-32 left-0 hidden md:block lg:-left-6" style="transform:translate(calc(var(--mx,0) * 22px), calc(var(--my,0) * 14px + var(--p,0) * -120px))">
					<div class="floaty w-[250px] rounded-[20px] bg-[#E4F5B8] p-4 text-ink shadow-2xl [animation-delay:-4s]">
						<p class="text-[11px] font-medium text-accent-ink/70">Why did leads drop?</p>
						<p class="mt-1 text-sm leading-snug">71% comes from <b>Google Search</b>, on <b>/services</b>, on mobile.</p>
					</div>
				</div>
				<div class="absolute right-2 bottom-24 sm:right-0 lg:-right-4" style="transform:translate(calc(var(--mx,0) * -12px), calc(var(--my,0) * 8px + var(--p,0) * -190px))">
					<div class="floaty flex items-center gap-3 rounded-full bg-accent py-2 pr-4 pl-2 text-sm font-medium text-accent-ink shadow-2xl [animation-delay:-3s]">
						<span class="grid size-8 place-items-center rounded-full bg-ink text-accent">✓</span>3 descriptions live
					</div>
				</div>
				<!-- orbit rings -->
				<div class="absolute top-[45%] left-1/2 -z-10 size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"></div>
				<div class="absolute top-[45%] left-1/2 -z-10 size-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[.06]"></div>
			</div>
		</div>
	</section>

	<!-- marquee -->
	<section class="overflow-hidden py-10" aria-label="Works with">
		<div class="marquee flex w-max gap-3 hover:[animation-play-state:paused]">
			{#each [...tools, ...tools] as t, i (i)}
				<span class="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm whitespace-nowrap text-ink-2"><span class="size-1.5 rounded-full {i % 3 === 0 ? 'bg-accent' : 'bg-ink/20'}"></span>{t}</span>
			{/each}
		</div>
	</section>

	<!-- stats -->
	<section class="mx-auto max-w-[1240px] px-4 sm:px-6">
		<div class="card grid gap-10 p-7 sm:p-12 lg:grid-cols-[1.2fr_1fr]">
			<div>
				<SplitText text={'Built for the agency\nthat runs *20 sites*\nnot one.'} class="display text-[40px] leading-[1] sm:text-[64px]" />
				<p class="mt-5 max-w-md text-ink-2" use:reveal={{ delay: 300 }}>One screen for every client. The ones that need you are on top, with the reason in one sentence.</p>
				<a href={cta.href} class="btn btn-primary group mt-7" use:reveal={{ delay: 450 }}>Try it free<span class="transition-transform group-hover:translate-x-1">→</span></a>
			</div>
			<div class="grid grid-cols-2 gap-x-6 gap-y-8 self-center" use:reveal>
				{#each [[10, ' min', 'to connect a client'], [8, '', 'tools in one place'], [1, ' click', 'to publish a fix'], [50, '', 'clients on one screen']] as [n, s, l], i (l)}
					<div class="border-t border-line pt-5" data-stagger>
						<p class="flex items-start gap-2"><span class="big text-[52px] leading-none sm:text-[64px]" use:countUp={{ to: n as number, suffix: s as string, ms: 1200 + i * 200 }}>{n}{s}</span><span class="mt-2 grid size-6 place-items-center rounded-full bg-accent text-[11px] text-accent-ink">↗</span></p>
						<p class="mt-2 text-sm text-muted">{l}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- statement lit by scroll -->
	<section class="relative h-[180vh]" use:scrub={{ start: 0, end: 1 }}>
		<div class="sticky top-0 flex h-dvh items-center">
			<p class="lit display mx-auto max-w-5xl px-5 text-center text-[34px] leading-[1.08] sm:text-[64px]" style="--n:{lit.length}">
				{#each lit as w, i (i)}<span style="--i:{i}" class={w.hi ? 'italic underline decoration-accent decoration-[6px] underline-offset-[6px] [text-decoration-skip-ink:none]' : ''}>{w.t}</span>{' '}{/each}
			</p>
		</div>
	</section>

	<!-- bento features -->
	<section id="features" class="mx-auto max-w-[1240px] scroll-mt-24 px-4 pb-24 sm:px-6">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<SplitText text={'Everything an agency\n*checks*, in one place.'} class="display text-[44px] leading-none sm:text-[72px]" />
			<p class="max-w-xs text-ink-2" use:reveal={{ delay: 300 }}>No setup per client. Every problem comes with a button.</p>
		</div>

		<div class="mt-12 grid grid-cols-1 gap-3 md:grid-cols-6" use:reveal>
			<!-- leads -->
			<article class="group flex flex-col justify-between gap-8 overflow-hidden rounded-[28px] bg-ink p-7 text-white md:col-span-2 md:row-span-2" data-stagger use:inview>
				<div>
					<span class="rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-ink">Zero setup</span>
					<h3 class="display mt-4 text-[34px] leading-tight">Leads by channel</h3>
					<p class="mt-2 text-sm text-white/60">Forms, calls, emails and WhatsApp counted automatically — and credited to the channel that brought them.</p>
				</div>
				<div>
					<p class="big text-[72px] leading-none" use:countUp={{ to: 46 }}>46</p>
					<p class="text-xs text-white/50">leads this month</p>
					<ul class="mt-5 space-y-2.5">
						{#each channels as [c, v], i (c)}
							<li class="text-xs">
								<p class="mb-1 flex justify-between text-white/70"><span>{c}</span><span>{v}%</span></p>
								<div class="h-2 overflow-hidden rounded-full bg-white/10"><div class="h-full origin-left scale-x-0 rounded-full transition-transform duration-[1200ms] ease-[cubic-bezier(.2,.75,.15,1)] group-[.in]:scale-x-100 {i === 0 ? 'bg-accent' : 'bg-white/40'}" style="width:{v * 2}%;transition-delay:{300 + i * 100}ms"></div></div>
							</li>
						{/each}
					</ul>
				</div>
			</article>

			<!-- why -->
			<article class="group flex flex-col gap-5 rounded-[28px] bg-[#E4F5B8] p-7 md:col-span-4" data-stagger use:inview>
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div><span class="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium">No guessing</span><h3 class="display mt-4 text-[34px] leading-tight">Why did it change?</h3></div>
					<p class="max-w-xs text-sm text-ink-2">One click on any number that moved: which channel, page, device or country caused it.</p>
				</div>
				<div class="rounded-[20px] bg-white p-5">
					<p class="text-lg leading-snug sm:text-xl"><span class="font-semibold text-bad">Leads ↓ 31%.</span> 71% of the drop comes from <span class="rounded-md bg-accent px-1">Google Search</span>, mostly on <span class="rounded-md bg-tile px-1">/services</span>, on <span class="rounded-md bg-tile px-1">mobile</span>.</p>
					<div class="mt-4 flex h-3 overflow-hidden rounded-full bg-tile">
						{#each [[71, 'bg-ink'], [18, 'bg-[#9bb93a]'], [11, 'bg-ink/20']] as [w, c], i (i)}<span class="h-full origin-left scale-x-0 transition-transform duration-1000 group-[.in]:scale-x-100 {c}" style="width:{w}%;transition-delay:{400 + i * 250}ms"></span>{/each}
					</div>
					<p class="mt-2 flex gap-4 text-[11px] text-muted"><span>■ Google Search 71%</span><span>■ Maps 18%</span><span>■ Other 11%</span></p>
				</div>
			</article>

			<!-- fix -->
			<article class="group flex flex-col gap-5 rounded-[28px] bg-white p-7 md:col-span-2" data-stagger use:inview>
				<div><span class="rounded-full bg-tile px-2.5 py-1 text-[11px] font-medium">Auto-fix</span><h3 class="display mt-4 text-[30px] leading-tight">Fix it in one click</h3></div>
				<div class="mt-auto rounded-[20px] bg-tile p-4">
					<p class="text-xs text-muted">/services · description missing</p>
					<p class="mt-1 text-sm">“Kiné à Schaerbeek: rendez-vous en 48h, sport & dos…”</p>
					<div class="mt-3 flex items-center justify-between">
						<span class="relative h-7 w-12 rounded-full bg-ink/15 transition-colors delay-700 duration-300 group-[.in]:bg-ink"><span class="absolute top-1 left-1 size-5 rounded-full bg-white transition-transform delay-700 duration-300 group-[.in]:translate-x-5 group-[.in]:bg-accent"></span></span>
						<span class="text-xs font-medium opacity-0 transition-opacity delay-1000 duration-300 group-[.in]:opacity-100">Live on the site ✓</span>
					</div>
				</div>
			</article>

			<!-- heatmaps -->
			<article class="relative flex flex-col gap-5 overflow-hidden rounded-[28px] bg-accent p-7 text-accent-ink md:col-span-2" data-stagger>
				<div class="relative z-10"><span class="rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-accent">Like Hotjar</span><h3 class="display mt-4 text-[30px] leading-tight">Heatmaps</h3><p class="mt-1 text-sm opacity-70">Clicks, scroll and rage clicks on the real page.</p></div>
				<div class="relative mt-auto h-28 rounded-[18px] bg-white/60 p-3">
					<div class="h-2 w-1/2 rounded bg-ink/15"></div>
					<div class="mt-2 h-2 w-3/4 rounded bg-ink/10"></div>
					<div class="mt-4 h-8 w-24 rounded-full bg-ink/15"></div>
					{#each [[30, 60, 70, 0], [70, 40, 50, 0.6], [55, 75, 36, 1.2]] as [x, yy, s, d], i (i)}
						<span class="absolute rounded-full bg-[radial-gradient(circle,#D6453D_0%,rgba(227,162,26,.6)_40%,transparent_70%)] [animation:floaty_3s_ease-in-out_infinite]" style="left:{x}%;top:{yy}%;width:{s}px;height:{s}px;translate:-50% -50%;animation-delay:{d}s"></span>
					{/each}
				</div>
			</article>

			<!-- alerts -->
			<article class="group flex flex-col gap-5 rounded-[28px] bg-ink p-7 text-white md:col-span-3" data-stagger use:inview>
				<div><span class="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium">Slack & email</span><h3 class="display mt-4 text-[30px] leading-tight">Alerts, not dashboards</h3></div>
				<ul class="space-y-2">
					{#each [['🔻', 'Leads dropped 40%', 'Maison Lou · this week'], ['⛔', 'Site is down', 'Kiné Schaerbeek · 2 min ago'], ['⭐', 'New 1★ review to answer', 'Atelier Brut · Google Maps']] as [ico, t, s], i (t)}
						<li class="flex translate-x-6 items-center gap-3 rounded-[18px] bg-white/[.07] p-3 opacity-0 transition-all duration-700 group-[.in]:translate-x-0 group-[.in]:opacity-100" style="transition-delay:{300 + i * 180}ms">
							<span class="grid size-9 place-items-center rounded-full bg-white/10">{ico}</span>
							<div class="min-w-0"><p class="text-sm font-medium">{t}</p><p class="truncate text-xs text-white/50">{s}</p></div>
						</li>
					{/each}
				</ul>
			</article>

			<!-- seo -->
			<article class="group flex flex-col gap-5 rounded-[28px] bg-white p-7 md:col-span-3" data-stagger use:inview>
				<div><span class="rounded-full bg-tile px-2.5 py-1 text-[11px] font-medium">Checked daily</span><h3 class="display mt-4 text-[30px] leading-tight">SEO, Lighthouse & W3C</h3></div>
				<div class="mt-auto grid grid-cols-4 gap-2">
					{@render ring(94, 'Speed', 0)}
					{@render ring(100, 'SEO', 1)}
					{@render ring(88, 'Access', 2)}
					{@render ring(97, 'W3C', 3)}
				</div>
			</article>

			<!-- reports -->
			<article class="flex flex-col gap-5 rounded-[28px] bg-[#E4F5B8] p-7 md:col-span-3" data-stagger>
				<div class="flex items-start justify-between gap-4">
					<div><span class="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium">White-label</span><h3 class="display mt-4 text-[30px] leading-tight">Reports clients read alone</h3></div>
				</div>
				<div class="mt-auto flex items-center gap-4 rounded-[20px] bg-white p-4">
					<span class="grid size-12 shrink-0 place-items-center rounded-2xl border-2 border-dashed border-ink/20 text-[10px] text-muted">your logo</span>
					<div class="min-w-0 flex-1"><p class="text-sm font-medium">October for Maison Lou</p><p class="truncate text-xs text-muted">38 leads (+12) · fastest month yet · 4 fixes done</p></div>
					<span class="rounded-full bg-ink px-3 py-1.5 text-xs text-white">PDF</span>
				</div>
			</article>

			<!-- apps -->
			<article class="flex flex-col gap-5 rounded-[28px] bg-white p-7 md:col-span-3" data-stagger>
				<div><span class="rounded-full bg-tile px-2.5 py-1 text-[11px] font-medium">Firebase · App Store</span><h3 class="display mt-4 text-[30px] leading-tight">Website + app, together</h3></div>
				<div class="mt-auto grid grid-cols-3 gap-2">
					{#each [['Retention', '42%'], ['Crash-free', '99.7%'], ['Reviews', '4.7★']] as [l, v] (l)}<div class="rounded-[18px] bg-tile p-3"><p class="text-[11px] text-muted">{l}</p><p class="mt-1 text-xl font-semibold">{v}</p></div>{/each}
				</div>
			</article>
		</div>
	</section>

	<!-- how it works -->
	<section id="how" class="mx-auto max-w-[1240px] scroll-mt-24 px-4 pb-24 sm:px-6">
		<div class="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.2fr]">
			<div class="lg:sticky lg:top-28 lg:self-start">
				<p class="label" use:reveal>How it works</p>
				<SplitText text={'Connected in\n*10 minutes*.'} class="display mt-3 text-[48px] leading-none sm:text-[72px]" />
				<p class="mt-5 max-w-md text-ink-2" use:reveal={{ delay: 200 }}>No events to configure, no tags to plan. Undercut matches each client to their Google properties and starts counting as soon as the line is on the site.</p>
			</div>
			<ol class="relative grid min-w-0 grid-cols-1 gap-4 pl-14" use:scrub={{ start: 0.75, end: 0.4 }}>
				<span class="absolute top-2 bottom-2 left-[21px] w-0.5 rounded bg-line"></span>
				<span class="absolute top-2 left-[21px] w-0.5 origin-top rounded bg-ink" style="height:calc((100% - 16px) * var(--p,0))"></span>
				{#each steps as s, i (s.t)}
					<li class="relative card p-6" use:reveal={{ delay: i * 120 }}>
						<span class="absolute top-6 -left-14 grid size-11 place-items-center rounded-full bg-ink text-lg text-accent ring-8 ring-paper">{i + 1}</span>
						<h3 class="display text-[28px]">{s.t}</h3>
						<p class="mt-1 text-sm text-ink-2">{s.d}</p>
						{#if i === 1}
							<div class="group mt-4 overflow-hidden rounded-[16px] bg-ink p-4" use:inview>
								<p class="font-mono text-[12px] whitespace-nowrap text-accent [clip-path:inset(0_100%_0_0)] transition-[clip-path] duration-[2200ms] ease-[steps(60)] group-[.in]:[clip-path:inset(0)]">&lt;script defer src="https://app.undercut.be/u.js" data-site="maison-lou"&gt;&lt;/script&gt;</p>
							</div>
						{/if}
					</li>
				{/each}
			</ol>
		</div>
	</section>

	<!-- comparison -->
	<section class="mx-auto max-w-[1240px] px-4 pb-24 sm:px-6">
		<SplitText text="Why not just…" class="display text-[44px] leading-none sm:text-[64px]" />
		<div class="card mt-8 overflow-x-auto p-2 sm:p-4" use:reveal>
			<table class="w-full min-w-[640px] text-sm">
				<thead><tr class="text-left text-xs text-muted"><th class="p-3 font-medium"></th><th class="p-3 font-medium">GA4</th><th class="p-3 font-medium">Plausible / Fathom</th><th class="p-3 font-medium">Agency dashboards</th><th class="rounded-t-[16px] bg-ink p-3 font-medium text-white">Undercut</th></tr></thead>
				<tbody>
					{#each [['A client can read it alone', '✕', '✓', '~', '✓'], ['Leads by channel without setting up events', '✕', '~', '✕', '✓'], ['Says why a number changed', '✕', '✕', '✕', '✓'], ['Fixes SEO problems for you', '✕', '✕', '✕', '✓'], ['Heatmaps + SEO audit included', '✕', '✕', '~', '✓'], ['Price per client, not per pageview', '—', '✕', '✓', '✓'], ['Cookieless', '✕', '✓', '—', '✓']] as row, i (i)}
						<tr class="border-t border-line" data-stagger>
							<td class="p-3 font-medium">{row[0]}</td>
							{#each row.slice(1) as c, j (j)}<td class="p-3 {j === 3 ? 'bg-ink text-accent' : c === '✓' ? 'text-good' : 'text-muted'} {j === 3 && i === 6 ? 'rounded-b-[16px]' : ''}">{c}</td>{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<!-- pricing -->
	<section id="pricing" class="mx-auto max-w-[1240px] scroll-mt-24 px-4 pb-24 sm:px-6">
		<div class="text-center">
			<SplitText text="Priced per *client*." class="display text-[48px] leading-none sm:text-[80px]" />
			<p class="mt-3 text-ink-2" use:reveal={{ delay: 200 }}>Not per pageview. 14 days free, no card.</p>
		</div>
		<div class="mt-12 grid gap-3 md:grid-cols-3" use:reveal>
			{#each ['freelance', 'agency', 'studio'] as const as id (id)}
				{@const p = PLANS[id]}
				<div class="relative flex flex-col gap-4 overflow-hidden p-7 transition-transform duration-500 hover:-translate-y-1.5 {id === 'agency' ? 'card-dark' : 'card'}" data-stagger>
					{#if id === 'agency'}<div class="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-accent/30 blur-3xl"></div>{/if}
					<div class="relative flex items-center justify-between"><p class="font-medium">{p.name}</p>{#if id === 'agency'}<span class="rounded-full bg-accent px-2.5 py-0.5 text-[11px] text-accent-ink">Most popular</span>{/if}</div>
					<p class="relative"><span class="big text-[64px]">€{p.price}</span><span class="text-sm opacity-60"> / month</span></p>
					<p class="relative text-sm opacity-70">Up to {p.clients} clients · all features{id === 'freelance' ? '' : id === 'agency' ? ' · team & client logins · white-label' : ' · own report domain · priority support'}</p>
					<a href="/signup?plan={id}" class="btn relative mt-auto {id === 'agency' ? 'btn-accent' : 'btn-primary'}">Start free</a>
				</div>
			{/each}
		</div>
	</section>

	<!-- faq -->
	<section id="faq" class="mx-auto max-w-3xl scroll-mt-24 px-4 pb-24 sm:px-6">
		<SplitText text="Questions" class="display text-center text-[48px] leading-none sm:text-[64px]" />
		<ul class="mt-8 space-y-2" use:reveal>
			{#each faqs as f, i (f.q)}
				<li class="card overflow-hidden p-0" data-stagger>
					<button class="flex w-full items-center justify-between gap-4 p-5 text-left font-medium" onclick={() => (open = open === i ? null : i)} aria-expanded={open === i}>
						{f.q}<span class="grid size-8 shrink-0 place-items-center rounded-full bg-tile text-lg transition-transform duration-300 {open === i ? 'rotate-45 bg-accent' : ''}">+</span>
					</button>
					{#if open === i}<p class="px-5 pb-5 text-sm text-ink-2" transition:slide={{ duration: 300 }}>{f.a}</p>{/if}
				</li>
			{/each}
		</ul>
	</section>

	<!-- final cta -->
	<section class="px-3 pb-3">
		<div class="relative isolate overflow-hidden rounded-[36px] bg-ink px-6 py-24 text-center text-white sm:rounded-[44px] sm:py-36">
			<div class="absolute top-full left-1/2 -z-10 size-[1400px] -translate-x-1/2 -translate-y-1/2">{@render burst('inset-0 size-full')}</div>
			<div class="absolute -bottom-40 left-1/2 -z-10 size-[520px] -translate-x-1/2 rounded-full bg-accent/40 blur-[110px]"></div>
			<SplitText text={'Stop sending *dashboards*.\nSend answers.'} class="display text-[52px] leading-[0.95] sm:text-[112px]" emClass="text-accent" />
			<div class="mt-10 flex flex-wrap justify-center gap-3" use:reveal={{ delay: 300 }}>
				<a href={cta.href} class="btn btn-accent group px-7 py-3.5 text-base">{cta.label} — 14 days<span class="transition-transform group-hover:translate-x-1">→</span></a>
				<a href="/app" class="btn border border-white/20 px-7 py-3.5 text-base text-white hover:bg-white/10">See the demo</a>
			</div>
			<p class="mt-5 text-xs text-white/50" use:reveal={{ delay: 400 }}>No card · Cookieless · Data in the EU</p>
		</div>
	</section>

	<!-- footer -->
	<footer class="overflow-hidden px-4 pt-10 sm:px-6">
		<div class="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 text-sm text-muted">
			<Logo size={26} />
			<nav class="flex gap-5"><a href="#features" class="hover:text-ink">Features</a><a href="#pricing" class="hover:text-ink">Pricing</a><a href="/app" class="hover:text-ink">Log in</a></nav>
			<p>Made in Brussels · Cookieless · Data in the EU</p>
		</div>
		<div use:scrub={{ start: 1, end: 1 }} class="mx-auto max-w-[1240px]">
			<p class="mt-6 text-center text-[24vw] leading-[0.78] font-semibold tracking-[-0.07em] text-ink select-none lg:text-[300px]" style="transform:translateY(calc((1 - var(--p,0)) * 40%));opacity:calc(.2 + var(--p,0) * .8)" aria-hidden="true">
				under<span class="text-accent">cut</span>
			</p>
		</div>
	</footer>
</div>
