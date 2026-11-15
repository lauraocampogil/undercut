<script lang="ts">
	import { slide } from 'svelte/transition';
	import Logo from '#lib/components/Logo.svelte';
	import SplitText from '#lib/components/SplitText.svelte';
	import { reveal, countUp, scrub, pointer, inview } from '#lib/motion.ts';
	import { PLANS } from '#lib/plans.ts';

	let open = $state<number | null>(0);
	let menu = $state(false);
	let y = $state(0);

	const audiences = ['web agencies.', 'app studios.', 'communication agencies.'];
	let wi = $state(0);
	$effect(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const t = setInterval(() => (wi = (wi + 1) % audiences.length), 2600);
		return () => clearInterval(t);
	});

	// wireframe globe (deterministic → same on server and client)
	const R = 300;
	const meridians = Array.from({ length: 12 }, (_, i) => i);
	const parallels = [-70, -50, -30, -10, 10, 30, 50, 70].map((lat) => ({ y: R * Math.sin((lat * Math.PI) / 180), rx: R * Math.cos((lat * Math.PI) / 180) }));

	const ticker = [
		'Kiné Schaerbeek · +12 leads from Google Maps',
		'Maison Lou · 3 descriptions live',
		'Atelier Brut · site down → back in 4 min',
		'Moove app · crash-free 99.7%',
		'Vélo Flandria · Instagram campaign → 9 forms',
		'Boulangerie Ixelles · climbing to #4 on Google'
	];

	const loop = [
		{ t: 'Connect', d: 'One Google login. Every client matched.', a: -90 },
		{ t: 'Measure', d: 'Leads, visits, clicks. No cookies.', a: 0 },
		{ t: 'Fix', d: '⚡ One click, live on the site.', a: 90 },
		{ t: 'Report', d: 'Monday report, your logo.', a: 180 }
	];
	let step = $state(0);
	$effect(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const t = setInterval(() => (step = (step + 1) % loop.length), 2200);
		return () => clearInterval(t);
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

	const cuts = ['Vanity metrics', 'Cookie banners', 'Event setup', '400 reports', 'PDFs nobody reads'];
	const channels = [
		['Google Search', 46],
		['Google Maps', 24],
		['Instagram', 14],
		['Direct', 10],
		['Ads', 6]
	] as const;
	const faqs = [
		{ q: 'Do I still need Google Analytics?', a: 'No. Undercut reads GA4 if your clients have it — but the snippet alone counts visits, sources, landing pages and leads. Cookieless. Many clients can drop the cookie banner too.' },
		{ q: 'Is it GDPR-friendly?', a: 'No cookies, no IP addresses, nothing typed in forms is ever recorded. Data in the EU.' },
		{ q: 'How do fixes go live without touching the CMS?', a: 'Approved fixes (titles, descriptions, image texts, structured data) are applied by the snippet on page load, and Google reads them. Each one also comes with the code for a permanent fix.' },
		{ q: 'Per website or per pageview?', a: 'Per client. A client with 500k pageviews costs the same as one with 5k. Traffic is good news — it shouldn’t be a bill.' },
		{ q: 'Can my clients log in?', a: 'Yes. They only see their own dashboard and report.' },
		{ q: 'Apps too?', a: 'Yes. Link Firebase and the App Store ID: users, retention, crashes and reviews next to the website.' }
	];
	const cta = { href: '/beta', label: 'Join the free beta' };
	const nav = [
		['#loop', 'How it works'],
		['#features', 'Features'],
		['#pricing', 'Pricing'],
		['#faq', 'FAQ']
	];
</script>

<svelte:window bind:scrollY={y} />
<svelte:head>
	<title>Undercut — analytics without the noise, for agencies</title>
	<meta name="description" content="Analytics for web, mobile app and communication agencies. Where leads come from, what blocks them, what to fix — for every client, in plain words. Fixed in one click." />
	<meta name="theme-color" content="#070807" />
</svelte:head>

{#snippet mark(size = 18, cls = '')}
	<svg width={size} height={size} viewBox="0 0 32 32" class="shrink-0 {cls}" aria-hidden="true"><path d="M7.5 6.5h5.5v10.5a3 3 0 0 0 6 0V6.5h5.5v10.5a8.5 8.5 0 0 1-17 0z" fill="currentColor" style="clip-path:polygon(0 0,100% 0,100% 25%,0 53%)" /><path d="M7.5 6.5h5.5v10.5a3 3 0 0 0 6 0V6.5h5.5v10.5a8.5 8.5 0 0 1-17 0z" fill="currentColor" transform="translate(1.6 0)" style="clip-path:polygon(0 63%,100% 35%,100% 100%,0 100%)" /></svg>
{/snippet}

{#snippet diamond()}
	<svg width="16" height="10" viewBox="0 0 16 10" class="shrink-0 text-accent/70" aria-hidden="true"><path d="M0 5h4M12 5h4M8 1l3 4-3 4-3-4z" fill="none" stroke="currentColor" stroke-width="1.2" /></svg>
{/snippet}

{#snippet ring(v: number, label: string, i: number)}
	<div class="flex flex-col items-center gap-2">
		<div class="relative grid place-items-center">
			<svg viewBox="0 0 36 36" class="size-16 -rotate-90 sm:size-[72px]">
				<circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="3" />
				<circle cx="18" cy="18" r="15.5" fill="none" stroke={v >= 90 ? '#C6F432' : '#E3A21A'} stroke-width="3" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100" class="transition-[stroke-dashoffset] duration-[1400ms] ease-[cubic-bezier(.2,.75,.15,1)] group-[.in]:[stroke-dashoffset:var(--o)]" style="--o:{100 - v};transition-delay:{200 + i * 120}ms" />
			</svg>
			<p class="absolute text-sm font-semibold">{v}</p>
		</div>
		<p class="text-[11px] text-white/50">{label}</p>
	</div>
{/snippet}

<div class="landing min-h-dvh overflow-x-clip bg-[#070807] text-white">
	<!-- ================= NAV ================= -->
	<header class="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
		<div class="mx-auto flex max-w-[1280px] items-center justify-between gap-4">
			<a href="/" aria-label="Undercut home" class="rounded-full px-2 py-1.5 transition-colors {y > 40 ? 'bg-black/40 backdrop-blur-xl' : ''}"><Logo light /></a>
			<nav class="glass hidden items-center gap-1 rounded-full p-1 text-sm transition-colors md:flex {y > 40 ? 'bg-black/60!' : ''}">
				{#each nav as [h, l] (h)}<a href={h} class="rounded-full px-4 py-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white">{l}</a>{/each}
			</nav>
			<div class="flex items-center gap-2">
				<a href="/login" class="hidden px-3 text-sm text-white/70 hover:text-white sm:block">Log in</a>
				<a href={cta.href} class="btn btn-accent group shadow-[0_0_40px_-8px_rgba(198,244,50,.7)]">Join the beta<span class="transition-transform group-hover:translate-x-0.5">→</span></a>
				<button class="glass grid size-10 place-items-center rounded-full md:hidden" onclick={() => (menu = !menu)} aria-label="Menu" aria-expanded={menu}>☰</button>
			</div>
		</div>
		{#if menu}
			<nav class="glass mx-auto mt-2 grid max-w-[1280px] gap-1 rounded-[24px] p-2 text-sm md:hidden" transition:slide={{ duration: 250 }}>
				{#each [...nav, ['/login', 'Log in']] as [h, l] (h)}<a href={h} class="rounded-xl px-3 py-2.5 hover:bg-white/10" onclick={() => (menu = false)}>{l}</a>{/each}
			</nav>
		{/if}
	</header>

	<!-- ================= HERO ================= -->
	<section class="relative isolate min-h-dvh overflow-hidden pt-32 sm:pt-40" use:pointer use:scrub={{ start: 0.1, end: 0 }}>
		<!-- gradient mesh -->
		<div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
			<div class="mesh absolute top-[-20%] left-1/2 size-[1100px] -translate-x-1/2 rounded-full"></div>
			<div class="absolute right-[-10%] bottom-[-30%] size-[700px] rounded-full bg-[#2f9e44]/25 blur-[140px]"></div>
			<div class="absolute bottom-[-20%] left-[-15%] size-[600px] rounded-full bg-accent/15 blur-[140px]"></div>
			<div class="grid-floor absolute inset-x-0 bottom-0 h-[55%]"></div>
			<div class="noise absolute inset-0 opacity-[.07]"></div>
		</div>

		<!-- globe -->
		<div class="pointer-events-none absolute top-[56%] left-1/2 -z-10 w-[min(1000px,150vw)] sm:top-[50%]" style="transform:translate(calc(-50% + var(--mx,0) * -12px), calc(var(--my,0) * -8px + var(--p,0) * 120px));opacity:calc(1 - var(--p,0) * .5)" aria-hidden="true">
			<svg viewBox="-340 -340 680 680" class="w-full">
				<defs>
					<radialGradient id="gfill" cx="35%" cy="30%" r="75%">
						<stop offset="0" stop-color="#1f2a10" />
						<stop offset=".55" stop-color="#0c100a" />
						<stop offset="1" stop-color="#070807" />
					</radialGradient>
					<linearGradient id="gline" x1="0" x2="1" y1="0" y2="1">
						<stop offset="0" stop-color="#C6F432" stop-opacity=".55" />
						<stop offset=".6" stop-color="#ffffff" stop-opacity=".12" />
						<stop offset="1" stop-color="#ffffff" stop-opacity=".04" />
					</linearGradient>
					<clipPath id="gclip"><circle r={R} /></clipPath>
				</defs>
				<circle r={R + 30} fill="none" stroke="rgba(198,244,50,.08)" stroke-width="1" />
				<circle r={R} fill="url(#gfill)" />
				<g clip-path="url(#gclip)" transform="rotate(-18)">
					{#each parallels as p (p.y)}<ellipse cx="0" cy={p.y} rx={p.rx} ry={p.rx * 0.18} fill="none" stroke="url(#gline)" stroke-width="1" />{/each}
					{#each meridians as m (m)}<ellipse class="meridian" cx="0" cy="0" rx={R} ry={R} fill="none" stroke="url(#gline)" stroke-width="1" style="animation-delay:{(-m * 24) / meridians.length}s" />{/each}
				</g>
				<circle r={R} fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1.2" />
				<!-- signal arc -->
				<path d="M -260 210 C -150 40, -40 -120, 90 -170 S 250 -150, 300 -60" fill="none" stroke="#C6F432" stroke-width="2" stroke-linecap="round" pathLength="100" class="arc" />
				{#each [[-152, 40], [90, -170], [262, -112]] as [px, py], i (i)}
					<circle cx={px} cy={py} r="5" fill="#C6F432" class="pin" style="animation-delay:{1.4 + i * 0.5}s" />
					<circle cx={px} cy={py} r="14" fill="none" stroke="#C6F432" stroke-opacity=".5" class="pin-ring" style="animation-delay:{1.6 + i * 0.5}s" />
				{/each}
			</svg>
		</div>

		<div class="mx-auto max-w-6xl px-5 text-center">
			<p class="glass inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-xs" use:reveal={{ delay: 50 }}>
				<span class="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 font-semibold text-accent-ink">{@render mark(12)} Beta</span>Free for the first 30 agencies
			</p>
			<h1 class="mt-8 text-[clamp(46px,8.4vw,112px)] leading-[0.92] font-medium tracking-[-0.045em]">
				<SplitText as="span" class="block" text="Analytics," delay={150} />
				<SplitText as="span" class="grad-text block" text="*without the noise.*" emClass="font-serif font-normal tracking-[-0.02em]" delay={350} />
			</h1>
			<p class="mt-6 text-[22px] text-white/70 sm:text-[30px]" use:reveal={{ delay: 650 }}>
				Built for
				<span class="relative inline-grid overflow-hidden pb-[0.1em] align-bottom">
					{#key wi}<em class="col-start-1 row-start-1 font-serif text-accent [animation:word-in_.6s_var(--ease-out)_both]">{audiences[wi]}</em>{/key}
				</span>
			</p>
			<p class="mx-auto mt-5 max-w-xl text-base text-white/55 sm:text-lg" use:reveal={{ delay: 800 }}>Where leads come from, what blocks them and what to fix — for every client, in plain words. Then fixed in one click.</p>
			<div class="mt-9 flex flex-wrap justify-center gap-3" use:reveal={{ delay: 950 }}>
				<a href={cta.href} class="btn btn-accent group px-6 py-3 text-base shadow-[0_0_60px_-10px_rgba(198,244,50,.8)]">{cta.label}<span class="transition-transform group-hover:translate-x-1">→</span></a>
				<a href="#product" class="btn glass px-6 py-3 text-base text-white hover:bg-white/10">See it in action</a>
			</div>
		</div>

		<!-- floating client chips on the globe -->
		<div class="pointer-events-none relative mx-auto mt-16 hidden h-[260px] max-w-[1100px] sm:block" aria-hidden="true">
			<div class="absolute top-6 left-[8%]" style="transform:translate(calc(var(--mx,0) * 16px), calc(var(--my,0) * 10px))">
				<div class="glass floaty w-[220px] rounded-[20px] p-3.5">
					<p class="flex items-center gap-2 text-[11px] text-white/50"><span class="relative flex size-2"><span class="ping-soft absolute inset-0 rounded-full bg-accent"></span><span class="relative size-2 rounded-full bg-accent"></span></span>New lead · 2 min ago</p>
					<p class="mt-1 text-sm font-medium">WhatsApp click</p>
					<p class="text-xs text-white/50">via Google Maps · /contact</p>
				</div>
			</div>
			<div class="absolute top-0 right-[6%]" style="transform:translate(calc(var(--mx,0) * -18px), calc(var(--my,0) * -12px))">
				<div class="glass floaty w-[250px] rounded-[20px] p-4 [animation-delay:-3s]">
					<p class="text-[11px] font-medium text-accent">Why did leads go up?</p>
					<p class="mt-1 text-sm leading-snug text-white/85">68% comes from <b class="text-white">Google Maps</b> — calls after the new photos.</p>
				</div>
			</div>
			<div class="absolute bottom-10 left-1/2 -translate-x-1/2">
				<div class="floaty flex items-center gap-3 rounded-full bg-accent py-2 pr-4 pl-2 text-sm font-medium text-accent-ink shadow-[0_0_60px_-10px_rgba(198,244,50,.9)] [animation-delay:-2s]">
					<span class="grid size-8 place-items-center rounded-full bg-ink text-accent">✓</span>3 fixes live on maisonlou.be
				</div>
			</div>
		</div>

		<!-- corner stats -->
		<div class="relative mx-auto mt-10 flex max-w-[1280px] items-end justify-between px-5 pb-6 text-sm sm:mt-0">
			<div class="hidden text-white/60 sm:block">
				<p><b class="mr-2 font-medium text-white">10 min</b>to connect a client</p>
				<p class="mt-1"><b class="mr-2 font-medium text-white">0</b>events to set up</p>
			</div>
			<a href="#product" class="mx-auto grid size-11 place-items-center rounded-full border border-white/15 text-white/70 transition-colors hover:text-white sm:mx-0" aria-label="Scroll down"><span class="[animation:floaty_2.4s_ease-in-out_infinite]">↓</span></a>
			<div class="hidden text-right text-white/60 sm:block">
				<p><b class="mr-2 font-medium text-white">1 click</b>to ship a fix</p>
				<p class="mt-1"><b class="mr-2 font-medium text-white">EU</b>data, no cookies</p>
			</div>
		</div>

		<!-- ticker -->
		<div class="relative overflow-hidden border-y border-white/10 bg-black/30 py-3 text-sm text-white/55 backdrop-blur" aria-hidden="true">
			<div class="flex w-max [animation:marquee_40s_linear_infinite]">
				{#each [0, 1] as k (k)}
					<div class="flex items-center gap-6 pr-6">
						{#each ticker as t (t)}<span class="whitespace-nowrap">{t}</span>{@render diamond()}{/each}
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- ================= PRODUCT ================= -->
	<section id="product" class="relative scroll-mt-10 px-4 pt-24 sm:px-6 sm:pt-36" use:scrub={{ start: 0.95, end: 0.2 }}>
		<div class="pointer-events-none absolute top-1/3 left-1/2 -z-0 size-[900px] -translate-x-1/2 rounded-full bg-accent/15 blur-[160px]" aria-hidden="true"></div>
		<div class="relative mx-auto max-w-[1240px] text-center">
			<p class="label text-accent!" use:reveal>The product</p>
			<SplitText text={'One screen per client.\n*The ones that need you on top.*'} class="mt-4 text-[clamp(36px,5.6vw,76px)] leading-[1] font-medium tracking-[-0.04em]" emClass="font-serif font-normal text-white/60" />
		</div>

		<div class="relative mx-auto mt-14 max-w-[1120px] [perspective:1800px]" use:reveal={{ delay: 150 }}>
			<div class="origin-top transition-transform duration-200 ease-out" style="transform:rotateX(max(0deg, calc(18deg - var(--p,0) * 40deg))) scale(calc(.92 + var(--p,0) * .08))">
				<div class="grad-border rounded-[26px] p-px shadow-[0_40px_160px_-40px_rgba(198,244,50,.55)]">
					<div class="overflow-hidden rounded-[25px] bg-[#111]">
						<div class="flex items-center gap-2 px-4 py-3">
							<span class="size-2.5 rounded-full bg-white/20"></span><span class="size-2.5 rounded-full bg-white/20"></span><span class="size-2.5 rounded-full bg-white/20"></span>
							<span class="mx-auto rounded-full bg-white/[.07] px-4 py-1 text-[11px] text-white/50">app.getundercut.app/kine-schaerbeek</span>
						</div>
						<div class="grid bg-paper text-ink md:grid-cols-[200px_1fr]">
							<aside class="hidden flex-col gap-1 border-r border-line p-3 text-[12px] md:flex">
								<div class="px-2 pb-3"><Logo size={22} /></div>
								<div class="flex items-center gap-2 rounded-xl bg-white p-2"><span class="grid size-7 place-items-center rounded-lg bg-[#3E8E63] text-[10px] font-semibold text-white">K</span><span class="font-medium">Kiné Schaerbeek</span></div>
								{#each [['Summary', true], ['Leads', false], ['Traffic', false], ['Search & Maps', false], ['SEO & fixes', false], ['Heatmaps', false], ['Campaigns', false]] as [l, a] (l)}
									<span class="mt-0.5 rounded-lg px-3 py-1.5 {a ? 'bg-ink text-white' : 'text-ink-2'}">{l}</span>
								{/each}
							</aside>
							<div class="p-4 text-left sm:p-6">
								<div class="flex items-end justify-between gap-4">
									<div><p class="text-[11px] text-muted">Summary · last 28 days</p><p class="display text-[30px] leading-none sm:text-[40px]">Kiné Schaerbeek</p></div>
									<span class="grid size-12 shrink-0 place-items-center rounded-full border-[5px] border-accent bg-white text-sm font-semibold">72</span>
								</div>
								<div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
									{#each [['Leads', '46', '↑ 24%', true], ['Visits', '3,501', '↑ 8%', true], ['Google position', '#11.2', '↑ 3.1', true], ['Website health', '94', 'was 61', false]] as [l, v, d, up], i (l)}
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
											<path d="M0 95 C40 90 60 80 90 84 S150 60 180 66 S240 40 270 48 S330 20 360 24 S390 12 400 10 V120 H0Z" fill="url(#hg)" />
											<path d="M0 95 C40 90 60 80 90 84 S150 60 180 66 S240 40 270 48 S330 20 360 24 S390 12 400 10" fill="none" stroke="#0D0D0D" stroke-width="2.5" />
											<path d="M0 105 C50 104 80 98 120 100 S200 88 240 92 S320 80 400 78" fill="none" stroke="#9bb93a" stroke-width="2" stroke-dasharray="4 5" opacity=".8" />
										</svg>
									</div>
									<div class="rounded-[16px] bg-white p-4">
										<p class="text-[11px] text-muted">This week’s to-do</p>
										<ul class="mt-2 space-y-1.5">
											{#each [['3 pages without description', true], ['Images without alt text', true], ['Slow on mobile (/services)', false]] as [t, auto] (t)}
												<li class="flex items-center gap-2 rounded-xl bg-tile px-3 py-2 text-[12px]">
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
			</div>
		</div>
	</section>

	<!-- ================= WHO ================= -->
	<section class="mx-auto max-w-[1240px] px-4 py-28 sm:px-6 sm:py-40">
		<div class="flex flex-wrap items-end justify-between gap-6">
			<SplitText text={'Made for agencies.\n*Not for analysts.*'} class="text-[clamp(40px,6vw,80px)] leading-none font-medium tracking-[-0.04em]" emClass="font-serif font-normal text-accent" />
			<p class="max-w-sm text-white/60" use:reveal={{ delay: 250 }}>You build and run things for clients. Undercut shows what each one brings in — and what to fix next.</p>
		</div>
		<div class="mt-16 grid gap-3 md:grid-cols-3" use:reveal>
			{#each [
				{ t: 'Web agencies', k: 'Sites & SEO', d: 'Leads per page and channel, speed, SEO and W3C checked daily — and fixes published without opening the CMS.', pts: ['Leads by channel', 'One-click SEO fixes', 'Heatmaps'] },
				{ t: 'App studios', k: 'iOS & Android', d: 'Users, retention, crashes and store reviews next to the app’s landing page. One place per client.', pts: ['Retention & crashes', 'Store reviews', 'Web + app together'] },
				{ t: 'Communication agencies', k: 'Campaigns & social', d: 'Did the campaign bring calls, forms and WhatsApps? See it per channel, explain it in one sentence, send the report.', pts: ['Campaign → leads', 'Why it changed', 'White-label reports'] }
			] as a, i (a.t)}
				<article class="group grad-border relative rounded-[32px] p-px transition-transform duration-500 hover:-translate-y-1.5" data-stagger>
					<div class="relative flex h-full min-h-[380px] flex-col overflow-hidden rounded-[31px] p-8 {i === 1 ? 'bg-[linear-gradient(160deg,#C6F432,#7fb52a)] text-accent-ink' : 'bg-[linear-gradient(160deg,#151a10,#0b0c0a)]'}">
						<div class="pointer-events-none absolute -right-10 -bottom-12 opacity-[.08] transition-transform duration-700 group-hover:-rotate-6">{@render mark(240)}</div>
						<p class="flex items-center justify-between text-xs font-medium opacity-60"><span>0{i + 1}</span><span>{a.k}</span></p>
						<h3 class="mt-10 text-[clamp(28px,2.8vw,38px)] leading-[1] font-medium tracking-[-0.03em]">{a.t}</h3>
						<p class="mt-4 text-sm opacity-70">{a.d}</p>
						<ul class="relative mt-auto flex flex-wrap gap-1.5 pt-8">
							{#each a.pts as pt (pt)}<li class="rounded-full px-3 py-1 text-xs {i === 1 ? 'bg-ink/10' : 'bg-white/[.08]'}">{pt}</li>{/each}
						</ul>
					</div>
				</article>
			{/each}
		</div>
	</section>

	<!-- ================= THE LOOP ================= -->
	<section id="loop" class="relative scroll-mt-24 overflow-hidden px-4 py-28 sm:px-6 sm:py-36">
		<div class="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_50%,rgba(47,158,68,.28),transparent_70%)]" aria-hidden="true"></div>
		<div class="relative mx-auto grid max-w-[1240px] items-center gap-14 lg:grid-cols-[1fr_1.1fr]">
			<div>
				<p class="label text-accent!" use:reveal>How it works</p>
				<SplitText text={'Live in *10 minutes.*\nNo consultant.'} class="mt-4 text-[clamp(40px,5.4vw,72px)] leading-[1] font-medium tracking-[-0.04em]" emClass="font-serif font-normal text-accent" />
				<ol class="mt-10 space-y-2">
					{#each loop as s, i (s.t)}
						<li>
							<button class="flex w-full items-center gap-4 rounded-[20px] p-4 text-left transition-colors {step === i ? 'glass' : 'hover:bg-white/[.04]'}" onclick={() => (step = i)}>
								<span class="grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold transition-colors {step === i ? 'bg-accent text-accent-ink' : 'bg-white/10'}">{i + 1}</span>
								<span><b class="block font-medium">{s.t}</b><span class="text-sm text-white/55">{s.d}</span></span>
							</button>
						</li>
					{/each}
				</ol>
			</div>

			<div class="relative mx-auto aspect-square w-[calc(100%-4.5rem)] max-w-[520px]" use:reveal={{ delay: 200 }}>
				<svg viewBox="0 0 400 400" class="absolute inset-0 size-full" aria-hidden="true">
					<circle cx="200" cy="200" r="160" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="1" />
					<circle cx="200" cy="200" r="160" fill="none" stroke="#C6F432" stroke-width="2" stroke-linecap="round" pathLength="100" stroke-dasharray="25 75" class="transition-[stroke-dashoffset] duration-700 ease-[cubic-bezier(.2,.75,.15,1)]" style="stroke-dashoffset:{12.5 - step * 25};transform:rotate(-90deg);transform-origin:200px 200px" />
					<circle cx="200" cy="200" r="110" fill="none" stroke="rgba(255,255,255,.06)" stroke-dasharray="2 6" />
				</svg>
				{#each loop as s, i (s.t)}
					{@const rad = (s.a * Math.PI) / 180}
					<button class="absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-500 {step === i ? 'scale-110 bg-accent text-accent-ink shadow-[0_0_40px_-6px_rgba(198,244,50,.9)]' : 'glass text-white/80'}" style="left:{50 + Math.cos(rad) * 40}%;top:{50 + Math.sin(rad) * 40}%" onclick={() => (step = i)}>{s.t}</button>
				{/each}
				<div class="absolute inset-[26%] grid place-items-center text-center">
					{#key step}
						<p class="text-[clamp(18px,2.2vw,24px)] leading-snug [animation:fade-up_.5s_var(--ease-out)_both]">
							{#if step === 0}Undercut finds each client’s <em class="font-serif text-accent">Google</em> properties.
							{:else if step === 1}Every <em class="font-serif text-accent">form, call</em> and WhatsApp is counted.
							{:else if step === 2}Problems come with a <em class="font-serif text-accent">button</em>, not a ticket.
							{:else}Clients get a report they <em class="font-serif text-accent">actually read.</em>{/if}
						</p>
					{/key}
				</div>
			</div>
		</div>
	</section>

	<!-- ================= MANIFESTO ================= -->
	<section id="manifesto" class="mx-auto max-w-[1240px] px-4 py-28 sm:px-6 sm:py-40">
		<div class="grid gap-14 lg:grid-cols-[1fr_1.4fr]">
			<div class="lg:sticky lg:top-32 lg:self-start">
				<p class="label text-accent!" use:reveal>The manifesto</p>
				<SplitText text={'We cut everything\nthat doesn’t\n*make you money.*'} class="mt-4 text-[clamp(40px,5.4vw,68px)] leading-[0.98] font-medium tracking-[-0.04em]" emClass="font-serif font-normal text-accent" />
				<p class="mt-6 max-w-sm text-white/60" use:reveal={{ delay: 200 }}>Analytics became a hobby: hundreds of reports, events to plan, a consultant to read them. Agencies don’t need more data. They need to know what to do on Monday.</p>
			</div>
			<ul class="flex flex-col">
				{#each cuts as c, i (c)}
					<li class="relative border-t border-white/10 py-4 sm:py-6" use:scrub={{ start: 0.85, end: 0.55 }}>
						<span class="flex items-baseline gap-4">
							<span class="w-8 text-xs text-white/40 tabular-nums">0{i + 1}</span>
							<span class="relative inline-block">
								<span class="shout text-[clamp(26px,6vw,60px)] whitespace-nowrap" style="opacity:calc(1 - var(--p,0) * .75)">{c}</span>
								<span class="absolute top-[52%] -right-[2%] -left-[2%] h-[0.16em] origin-left rounded-full bg-accent text-[clamp(26px,6vw,60px)] shadow-[0_0_24px_rgba(198,244,50,.7)]" style="transform:scaleX(var(--p,0)) rotate(-2deg)" aria-hidden="true"></span>
							</span>
						</span>
					</li>
				{/each}
				<li class="border-t border-white/10 pt-8" use:reveal>
					<p class="flex items-baseline gap-4"><span class="w-8 text-xs text-white/40">→</span><span class="text-[44px] leading-none font-medium tracking-[-0.04em] sm:text-[88px]">What’s left: <em class="grad-text font-serif font-normal">answers.</em></span></p>
				</li>
			</ul>
		</div>
	</section>

	<!-- ================= STATEMENT ================= -->
	<section class="relative h-[200vh]" use:scrub={{ start: 0, end: 1 }}>
		<div class="sticky top-0 flex h-dvh items-center">
			<p class="lit mx-auto max-w-5xl px-5 text-center text-[clamp(30px,4.8vw,62px)] leading-[1.1] font-medium tracking-[-0.035em]" style="--n:{lit.length}">
				{#each lit as w, i (i)}<span style="--i:{i}" class={w.hi ? 'font-serif font-normal text-accent italic' : ''}>{w.t}</span>{' '}{/each}
			</p>
		</div>
	</section>

	<!-- ================= FEATURES ================= -->
	<section id="features" class="mx-auto max-w-[1240px] scroll-mt-24 px-4 py-28 sm:px-6 sm:py-40">
		<div class="flex flex-wrap items-end justify-between gap-6">
			<SplitText text={'Everything you need.\n*Nothing you don’t.*'} class="text-[clamp(40px,6vw,80px)] leading-none font-medium tracking-[-0.04em]" emClass="font-serif font-normal text-white/50" />
			<p class="max-w-xs text-white/60" use:reveal={{ delay: 300 }}>No setup per client. Every problem comes with a button.</p>
		</div>

		<div class="mt-16 grid grid-cols-1 gap-3 md:grid-cols-6" use:reveal>
			<article class="feat group flex flex-col justify-between gap-8 md:col-span-2 md:row-span-2" data-stagger use:inview>
				<div>
					<span class="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-ink">Zero setup</span>
					<h3 class="mt-4 text-[32px] leading-tight font-medium tracking-[-0.03em]">Leads, not pageviews.</h3>
					<p class="mt-2 text-sm text-white/60">Forms, calls, emails, WhatsApp — counted automatically and credited to the channel that brought them.</p>
				</div>
				<div>
					<p class="big grad-text text-[72px] leading-none" use:countUp={{ to: 46 }}>46</p>
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

			<article class="feat feat-lime group flex flex-col gap-5 md:col-span-4" data-stagger use:inview>
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div><span class="rounded-full bg-ink/10 px-2.5 py-1 text-[11px] font-medium">No guessing</span><h3 class="mt-4 text-[32px] leading-tight font-medium tracking-[-0.03em]">Why? In one sentence.</h3></div>
					<p class="max-w-xs text-sm opacity-70">Click any number that moved. Get the channel, page, device or country behind it.</p>
				</div>
				<div class="rounded-[20px] bg-white p-5 text-ink">
					<p class="text-lg leading-snug sm:text-xl"><span class="font-semibold text-bad">Leads ↓ 31%.</span> 71% of the drop comes from <span class="rounded-md bg-accent px-1">Google Search</span>, mostly on <span class="rounded-md bg-tile px-1">/services</span>, on <span class="rounded-md bg-tile px-1">mobile</span>.</p>
					<div class="mt-4 flex h-3 overflow-hidden rounded-full bg-tile">
						{#each [[71, 'bg-ink'], [18, 'bg-[#9bb93a]'], [11, 'bg-ink/20']] as [w, c], i (i)}<span class="h-full origin-left scale-x-0 transition-transform duration-1000 group-[.in]:scale-x-100 {c}" style="width:{w}%;transition-delay:{400 + i * 250}ms"></span>{/each}
					</div>
				</div>
			</article>

			<article class="feat group flex flex-col gap-5 md:col-span-2" data-stagger use:inview>
				<div><span class="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium">Auto-fix</span><h3 class="mt-4 text-[28px] leading-tight font-medium tracking-[-0.03em]">Fix it. Don’t ticket it.</h3></div>
				<div class="mt-auto rounded-[20px] bg-white/[.06] p-4">
					<p class="text-xs text-white/50">/services · description missing</p>
					<p class="mt-1 text-sm">“Kiné à Schaerbeek: rendez-vous en 48h, sport & dos…”</p>
					<div class="mt-3 flex items-center justify-between">
						<span class="relative h-7 w-12 rounded-full bg-white/15 transition-colors delay-700 duration-300 group-[.in]:bg-accent"><span class="absolute top-1 left-1 size-5 rounded-full bg-white transition-transform delay-700 duration-300 group-[.in]:translate-x-5 group-[.in]:bg-ink"></span></span>
						<span class="text-xs font-medium text-accent opacity-0 transition-opacity delay-1000 duration-300 group-[.in]:opacity-100">Live on the site ✓</span>
					</div>
				</div>
			</article>

			<article class="feat relative flex flex-col gap-5 overflow-hidden md:col-span-2" data-stagger>
				<div class="relative z-10"><span class="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium">Heatmaps</span><h3 class="mt-4 text-[28px] leading-tight font-medium tracking-[-0.03em]">See the rage.</h3><p class="mt-1 text-sm text-white/60">Clicks, scroll and rage clicks — on the real page.</p></div>
				<div class="relative mt-auto h-28 rounded-[18px] bg-white/[.06] p-3">
					<div class="h-2 w-1/2 rounded bg-white/15"></div>
					<div class="mt-2 h-2 w-3/4 rounded bg-white/10"></div>
					<div class="mt-4 h-8 w-24 rounded-full bg-white/15"></div>
					{#each [[30, 60, 70, 0], [70, 40, 50, 0.6], [55, 75, 36, 1.2]] as [x, yy, s, d], i (i)}
						<span class="absolute rounded-full bg-[radial-gradient(circle,#ff5a3c_0%,rgba(198,244,50,.6)_40%,transparent_70%)] [animation:floaty_3s_ease-in-out_infinite]" style="left:{x}%;top:{yy}%;width:{s}px;height:{s}px;translate:-50% -50%;animation-delay:{d}s"></span>
					{/each}
				</div>
			</article>

			<article class="feat group flex flex-col gap-5 md:col-span-3" data-stagger use:inview>
				<div><span class="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium">Slack & email</span><h3 class="mt-4 text-[28px] leading-tight font-medium tracking-[-0.03em]">Wake up to problems, not charts.</h3></div>
				<ul class="space-y-2">
					{#each [['🔻', 'Leads dropped 40%', 'Maison Lou · this week'], ['⛔', 'Site is down', 'Kiné Schaerbeek · 2 min ago'], ['⭐', 'New 1★ review to answer', 'Atelier Brut · Google Maps']] as [ico, t, s], i (t)}
						<li class="flex translate-x-6 items-center gap-3 rounded-[18px] bg-white/[.06] p-3 opacity-0 transition-all duration-700 group-[.in]:translate-x-0 group-[.in]:opacity-100" style="transition-delay:{300 + i * 180}ms">
							<span class="grid size-9 place-items-center rounded-full bg-white/10">{ico}</span>
							<div class="min-w-0"><p class="text-sm font-medium">{t}</p><p class="truncate text-xs text-white/50">{s}</p></div>
						</li>
					{/each}
				</ul>
			</article>

			<article class="feat group flex flex-col gap-5 md:col-span-3" data-stagger use:inview>
				<div><span class="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium">Checked daily</span><h3 class="mt-4 text-[28px] leading-tight font-medium tracking-[-0.03em]">Fast, findable, valid.</h3><p class="mt-1 text-sm text-white/60">Lighthouse mobile + desktop, SEO and W3C.</p></div>
				<div class="mt-auto grid grid-cols-4 gap-2">
					{@render ring(94, 'Speed', 0)}
					{@render ring(100, 'SEO', 1)}
					{@render ring(88, 'Access', 2)}
					{@render ring(97, 'W3C', 3)}
				</div>
			</article>

			<article class="feat flex flex-col gap-5 md:col-span-3" data-stagger>
				<div><span class="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium">Campaigns</span><h3 class="mt-4 text-[28px] leading-tight font-medium tracking-[-0.03em]">Which post brought the calls?</h3></div>
				<div class="mt-auto space-y-2">
					{#each [['Instagram · Black Friday', 9, 'forms'], ['Newsletter · November', 4, 'calls'], ['Meta Ads · Retargeting', 2, 'WhatsApps']] as [n, v, k] (n)}
						<div class="flex items-center justify-between rounded-[16px] bg-white/[.06] px-4 py-3 text-sm"><span>{n}</span><span class="text-white/60"><b class="text-accent">{v}</b> {k}</span></div>
					{/each}
				</div>
			</article>

			<article class="feat flex flex-col gap-5 md:col-span-3" data-stagger>
				<div><span class="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium">White-label</span><h3 class="mt-4 text-[28px] leading-tight font-medium tracking-[-0.03em]">Reports clients actually read.</h3></div>
				<div class="mt-auto flex items-center gap-4 rounded-[20px] bg-white p-4 text-ink">
					<span class="grid size-12 shrink-0 place-items-center rounded-2xl border-2 border-dashed border-ink/20 text-[10px] text-muted">your logo</span>
					<div class="min-w-0 flex-1"><p class="text-sm font-medium">October for Maison Lou</p><p class="truncate text-xs text-muted">38 leads (+12) · fastest month yet · 4 fixes done</p></div>
					<span class="rounded-full bg-ink px-3 py-1.5 text-xs text-white">PDF</span>
				</div>
			</article>
		</div>
	</section>

	<!-- ================= STATS ================= -->
	<section class="mx-auto max-w-[1240px] px-4 pb-28 sm:px-6 sm:pb-40">
		<div class="grad-border rounded-[36px] p-px">
			<div class="relative grid gap-12 overflow-hidden rounded-[35px] bg-[radial-gradient(120%_120%_at_0%_100%,rgba(198,244,50,.22),transparent_55%),#0b0c0a] p-8 sm:p-14 lg:grid-cols-[1.2fr_1fr]">
				<div class="relative">
					<SplitText text={'Built for agencies\nrunning *20 sites.*\nNot one.'} class="text-[clamp(36px,5vw,64px)] leading-[1] font-medium tracking-[-0.04em]" emClass="font-serif font-normal text-accent" />
					<p class="mt-6 max-w-md text-white/60" use:reveal={{ delay: 300 }}>One screen for every client. The ones that need you are on top — with the reason, in one sentence.</p>
				</div>
				<div class="relative grid grid-cols-2 gap-x-6 gap-y-10 self-center" use:reveal>
					{#each [[10, ' min', 'to connect a client'], [0, '', 'events to set up'], [1, ' click', 'to ship a fix'], [50, '', 'clients on one screen']] as [n, s, l], i (l)}
						<div class="border-t border-white/15 pt-5" data-stagger>
							<p class="big text-[44px] leading-none whitespace-nowrap sm:text-[60px]" use:countUp={{ to: n as number, suffix: s as string, ms: 1200 + i * 200 }}>{n}{s}</p>
							<p class="mt-2 text-sm text-white/50">{l}</p>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- ================= PRICING ================= -->
	<section id="pricing" class="mx-auto max-w-[1240px] scroll-mt-24 px-4 py-28 sm:px-6 sm:py-36">
		<div class="text-center">
			<SplitText text={'Per client.\n*Not per pageview.*'} class="text-[clamp(44px,6.6vw,88px)] leading-none font-medium tracking-[-0.045em]" emClass="font-serif font-normal text-accent" />
			<p class="mt-5 text-white/60" use:reveal={{ delay: 200 }}>Traffic is good news. It shouldn’t be a bill. <b class="font-medium text-white">Free for the first 30 agencies</b> during the beta.</p>
		</div>
		<div class="mt-16 grid gap-3 md:grid-cols-3" use:reveal>
			{#each ['freelance', 'agency', 'studio'] as const as id (id)}
				{@const p = PLANS[id]}
				<div class="relative flex flex-col gap-4 overflow-hidden rounded-[28px] p-8 transition-transform duration-500 hover:-translate-y-1.5 {id === 'agency' ? 'bg-[linear-gradient(160deg,#C6F432,#86bd2c)] text-accent-ink' : 'glass'}" data-stagger>
					<div class="relative flex items-center justify-between"><p class="font-medium">{p.name}</p>{#if id === 'agency'}<span class="rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-semibold text-accent">Most popular</span>{/if}</div>
					<p class="relative"><span class="big text-[64px]">€{p.price}</span><span class="text-sm opacity-60"> / month after the beta</span></p>
					<p class="relative text-sm opacity-70">Up to {p.clients} clients · all features{id === 'freelance' ? '' : id === 'agency' ? ' · team & client logins · white-label' : ' · own report domain · priority support'}</p>
					<a href="/beta" class="btn relative mt-auto {id === 'agency' ? 'btn-primary' : 'btn-accent'}">Free during the beta</a>
				</div>
			{/each}
		</div>
	</section>

	<!-- ================= FAQ ================= -->
	<section id="faq" class="mx-auto max-w-3xl scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
		<SplitText text="Straight *answers.*" class="text-center text-[clamp(40px,5.6vw,68px)] leading-none font-medium tracking-[-0.04em]" emClass="font-serif font-normal text-accent" />
		<ul class="mt-12 space-y-2" use:reveal>
			{#each faqs as f, i (f.q)}
				<li class="glass overflow-hidden rounded-[22px]" data-stagger>
					<button class="flex w-full items-center justify-between gap-4 p-5 text-left font-medium" onclick={() => (open = open === i ? null : i)} aria-expanded={open === i}>
						{f.q}<span class="grid size-8 shrink-0 place-items-center rounded-full text-lg transition-transform duration-300 {open === i ? 'rotate-45 bg-accent text-accent-ink' : 'bg-white/10'}">+</span>
					</button>
					{#if open === i}<p class="px-5 pb-5 text-sm text-white/60" transition:slide={{ duration: 300 }}>{f.a}</p>{/if}
				</li>
			{/each}
		</ul>
	</section>

	<!-- ================= FINAL CTA ================= -->
	<section class="px-3 pt-10 pb-3 sm:px-5">
		<div class="relative isolate overflow-hidden rounded-[36px] px-6 py-28 text-center sm:rounded-[44px] sm:py-44">
			<div class="absolute inset-0 -z-10 bg-[radial-gradient(70%_90%_at_50%_110%,#C6F432_0%,#5e8f1e_28%,#16210c_58%,#0b0c0a_80%)]"></div>
			<div class="grid-floor absolute inset-x-0 bottom-0 -z-10 h-full opacity-60"></div>
			<h2 class="text-[clamp(40px,7.5vw,104px)] leading-[0.95] font-medium tracking-[-0.045em]">
				<span class="relative inline-block" use:inview={{ delay: 200 }}>
					<SplitText as="span" class="block" text="Stop reporting." />
					<span class="cut-bar absolute top-[55%] -right-[2%] -left-[2%] h-[0.09em] rounded-full bg-accent shadow-[0_0_30px_rgba(198,244,50,.8)]" aria-hidden="true"></span>
				</span>
				<SplitText as="span" class="block" text="*Start fixing.*" emClass="font-serif font-normal" delay={300} />
			</h2>
			<div class="mt-12 flex flex-wrap justify-center gap-3" use:reveal={{ delay: 300 }}>
				<a href={cta.href} class="btn btn-primary group px-7 py-3.5 text-base">{cta.label}<span class="transition-transform group-hover:translate-x-1">→</span></a>
			</div>
			<p class="mt-5 text-xs text-white/70" use:reveal={{ delay: 400 }}>30 free seats · No card · Cookieless · Data in the EU</p>
		</div>
	</section>

	<!-- footer -->
	<footer class="overflow-hidden px-4 pt-12 sm:px-6">
		<div class="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 text-sm text-white/50">
			<Logo size={26} light />
			<nav class="flex gap-5"><a href="#loop" class="hover:text-white">How it works</a><a href="#pricing" class="hover:text-white">Pricing</a><a href="/login" class="hover:text-white">Log in</a></nav>
			<p>Made in Brussels · Cookieless · Data in the EU</p>
		</div>
		<div use:scrub={{ start: 1, end: 1 }} class="mx-auto max-w-[1240px]">
			<p class="grad-text-soft mt-8 text-center text-[24vw] leading-[0.78] font-semibold tracking-[-0.07em] select-none lg:text-[300px]" style="transform:translateY(calc((1 - var(--p,0)) * 40%))" aria-hidden="true">undercut</p>
		</div>
	</footer>
</div>

<style>
	.landing :global(.label) {
		color: rgba(255, 255, 255, 0.5);
	}
	.glass {
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.03));
		border: 1px solid rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(18px) saturate(140%);
		-webkit-backdrop-filter: blur(18px) saturate(140%);
	}
	.grad-border {
		background: linear-gradient(140deg, rgba(198, 244, 50, 0.65), rgba(255, 255, 255, 0.08) 35%, rgba(255, 255, 255, 0.04) 65%, rgba(198, 244, 50, 0.35));
	}
	.landing :global(.grad-text),
	.grad-text {
		background: linear-gradient(100deg, #ffffff 10%, #e9ffb0 45%, #c6f432 75%, #7fd14a);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
	.landing :global(.grad-text em) {
		color: transparent;
	}
	.grad-text-soft {
		background: linear-gradient(180deg, rgba(198, 244, 50, 0.9), rgba(198, 244, 50, 0.05) 85%);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
	.mesh {
		background:
			radial-gradient(closest-side, rgba(198, 244, 50, 0.35), transparent 70%),
			conic-gradient(from 200deg at 50% 50%, rgba(47, 158, 68, 0.35), rgba(198, 244, 50, 0.15), rgba(14, 165, 164, 0.18), rgba(47, 158, 68, 0.35));
		filter: blur(90px);
		opacity: 0.75;
		animation: mesh-spin 26s linear infinite;
	}
	.grid-floor {
		background-image:
			linear-gradient(rgba(198, 244, 50, 0.12) 1px, transparent 1px),
			linear-gradient(90deg, rgba(198, 244, 50, 0.12) 1px, transparent 1px);
		background-size: 64px 64px;
		mask-image: linear-gradient(to top, black, transparent 85%);
		-webkit-mask-image: linear-gradient(to top, black, transparent 85%);
		transform: perspective(600px) rotateX(55deg);
		transform-origin: bottom;
	}
	.noise {
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
	}
	.meridian {
		transform-box: fill-box;
		transform-origin: center;
		animation: spin-globe 24s linear infinite;
	}
	.arc {
		stroke-dasharray: 100;
		stroke-dashoffset: 100;
		filter: drop-shadow(0 0 6px rgba(198, 244, 50, 0.8));
		animation: draw-arc 2.2s cubic-bezier(0.2, 0.75, 0.15, 1) 0.9s forwards;
	}
	.pin {
		opacity: 0;
		animation: pop 0.5s ease-out forwards;
		filter: drop-shadow(0 0 8px #c6f432);
	}
	.pin-ring {
		opacity: 0;
		transform-box: fill-box;
		transform-origin: center;
		animation: ring 2.4s ease-out infinite;
	}
	.feat {
		min-width: 0;
		border-radius: 28px;
		padding: 1.75rem;
		background: linear-gradient(160deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.02));
		border: 1px solid rgba(255, 255, 255, 0.08);
	}
	.feat-lime {
		background: linear-gradient(150deg, #e4f5b8, #c6f432 60%, #9fd23a);
		color: var(--color-accent-ink);
		border-color: transparent;
	}
	@keyframes spin-globe {
		0% {
			transform: scaleX(1);
		}
		50% {
			transform: scaleX(-1);
		}
		100% {
			transform: scaleX(1);
		}
	}
	@keyframes mesh-spin {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes draw-arc {
		to {
			stroke-dashoffset: 0;
		}
	}
	@keyframes pop {
		from {
			opacity: 0;
			r: 0;
		}
		to {
			opacity: 1;
		}
	}
	@keyframes ring {
		0% {
			opacity: 0.8;
			transform: scale(0.4);
		}
		100% {
			opacity: 0;
			transform: scale(1.6);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.meridian,
		.mesh,
		.pin-ring {
			animation: none;
		}
		.arc {
			animation: none;
			stroke-dashoffset: 0;
		}
		.pin {
			animation: none;
			opacity: 1;
		}
	}
</style>
