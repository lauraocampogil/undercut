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

	// light rays (deterministic so SSR = client)
	const rays = Array.from({ length: 90 }, (_, i) => {
		const a = (i / 90) * Math.PI * 2;
		const r1 = 120 + ((i * 37) % 60);
		const r2 = 520 + ((i * 53) % 200);
		return { x1: 500 + Math.cos(a) * r1, y1: 500 + Math.sin(a) * r1, x2: 500 + Math.cos(a) * r2, y2: 500 + Math.sin(a) * r2, w: 1 + ((i * 7) % 5), o: 0.05 + ((i * 13) % 10) / 55 };
	});

	const statement =
		'Analytics tools sell you more charts. We sell you fewer. Three questions, every client, every Monday: [where do leads come from], [what’s blocking them], [what did we fix]. That’s the job. The rest is noise.';
	const lit = (() => {
		let on = false;
		return statement.split(' ').map((raw) => {
			if (raw.startsWith('[')) on = true;
			const w = { t: raw.replace(/[[\]]/g, ''), hi: on };
			if (raw.includes(']')) on = false;
			return w;
		});
	})();

	const cuts = ['Vanity metrics', 'Cookie banners', 'Event setup', '400 reports', 'PDFs nobody reads', 'Waiting on a dev'];
	const noTape = ['No cookies', 'No event setup', 'No 400 reports', 'No consultant', 'No per-pageview pricing', 'Just answers'];
	const tools = ['GA4', 'Search Console', 'Google Maps', 'Tag Manager', 'Lighthouse', 'W3C', 'Firebase', 'WordPress', 'Webflow', 'Shopify', 'Slack'];
	const channels = [
		['Google Search', 46],
		['Google Maps', 24],
		['Instagram', 14],
		['Direct', 10],
		['Ads', 6]
	] as const;
	const steps = [
		{ t: 'Connect Google', d: 'One login. Analytics, Search Console, Maps and Tag Manager for every client — matched automatically.' },
		{ t: 'Paste one line', d: 'The snippet counts leads, draws heatmaps and ships fixes. WordPress, Webflow, Wix, Shopify, Tag Manager. Two minutes.' },
		{ t: 'Get your Monday list', d: 'A health score and a short list per client. Hit ⚡ and most of it is done.' }
	];
	const faqs = [
		{ q: 'Do I still need Google Analytics?', a: 'No. Undercut reads GA4 if your clients have it — but the snippet alone counts visits, sources, landing pages and leads. Cookieless. Many clients can drop the cookie banner too.' },
		{ q: 'Is it GDPR-friendly?', a: 'No cookies, no IP addresses, nothing typed in forms is ever recorded. Fonts self-hosted, data in the EU.' },
		{ q: 'How do fixes go live without touching the CMS?', a: 'Approved fixes (titles, descriptions, image texts, structured data) are applied by the snippet on page load, and Google reads them. Each one also comes with the code for a permanent fix.' },
		{ q: 'Per website or per pageview?', a: 'Per client. A client with 500k pageviews costs the same as one with 5k. Traffic is good news — it shouldn’t be a bill.' },
		{ q: 'Can my clients log in?', a: 'Yes, on the Agency plan. They only see their own dashboard and report.' },
		{ q: 'Apps too?', a: 'Yes. Link Firebase and the App Store ID: users, retention, crashes and reviews next to the website.' }
	];
	const cta = $derived(data.hasWorkspace ? { href: '/app', label: 'Open the app' } : { href: '/signup', label: 'Start free' });
</script>

<svelte:window bind:scrollY={y} />
<svelte:head>
	<title>Undercut — dashboards are dead. Long live answers.</title>
	<meta name="description" content="Anti-dashboard analytics for agencies. Where leads come from, what blocks them, what to fix — for every client, in plain words. Fixed in one click." />
</svelte:head>

{#snippet mark(size = 18, cls = '')}
	<svg width={size} height={size} viewBox="0 0 32 32" class="shrink-0 {cls}" aria-hidden="true"><path d="M7.5 6.5h5.5v10.5a3 3 0 0 0 6 0V6.5h5.5v10.5a8.5 8.5 0 0 1-17 0z" fill="currentColor" style="clip-path:polygon(0 0,100% 0,100% 25%,0 53%)" /><path d="M7.5 6.5h5.5v10.5a3 3 0 0 0 6 0V6.5h5.5v10.5a8.5 8.5 0 0 1-17 0z" fill="currentColor" transform="translate(1.6 0)" style="clip-path:polygon(0 63%,100% 35%,100% 100%,0 100%)" /></svg>
{/snippet}

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
				{#each [['#manifesto', 'Manifesto'], ['#features', 'Features'], ['#how', 'How it works'], ['#pricing', 'Pricing']] as [h, l] (h)}
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
				{#each [['#manifesto', 'Manifesto'], ['#features', 'Features'], ['#how', 'How it works'], ['#pricing', 'Pricing'], ['/app', 'Log in']] as [h, l] (h)}<a href={h} class="rounded-xl px-3 py-2.5 hover:bg-tile" onclick={() => (menu = false)}>{l}</a>{/each}
			</nav>
		{/if}
	</header>

	<!-- ================= HERO ================= -->
	<section class="px-3 pt-3" use:scrub={{ start: 0.1, end: 0 }} use:pointer>
		<div class="relative isolate overflow-hidden rounded-[36px] bg-ink pt-32 text-white sm:rounded-[44px] sm:pt-44">
			<div class="absolute top-[34%] left-1/2 -z-10 size-[1400px] -translate-x-1/2 -translate-y-1/2" style="opacity:calc(1 - var(--p,0) * .6)">{@render burst('inset-0 size-full')}</div>
			<div class="absolute top-[40%] left-1/2 -z-10 size-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/25 blur-[120px]"></div>

			<div class="mx-auto max-w-6xl px-5 text-center">
				<p class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.06] py-1 pr-3 pl-1 text-xs backdrop-blur" use:reveal={{ delay: 50 }}>
					<span class="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 font-semibold text-accent-ink">{@render mark(12)} Anti-dashboard</span>Analytics for agencies
				</p>
				<h1 class="mt-8">
					<span class="block text-[52px] leading-[0.9] sm:text-[112px]">
						<span class="relative inline-block" use:inview={{ delay: 200 }}>
							<SplitText as="span" class="shout" text="Dashboards" delay={150} />
							<span class="cut-bar absolute top-[56%] -right-[3%] -left-[3%] h-[0.13em] rounded-full bg-accent" aria-hidden="true"></span>
						</span>
						<SplitText as="span" class="display" text="are dead." delay={350} />
					</span>
					<SplitText as="span" class="display mt-1 block text-[52px] leading-[0.95] sm:text-[124px]" text="Long live *answers.*" emClass="text-accent" delay={550} />
				</h1>
				<p class="mx-auto mt-8 max-w-xl text-base text-white/65 sm:text-lg" use:reveal={{ delay: 800 }}>Undercut tells agencies where leads come from, what’s blocking them and what to fix — for every client, in plain words. Then fixes it. One click.</p>
				<div class="mt-9 flex flex-wrap justify-center gap-3" use:reveal={{ delay: 950 }}>
					<a href={cta.href} class="btn btn-accent group px-6 py-3 text-base">{cta.label} — 14 days<span class="transition-transform group-hover:translate-x-1">→</span></a>
					<a href="/app" class="btn border border-white/20 px-6 py-3 text-base text-white hover:bg-white/10">See the live demo</a>
				</div>
			</div>

			<!-- dashboard on stage -->
			<div class="relative mx-auto mt-16 max-w-[1120px] px-4 sm:mt-20 sm:px-8 [perspective:1800px]" use:reveal={{ delay: 1050 }}>
				<div class="origin-top transition-transform duration-200 ease-out" style="transform:rotateX(max(0deg, calc(16deg - var(--p,0) * 70deg))) translateY(calc(var(--p,0) * -30px))">
					<div class="overflow-hidden rounded-t-[22px] border border-b-0 border-white/15 bg-[#1b1b1b] shadow-[0_-30px_120px_-30px_rgba(198,244,50,.45)]">
						<div class="flex items-center gap-2 px-4 py-3">
							<span class="size-2.5 rounded-full bg-white/20"></span><span class="size-2.5 rounded-full bg-white/20"></span><span class="size-2.5 rounded-full bg-white/20"></span>
							<span class="mx-auto rounded-full bg-white/[.07] px-4 py-1 text-[11px] text-white/50">app.undercut.be/kine-schaerbeek</span>
						</div>
						<div class="grid bg-paper text-ink md:grid-cols-[200px_1fr]">
							<!-- sidebar -->
							<aside class="hidden flex-col gap-1 border-r border-line p-3 text-[12px] md:flex">
								<div class="px-2 pb-3"><Logo size={22} /></div>
								<div class="flex items-center gap-2 rounded-xl bg-white p-2"><span class="grid size-7 place-items-center rounded-lg bg-[#3E8E63] text-[10px] font-semibold text-white">K</span><span class="font-medium">Kiné Schaerbeek</span></div>
								{#each [['Summary', true], ['Leads', false], ['Traffic', false], ['Search & Maps', false], ['SEO & fixes', false], ['Heatmaps', false]] as [l, a] (l)}
									<span class="mt-0.5 rounded-lg px-3 py-1.5 {a ? 'bg-ink text-white' : 'text-ink-2'}">{l}</span>
								{/each}
								<span class="mt-auto flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-white">{@render mark(12, 'text-accent')} Ask Undercut AI</span>
							</aside>
							<!-- main -->
							<div class="p-4 sm:p-6">
								<div class="flex items-end justify-between gap-4">
									<div><p class="text-[11px] text-muted">Summary · last 28 days</p><p class="display text-[30px] leading-none sm:text-[40px]">Kiné Schaerbeek</p></div>
									<span class="grid size-12 shrink-0 place-items-center rounded-full border-[5px] border-accent bg-white text-sm font-semibold">72</span>
								</div>
								<div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
									{#each [['Leads', '46', '↑ 24%', true], ['Visits', '3,501', '↑ 8%', true], ['Google position', '#11.2', '↑ 3.1', true], ['SEO health', '94', 'was 61', false]] as [l, v, d, up], i (l)}
										<div class="rounded-[16px] bg-white p-3 {i === 0 ? 'bg-ink! text-white' : ''}">
											<p class="text-[11px] {i === 0 ? 'text-white/50' : 'text-muted'}">{l}</p>
											<p class="mt-1 flex items-center gap-1.5"><span class="big text-[26px] leading-none">{v}</span><span class="rounded-full px-1.5 text-[10px] {up ? (i === 0 ? 'bg-accent text-accent-ink' : 'bg-good-bg text-good') : 'bg-tile text-muted'}">{d}</span></p>
										</div>
									{/each}
								</div>
								<div class="mt-2 grid gap-2 lg:grid-cols-[1.5fr_1fr]">
									<div class="rounded-[16px] bg-white p-4">
										<p class="flex justify-between text-[11px] text-muted"><span>Leads per day</span><span>Google · Maps · Social</span></p>
										<svg viewBox="0 0 400 120" class="mt-2 h-28 w-full sm:h-36" preserveAspectRatio="none">
											<defs><linearGradient id="hg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#C6F432" stop-opacity=".55" /><stop offset="1" stop-color="#C6F432" stop-opacity="0" /></linearGradient></defs>
											{#each [30, 60, 90] as gy (gy)}<line x1="0" x2="400" y1={gy} y2={gy} stroke="#E3E3DE" stroke-dasharray="3 4" />{/each}
											<path d="M0 95 C40 90 60 80 90 84 S150 60 180 66 S240 40 270 48 S330 20 360 24 S390 12 400 10 V120 H0Z" fill="url(#hg)" class="[animation:fade-in_1.2s_ease_1.8s_both]" />
											<path d="M0 95 C40 90 60 80 90 84 S150 60 180 66 S240 40 270 48 S330 20 360 24 S390 12 400 10" fill="none" stroke="#0D0D0D" stroke-width="2.5" pathLength="100" stroke-dasharray="100" class="[animation:draw_2s_var(--ease-out)_1.3s_both]" />
											<path d="M0 105 C50 104 80 98 120 100 S200 88 240 92 S320 80 400 78" fill="none" stroke="#9bb93a" stroke-width="2" stroke-dasharray="4 5" opacity=".8" />
										</svg>
									</div>
									<div class="rounded-[16px] bg-white p-4">
										<p class="text-[11px] text-muted">Fix this week</p>
										<ul class="mt-2 space-y-1.5">
											{#each [['3 pages without description', true], ['Images without alt text', true], ['Slow on mobile (/services)', false]] as [t, auto], i (t)}
												<li class="flex items-center gap-2 rounded-xl bg-tile px-3 py-2 text-[12px] [animation:fade-up_.6s_var(--ease-out)_both]" style="animation-delay:{1600 + i * 150}ms">
													<span class="size-1.5 shrink-0 rounded-full {auto ? 'bg-[#E3A21A]' : 'bg-bad'}"></span><span class="flex-1 truncate">{t}</span>
													<span class="rounded-full px-2 py-0.5 text-[10px] font-medium {auto ? 'bg-accent text-accent-ink' : 'border border-line bg-white'}">{auto ? '⚡ Fix' : 'How'}</span>
												</li>
											{/each}
										</ul>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- floating cards -->
				<div class="absolute -top-8 left-0 sm:-left-2 lg:-left-10" style="transform:translate(calc(var(--mx,0) * 14px), calc(var(--my,0) * 10px + var(--p,0) * -140px))">
					<div class="floaty w-[190px] rounded-[20px] bg-white p-3 text-ink shadow-2xl sm:w-[230px]">
						<p class="flex items-center gap-2 text-[11px] text-muted"><span class="relative flex size-2"><span class="ping-soft absolute inset-0 rounded-full bg-good"></span><span class="relative size-2 rounded-full bg-good"></span></span>New lead · 2 min ago</p>
						<p class="mt-1 text-sm font-medium">WhatsApp click</p>
						<p class="text-xs text-muted">via Google Maps · /contact</p>
					</div>
				</div>
				<div class="absolute -top-12 right-0 hidden sm:block lg:-right-10" style="transform:translate(calc(var(--mx,0) * -18px), calc(var(--my,0) * -12px + var(--p,0) * -200px))">
					<div class="floaty w-[260px] rounded-[20px] bg-[#E4F5B8] p-4 text-ink shadow-2xl [animation-delay:-3s]">
						<p class="text-[11px] font-medium text-accent-ink/70">Why did leads go up?</p>
						<p class="mt-1 text-sm leading-snug">68% comes from <b>Google Maps</b> — calls after the new photos.</p>
					</div>
				</div>
				<div class="absolute right-2 bottom-16 hidden sm:block lg:-right-6" style="transform:translate(calc(var(--mx,0) * -12px), calc(var(--my,0) * 8px + var(--p,0) * -160px))">
					<div class="floaty flex items-center gap-3 rounded-full bg-accent py-2 pr-4 pl-2 text-sm font-medium text-accent-ink shadow-2xl [animation-delay:-2s]">
						<span class="grid size-8 place-items-center rounded-full bg-ink text-accent">✓</span>3 descriptions live
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ================= TAPES ================= -->
	<section class="relative my-24 h-[200px] sm:my-32 sm:h-[240px]" aria-label="What Undercut is — and isn’t">
		<div class="absolute top-1/2 -right-10 -left-10 -translate-y-1/2 rotate-[3deg] overflow-hidden bg-ink py-4 sm:py-5">
			<div class="marquee-rev flex w-max items-center gap-8 text-accent">
				{#each [...tools, ...tools, ...tools] as t, i (i)}<span class="flex items-center gap-8 text-[20px] font-semibold tracking-tight whitespace-nowrap uppercase sm:text-[26px]">{t}{@render mark(18)}</span>{/each}
			</div>
		</div>
		<div class="absolute top-1/2 -right-10 -left-10 -translate-y-1/2 -rotate-[4deg] overflow-hidden bg-accent py-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,.4)] sm:py-5">
			<div class="marquee flex w-max items-center gap-8 text-ink">
				{#each [...noTape, ...noTape, ...noTape] as t, i (i)}<span class="shout flex items-center gap-8 text-[26px] whitespace-nowrap sm:text-[36px]">{t}{@render mark(22)}</span>{/each}
			</div>
		</div>
	</section>

	<!-- ================= MANIFESTO: WHAT WE CUT ================= -->
	<section id="manifesto" class="mx-auto max-w-[1240px] scroll-mt-24 px-4 py-24 sm:px-6 sm:py-40">
		<div class="grid gap-14 lg:grid-cols-[1fr_1.4fr]">
			<div class="lg:sticky lg:top-32 lg:self-start">
				<p class="label" use:reveal>The manifesto</p>
				<SplitText text={'We cut everything\nthat doesn’t\n*make you money.*'} class="display mt-4 text-[44px] leading-[0.95] sm:text-[72px]" />
				<p class="mt-6 max-w-sm text-ink-2" use:reveal={{ delay: 200 }}>Analytics became a hobby: hundreds of reports, events to plan, a consultant to read them. Agencies don’t need more data. They need to know what to do on Monday.</p>
			</div>
			<ul class="flex flex-col">
				{#each cuts as c, i (c)}
					<li class="relative border-t border-line py-4 sm:py-6" use:scrub={{ start: 0.85, end: 0.55 }}>
						<span class="flex items-baseline gap-4">
							<span class="w-8 text-xs text-muted tabular-nums">0{i + 1}</span>
							<span class="relative inline-block">
								<span class="shout text-[clamp(26px,6.4vw,64px)] whitespace-nowrap text-ink" style="opacity:calc(1 - var(--p,0) * .7)">{c}</span>
								<span class="absolute top-[52%] -right-[2%] -left-[2%] h-[0.18em] origin-left -rotate-[2deg] rounded-full bg-accent text-[clamp(26px,6.4vw,64px)]" style="transform:scaleX(var(--p,0)) rotate(-2deg)" aria-hidden="true"></span>
							</span>
						</span>
					</li>
				{/each}
				<li class="border-t border-line pt-8" use:reveal>
					<p class="flex items-baseline gap-4"><span class="w-8 text-xs text-muted">→</span><span class="display text-[48px] leading-none sm:text-[96px]">What’s left: <em class="rounded-[0.15em] bg-ink px-[0.15em] text-accent">answers.</em></span></p>
				</li>
			</ul>
		</div>
	</section>

	<!-- ================= STATEMENT (lit by scroll) ================= -->
	<section class="relative h-[200vh]" use:scrub={{ start: 0, end: 1 }}>
		<div class="sticky top-0 flex h-dvh items-center">
			<p class="lit display mx-auto max-w-5xl px-5 text-center text-[34px] leading-[1.08] sm:text-[64px]" style="--n:{lit.length}">
				{#each lit as w, i (i)}<span style="--i:{i}" class={w.hi ? 'italic underline decoration-accent decoration-[6px] underline-offset-[6px] [text-decoration-skip-ink:none]' : ''}>{w.t}</span>{' '}{/each}
			</p>
		</div>
	</section>

	<!-- ================= STATS ================= -->
	<section class="mx-auto max-w-[1240px] px-4 py-24 sm:px-6 sm:py-32">
		<div class="relative grid gap-12 overflow-hidden rounded-[36px] bg-ink p-8 text-white sm:p-14 lg:grid-cols-[1.2fr_1fr]">
			<div class="pointer-events-none absolute -right-20 -bottom-20 text-accent/10">{@render mark(420)}</div>
			<div class="relative">
				<SplitText text={'Built for agencies\nrunning *20 sites.*\nNot one.'} class="display text-[40px] leading-[1] sm:text-[68px]" emClass="text-accent" />
				<p class="mt-6 max-w-md text-white/60" use:reveal={{ delay: 300 }}>One screen for every client. The ones that need you are on top — with the reason, in one sentence.</p>
			</div>
			<div class="relative grid grid-cols-2 gap-x-6 gap-y-10 self-center" use:reveal>
				{#each [[10, ' min', 'to connect a client'], [0, '', 'events to set up'], [1, ' click', 'to ship a fix'], [50, '', 'clients on one screen']] as [n, s, l], i (l)}
					<div class="border-t border-white/15 pt-5" data-stagger>
						<p class="flex items-start gap-2"><span class="big text-[44px] leading-none whitespace-nowrap sm:text-[60px]" use:countUp={{ to: n as number, suffix: s as string, ms: 1200 + i * 200 }}>{n}{s}</span><span class="mt-2 grid size-6 place-items-center rounded-full bg-accent text-[11px] text-accent-ink">↗</span></p>
						<p class="mt-2 text-sm text-white/50">{l}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- ================= FEATURES (bento) ================= -->
	<section id="features" class="mx-auto max-w-[1240px] scroll-mt-24 px-4 py-24 sm:px-6 sm:py-40">
		<div class="flex flex-wrap items-end justify-between gap-6">
			<SplitText text={'Everything you need.\n*Nothing you don’t.*'} class="display text-[44px] leading-none sm:text-[80px]" />
			<p class="max-w-xs text-ink-2" use:reveal={{ delay: 300 }}>No setup per client. Every problem comes with a button.</p>
		</div>

		<div class="mt-16 grid grid-cols-1 gap-3 md:grid-cols-6" use:reveal>
			<article class="group flex flex-col justify-between gap-8 overflow-hidden rounded-[28px] bg-ink p-7 text-white md:col-span-2 md:row-span-2" data-stagger use:inview>
				<div>
					<span class="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-ink">Zero setup</span>
					<h3 class="display mt-4 text-[36px] leading-tight">Leads, not pageviews.</h3>
					<p class="mt-2 text-sm text-white/60">Forms, calls, emails, WhatsApp — counted automatically and credited to the channel that brought them.</p>
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

			<article class="group flex flex-col gap-5 rounded-[28px] bg-[#E4F5B8] p-7 md:col-span-4" data-stagger use:inview>
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div><span class="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium">No guessing</span><h3 class="display mt-4 text-[36px] leading-tight">Why? In one sentence.</h3></div>
					<p class="max-w-xs text-sm text-ink-2">Click any number that moved. Get the channel, page, device or country behind it.</p>
				</div>
				<div class="rounded-[20px] bg-white p-5">
					<p class="text-lg leading-snug sm:text-xl"><span class="font-semibold text-bad">Leads ↓ 31%.</span> 71% of the drop comes from <span class="rounded-md bg-accent px-1">Google Search</span>, mostly on <span class="rounded-md bg-tile px-1">/services</span>, on <span class="rounded-md bg-tile px-1">mobile</span>.</p>
					<div class="mt-4 flex h-3 overflow-hidden rounded-full bg-tile">
						{#each [[71, 'bg-ink'], [18, 'bg-[#9bb93a]'], [11, 'bg-ink/20']] as [w, c], i (i)}<span class="h-full origin-left scale-x-0 transition-transform duration-1000 group-[.in]:scale-x-100 {c}" style="width:{w}%;transition-delay:{400 + i * 250}ms"></span>{/each}
					</div>
					<p class="mt-2 flex flex-wrap gap-x-4 text-[11px] text-muted"><span>■ Google Search 71%</span><span>■ Maps 18%</span><span>■ Other 11%</span></p>
				</div>
			</article>

			<article class="group flex flex-col gap-5 rounded-[28px] bg-white p-7 md:col-span-2" data-stagger use:inview>
				<div><span class="rounded-full bg-tile px-2.5 py-1 text-[11px] font-medium">Auto-fix</span><h3 class="display mt-4 text-[32px] leading-tight">Fix it. Don’t ticket it.</h3></div>
				<div class="mt-auto rounded-[20px] bg-tile p-4">
					<p class="text-xs text-muted">/services · description missing</p>
					<p class="mt-1 text-sm">“Kiné à Schaerbeek: rendez-vous en 48h, sport & dos…”</p>
					<div class="mt-3 flex items-center justify-between">
						<span class="relative h-7 w-12 rounded-full bg-ink/15 transition-colors delay-700 duration-300 group-[.in]:bg-ink"><span class="absolute top-1 left-1 size-5 rounded-full bg-white transition-transform delay-700 duration-300 group-[.in]:translate-x-5 group-[.in]:bg-accent"></span></span>
						<span class="text-xs font-medium opacity-0 transition-opacity delay-1000 duration-300 group-[.in]:opacity-100">Live on the site ✓</span>
					</div>
				</div>
			</article>

			<article class="relative flex flex-col gap-5 overflow-hidden rounded-[28px] bg-accent p-7 text-accent-ink md:col-span-2" data-stagger>
				<div class="relative z-10"><span class="rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-accent">Heatmaps</span><h3 class="display mt-4 text-[32px] leading-tight">See the rage.</h3><p class="mt-1 text-sm opacity-70">Clicks, scroll and rage clicks — on the real page.</p></div>
				<div class="relative mt-auto h-28 rounded-[18px] bg-white/60 p-3">
					<div class="h-2 w-1/2 rounded bg-ink/15"></div>
					<div class="mt-2 h-2 w-3/4 rounded bg-ink/10"></div>
					<div class="mt-4 h-8 w-24 rounded-full bg-ink/15"></div>
					{#each [[30, 60, 70, 0], [70, 40, 50, 0.6], [55, 75, 36, 1.2]] as [x, yy, s, d], i (i)}
						<span class="absolute rounded-full bg-[radial-gradient(circle,#D6453D_0%,rgba(227,162,26,.6)_40%,transparent_70%)] [animation:floaty_3s_ease-in-out_infinite]" style="left:{x}%;top:{yy}%;width:{s}px;height:{s}px;translate:-50% -50%;animation-delay:{d}s"></span>
					{/each}
				</div>
			</article>

			<article class="group flex flex-col gap-5 rounded-[28px] bg-ink p-7 text-white md:col-span-3" data-stagger use:inview>
				<div><span class="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium">Slack & email</span><h3 class="display mt-4 text-[32px] leading-tight">Wake up to problems, not charts.</h3></div>
				<ul class="space-y-2">
					{#each [['🔻', 'Leads dropped 40%', 'Maison Lou · this week'], ['⛔', 'Site is down', 'Kiné Schaerbeek · 2 min ago'], ['⭐', 'New 1★ review to answer', 'Atelier Brut · Google Maps']] as [ico, t, s], i (t)}
						<li class="flex translate-x-6 items-center gap-3 rounded-[18px] bg-white/[.07] p-3 opacity-0 transition-all duration-700 group-[.in]:translate-x-0 group-[.in]:opacity-100" style="transition-delay:{300 + i * 180}ms">
							<span class="grid size-9 place-items-center rounded-full bg-white/10">{ico}</span>
							<div class="min-w-0"><p class="text-sm font-medium">{t}</p><p class="truncate text-xs text-white/50">{s}</p></div>
						</li>
					{/each}
				</ul>
			</article>

			<article class="group flex flex-col gap-5 rounded-[28px] bg-white p-7 md:col-span-3" data-stagger use:inview>
				<div><span class="rounded-full bg-tile px-2.5 py-1 text-[11px] font-medium">Checked daily</span><h3 class="display mt-4 text-[32px] leading-tight">Fast, findable, valid. Daily.</h3><p class="mt-1 text-sm text-ink-2">Lighthouse mobile + desktop, SEO and W3C.</p></div>
				<div class="mt-auto grid grid-cols-4 gap-2">
					{@render ring(94, 'Speed', 0)}
					{@render ring(100, 'SEO', 1)}
					{@render ring(88, 'Access', 2)}
					{@render ring(97, 'W3C', 3)}
				</div>
			</article>

			<article class="flex flex-col gap-5 rounded-[28px] bg-[#E4F5B8] p-7 md:col-span-3" data-stagger>
				<div><span class="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium">White-label</span><h3 class="display mt-4 text-[32px] leading-tight">Reports clients actually read.</h3></div>
				<div class="mt-auto flex items-center gap-4 rounded-[20px] bg-white p-4">
					<span class="grid size-12 shrink-0 place-items-center rounded-2xl border-2 border-dashed border-ink/20 text-[10px] text-muted">your logo</span>
					<div class="min-w-0 flex-1"><p class="text-sm font-medium">October for Maison Lou</p><p class="truncate text-xs text-muted">38 leads (+12) · fastest month yet · 4 fixes done</p></div>
					<span class="rounded-full bg-ink px-3 py-1.5 text-xs text-white">PDF</span>
				</div>
			</article>

			<article class="flex flex-col gap-5 rounded-[28px] bg-white p-7 md:col-span-3" data-stagger>
				<div><span class="rounded-full bg-tile px-2.5 py-1 text-[11px] font-medium">Firebase · App Store</span><h3 class="display mt-4 text-[32px] leading-tight">Website + app. One place.</h3></div>
				<div class="mt-auto grid grid-cols-3 gap-2">
					{#each [['Retention', '42%'], ['Crash-free', '99.7%'], ['Reviews', '4.7★']] as [l, v] (l)}<div class="rounded-[18px] bg-tile p-3"><p class="text-[11px] text-muted">{l}</p><p class="mt-1 text-xl font-semibold">{v}</p></div>{/each}
				</div>
			</article>
		</div>
	</section>

	<!-- ================= HOW ================= -->
	<section id="how" class="mx-auto max-w-[1240px] scroll-mt-24 px-4 py-24 sm:px-6 sm:py-40">
		<div class="grid grid-cols-1 gap-14 lg:grid-cols-[1fr_1.2fr]">
			<div class="lg:sticky lg:top-32 lg:self-start">
				<p class="label" use:reveal>How it works</p>
				<SplitText text={'Live in *10 minutes.*\nNo consultant.'} class="display mt-4 text-[48px] leading-none sm:text-[76px]" />
				<p class="mt-6 max-w-md text-ink-2" use:reveal={{ delay: 200 }}>No events to plan, no tags to configure, no training. Undercut matches each client to their Google properties and starts counting the moment the line is live.</p>
			</div>
			<ol class="relative grid min-w-0 grid-cols-1 gap-4 pl-14" use:scrub={{ start: 0.75, end: 0.4 }}>
				<span class="absolute top-2 bottom-2 left-[21px] w-0.5 rounded bg-line"></span>
				<span class="absolute top-2 left-[21px] w-0.5 origin-top rounded bg-ink" style="height:calc((100% - 16px) * var(--p,0))"></span>
				{#each steps as s, i (s.t)}
					<li class="relative card p-6 sm:p-8" use:reveal={{ delay: i * 120 }}>
						<span class="absolute top-7 -left-14 grid size-11 place-items-center rounded-full bg-ink text-lg text-accent ring-8 ring-paper sm:top-9">{i + 1}</span>
						<h3 class="display text-[30px]">{s.t}</h3>
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

	<!-- ================= PRICING ================= -->
	<section id="pricing" class="mx-auto max-w-[1240px] scroll-mt-24 px-4 py-24 sm:px-6 sm:py-40">
		<div class="text-center">
			<SplitText text={'Per client.\n*Not per pageview.*'} class="display text-[48px] leading-none sm:text-[88px]" />
			<p class="mt-5 text-ink-2" use:reveal={{ delay: 200 }}>Traffic is good news. It shouldn’t be a bill. 14 days free, no card.</p>
		</div>
		<div class="mt-16 grid gap-3 md:grid-cols-3" use:reveal>
			{#each ['freelance', 'agency', 'studio'] as const as id (id)}
				{@const p = PLANS[id]}
				<div class="relative flex flex-col gap-4 overflow-hidden p-8 transition-transform duration-500 hover:-translate-y-1.5 {id === 'agency' ? 'card-dark' : 'card'}" data-stagger>
					{#if id === 'agency'}<div class="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-accent/30 blur-3xl"></div>{/if}
					<div class="relative flex items-center justify-between"><p class="font-medium">{p.name}</p>{#if id === 'agency'}<span class="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent-ink">Most popular</span>{/if}</div>
					<p class="relative"><span class="big text-[64px]">€{p.price}</span><span class="text-sm opacity-60"> / month</span></p>
					<p class="relative text-sm opacity-70">Up to {p.clients} clients · all features{id === 'freelance' ? '' : id === 'agency' ? ' · team & client logins · white-label' : ' · own report domain · priority support'}</p>
					<a href="/signup?plan={id}" class="btn relative mt-auto {id === 'agency' ? 'btn-accent' : 'btn-primary'}">Start free</a>
				</div>
			{/each}
		</div>
	</section>

	<!-- ================= FAQ ================= -->
	<section id="faq" class="mx-auto max-w-3xl scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
		<SplitText text="Straight *answers.*" class="display text-center text-[48px] leading-none sm:text-[72px]" />
		<ul class="mt-12 space-y-2" use:reveal>
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

	<!-- ================= FINAL CTA ================= -->
	<section class="px-3 pt-16 pb-3 sm:pt-24">
		<div class="relative isolate overflow-hidden rounded-[36px] bg-ink px-6 py-28 text-center text-white sm:rounded-[44px] sm:py-44">
			<div class="absolute top-full left-1/2 -z-10 size-[1400px] -translate-x-1/2 -translate-y-1/2">{@render burst('inset-0 size-full')}</div>
			<div class="absolute -bottom-40 left-1/2 -z-10 size-[520px] -translate-x-1/2 rounded-full bg-accent/40 blur-[110px]"></div>
			<h2>
				<span class="relative inline-block" use:inview={{ delay: 200 }}>
					<SplitText as="span" class="shout block text-[52px] leading-[0.85] sm:text-[140px]" text="Stop reporting." />
					<span class="cut-bar absolute top-[46%] -right-[2%] -left-[2%] h-[0.09em] rounded-full bg-accent text-[52px] sm:text-[140px]" aria-hidden="true"></span>
				</span>
				<SplitText as="span" class="display mt-2 block text-[60px] leading-[0.95] sm:text-[150px]" text="*Start fixing.*" emClass="text-accent" delay={300} />
			</h2>
			<div class="mt-12 flex flex-wrap justify-center gap-3" use:reveal={{ delay: 300 }}>
				<a href={cta.href} class="btn btn-accent group px-7 py-3.5 text-base">{cta.label} — 14 days<span class="transition-transform group-hover:translate-x-1">→</span></a>
				<a href="/app" class="btn border border-white/20 px-7 py-3.5 text-base text-white hover:bg-white/10">See the demo</a>
			</div>
			<p class="mt-5 text-xs text-white/50" use:reveal={{ delay: 400 }}>No card · Cookieless · Data in the EU</p>
		</div>
	</section>

	<!-- footer -->
	<footer class="overflow-hidden px-4 pt-12 sm:px-6">
		<div class="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 text-sm text-muted">
			<Logo size={26} />
			<nav class="flex gap-5"><a href="#manifesto" class="hover:text-ink">Manifesto</a><a href="#pricing" class="hover:text-ink">Pricing</a><a href="/app" class="hover:text-ink">Log in</a></nav>
			<p>Made in Brussels · Cookieless · Data in the EU</p>
		</div>
		<div use:scrub={{ start: 1, end: 1 }} class="mx-auto max-w-[1240px]">
			<p class="mt-8 text-center text-[24vw] leading-[0.78] font-semibold tracking-[-0.07em] text-ink select-none lg:text-[300px]" style="transform:translateY(calc((1 - var(--p,0)) * 40%));opacity:calc(.2 + var(--p,0) * .8)" aria-hidden="true">
				under<span class="text-accent">cut</span>
			</p>
		</div>
	</footer>
</div>
