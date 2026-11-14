<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	import { PLANS } from '#lib/plans.ts';
	let { data } = $props();
	let open = $state<number | null>(0);
	let menu = $state(false);

	const features = [
		{ t: 'Leads by channel', d: 'Forms, calls, emails and WhatsApp counted automatically — and credited to Google, Maps, ads or social. No events to set up.', tag: 'Zero setup' },
		{ t: 'Why did it change?', d: 'One click on any number that moved: which channel, page, device or country caused it, in one sentence.', tag: 'No guessing' },
		{ t: 'Fix it here', d: 'Titles, descriptions, image texts, structured data: Undercut writes the fix, you approve, it goes live. No CMS, no developer.', tag: 'Auto-fix' },
		{ t: 'SEO, Lighthouse & W3C', d: 'Your client’s site checked every day — mobile and desktop speed, HTML errors, console errors. Every problem has a button.', tag: 'Daily' },
		{ t: 'Heatmaps', d: 'See where visitors click, scroll and rage-click, drawn on the real page. Cookieless.', tag: 'Like Hotjar' },
		{ t: 'Alerts, not dashboards', d: 'A message when leads drop, the site goes down or a review needs a reply. A summary every Monday.', tag: 'Slack & email' },
		{ t: 'Client reports', d: 'A one-page report in plain words, with your agency’s name. Send the link or a PDF.', tag: 'White-label' },
		{ t: 'Website + app', d: 'App users, retention, crashes and store reviews next to the website — one place per client.', tag: 'Firebase · App Store' }
	];
	const steps = [
		{ n: '1', t: 'Connect Google', d: 'One login gives access to Analytics, Search Console, Business Profile and Tag Manager for every client. We match the properties for you.' },
		{ n: '2', t: 'Paste one line', d: 'The Undercut snippet counts leads, draws heatmaps and publishes fixes. WordPress, Webflow, Wix, Shopify or Tag Manager — 2 minutes.' },
		{ n: '3', t: 'Get your Monday list', d: 'Every client gets a health score and a short list of what to fix — most of it in one click.' }
	];
	const faqs = [
		{ q: 'Do I still need Google Analytics?', a: 'No. Undercut reads GA4 if your clients have it, but the snippet alone counts visits, sources, landing pages and leads — cookieless, so many clients can drop GA4 and the cookie banner.' },
		{ q: 'Is it GDPR-friendly?', a: 'The snippet sets no cookies, stores no IP address and never records what people type in forms. Fonts are self-hosted. Data is hosted in the EU.' },
		{ q: 'How do “fixes” go live without touching the CMS?', a: 'Approved fixes (titles, descriptions, image texts, structured data) are applied by the snippet when the page loads, and Google reads them. For a permanent fix each one also comes with the code for the CMS.' },
		{ q: 'Is pricing per website or per pageview?', a: 'Per client. Traffic does not change your bill — a client with 500k pageviews costs the same as one with 5k.' },
		{ q: 'Can my clients log in?', a: 'Yes, on the Agency plan: invite a client and they only see their own dashboard and report.' },
		{ q: 'Does it work for apps?', a: 'Yes. Link the app’s Firebase project to GA4 and add the App Store ID: users, retention, crashes and reviews appear next to the website.' }
	];
	const cta = $derived(data.hasWorkspace ? { href: '/app', label: 'Open the app' } : { href: '/signup', label: 'Start free — 14 days' });
</script>

<svelte:head>
	<title>Undercut — analytics your clients actually understand</title>
	<meta name="description" content="Analytics for agencies: leads by channel, why numbers changed, SEO fixes in one click, heatmaps, alerts and white-label reports — for every client, in plain words." />
</svelte:head>

<div class="min-h-dvh overflow-x-clip bg-paper">
	<!-- nav -->
	<header class="sticky top-0 z-40 border-b border-transparent bg-paper/85 backdrop-blur">
		<div class="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
			<a href="/"><Logo /></a>
			<nav class="hidden items-center gap-1 rounded-full bg-white p-1.5 text-sm md:flex">
				<a href="#features" class="rounded-full px-4 py-2 hover:bg-tile">Features</a>
				<a href="#how" class="rounded-full px-4 py-2 hover:bg-tile">How it works</a>
				<a href="#pricing" class="rounded-full px-4 py-2 hover:bg-tile">Pricing</a>
				<a href="#faq" class="rounded-full px-4 py-2 hover:bg-tile">FAQ</a>
			</nav>
			<div class="flex items-center gap-2">
				<a href="/app" class="hidden px-3 text-sm sm:block">Log in</a>
				<a href={cta.href} class="btn btn-primary">{data.hasWorkspace ? 'Open app' : 'Start free'}</a>
				<button class="icon-btn md:hidden" onclick={() => (menu = !menu)} aria-label="Menu" aria-expanded={menu}>☰</button>
			</div>
		</div>
		{#if menu}
			<nav class="mx-4 mb-3 grid gap-1 rounded-[20px] bg-white p-2 text-sm md:hidden">
				{#each [['#features', 'Features'], ['#how', 'How it works'], ['#pricing', 'Pricing'], ['#faq', 'FAQ'], ['/app', 'Log in']] as [h, l] (h)}<a href={h} class="rounded-xl px-3 py-2.5 hover:bg-tile" onclick={() => (menu = false)}>{l}</a>{/each}
			</nav>
		{/if}
	</header>

	<!-- hero -->
	<section class="mx-auto max-w-[1200px] px-4 pt-10 pb-16 sm:px-6 sm:pt-16">
		<div class="mx-auto max-w-4xl text-center">
			<p class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium"><span class="size-1.5 rounded-full bg-good"></span>For web, communication & AI agencies</p>
			<h1 class="display mt-6 text-[56px] leading-[0.95] sm:text-[96px]">Analytics your clients <em>actually</em> understand.</h1>
			<p class="mx-auto mt-6 max-w-2xl text-lg text-ink-2">Where leads come from, why numbers moved, and what to fix this week — for every client, in plain words. Most fixes take one click.</p>
			<div class="mt-8 flex flex-wrap justify-center gap-3">
				<a href={cta.href} class="btn btn-primary px-6 py-3 text-base">{cta.label} →</a>
				<a href="/app" class="btn btn-ghost px-6 py-3 text-base">See the demo</a>
			</div>
			<p class="mt-4 text-xs text-muted">No card · Connect Google in 1 click · Cookieless & GDPR-friendly</p>
		</div>

		<!-- product preview -->
		<div class="relative mx-auto mt-14 max-w-5xl">
			<div class="absolute -top-10 right-0 sm:-right-10 -z-0 size-64 rounded-full bg-accent/70 blur-3xl"></div>
			<div class="relative rounded-[32px] bg-white p-3 shadow-[0_40px_120px_-40px_rgba(0,0,0,.35)] sm:p-5">
				<div class="grid gap-3 lg:grid-cols-[1fr_2fr]">
					<div class="card-dark flex flex-col justify-between gap-6 p-6">
						<div class="flex items-center justify-between"><p class="text-sm text-white/60">Kiné Schaerbeek</p><span class="grid size-14 place-items-center rounded-full border-[6px] border-accent text-sm font-medium">72</span></div>
						<p class="display text-[26px] leading-tight">Leads down 31%. 71% of the drop comes from Google Search, mostly on /services, on mobile.</p>
					</div>
					<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
						{#each [['Leads', '46', '↓31%', 'bad'], ['Visits', '3,501', '↓13%', 'bad'], ['Google', '#14.3', '↑0.5', 'warn'], ['SEO health', '81', '', 'good'], ['Maps', '177', '↑6%', 'good'], ['Behaviour', '52%', '', 'warn']] as [l, v, d, s] (l)}
							<div class="rounded-[22px] bg-tile p-4">
								<p class="flex items-center justify-between text-xs"><span>{l}</span><span class="size-1.5 rounded-full {s === 'good' ? 'bg-good' : s === 'warn' ? 'bg-[#E3A21A]' : 'bg-bad'}"></span></p>
								<p class="mt-3 flex items-start gap-1"><span class="big text-[32px]">{v}</span>{#if d}<span class="rounded-full px-1.5 text-[10px] {d.startsWith('↓') ? 'bg-bad-bg text-bad' : 'bg-good-bg text-good'}">{d}</span>{/if}</p>
							</div>
						{/each}
					</div>
				</div>
				<ul class="mt-3 divide-y divide-line rounded-[22px] bg-tile/60">
					{#each [['3 pages without a description', 'Fix'], ['Rage clicks on “Card · Service 1”', 'How to fix'], ['Quick win: “kiné près de moi”', 'Fix']] as [t, b] (t)}
						<li class="flex items-center gap-3 px-4 py-3 text-sm">
							<span class="size-2 rounded-full {b === 'Fix' ? 'bg-[#E3A21A]' : 'bg-bad'}"></span><span class="flex-1 truncate">{t}</span>
							<span class="rounded-full px-3 py-1 text-xs font-medium {b === 'Fix' ? 'bg-accent text-accent-ink' : 'border border-line bg-white'}">{b === 'Fix' ? '⚡ Fix' : b}</span>
						</li>
					{/each}
				</ul>
			</div>
		</div>

		<div class="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted">
			<span>Works with</span>
			{#each ['Google Analytics 4', 'Search Console', 'Business Profile', 'Tag Manager', 'Firebase', 'App Store', 'WordPress', 'Webflow', 'Shopify'] as w (w)}<span class="font-medium text-ink-2">{w}</span>{/each}
		</div>
	</section>

	<!-- the questions -->
	<section class="bg-ink py-20 text-white">
		<div class="mx-auto max-w-[1200px] px-4 sm:px-6">
			<p class="label text-white/50!">Not more dashboards</p>
			<h2 class="display mt-3 max-w-3xl text-[44px] leading-none sm:text-[68px]">Three questions. <em class="text-accent">Every</em> client. Every week.</h2>
			<div class="mt-12 grid gap-4 md:grid-cols-3">
				{#each [['Where do good leads come from?', 'Forms, calls, emails and WhatsApp per channel and landing page — not just visits.'], ['What stops people from contacting?', 'Slow pages, broken forms, rage clicks, pages that get visits but no leads.'], ['What do we fix this week?', 'A short list per client. ⚡ Fix publishes it, How to fix explains it, ✓ ticks it off.']] as [q, a], i (q)}
					<div class="rounded-[28px] bg-white/[.06] p-6">
						<p class="big text-[56px] text-accent">0{i + 1}</p>
						<h3 class="display mt-4 text-[30px] leading-tight">{q}</h3>
						<p class="mt-3 text-sm text-white/60">{a}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- features -->
	<section id="features" class="mx-auto max-w-[1200px] scroll-mt-20 px-4 py-20 sm:px-6">
		<h2 class="display max-w-3xl text-[44px] leading-none sm:text-[68px]">Everything an agency <em>checks</em> — in one place.</h2>
		<div class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{#each features as f, i (f.t)}
				<article class="flex flex-col gap-3 p-6 {i === 2 ? 'card-dark' : i === 0 ? 'rounded-[28px] bg-[#E4F5B8]' : 'card'}">
					<span class="self-start rounded-full px-2.5 py-1 text-[11px] font-medium {i === 2 ? 'bg-accent text-accent-ink' : 'bg-white/70'} {i !== 0 && i !== 2 ? 'bg-tile!' : ''}">{f.tag}</span>
					<h3 class="display text-[28px] leading-tight">{f.t}</h3>
					<p class="text-sm {i === 2 ? 'text-white/60' : 'text-ink-2'}">{f.d}</p>
				</article>
			{/each}
		</div>
	</section>

	<!-- how it works -->
	<section id="how" class="mx-auto max-w-[1200px] scroll-mt-20 px-4 pb-20 sm:px-6">
		<div class="card grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_1.4fr]">
			<div>
				<p class="label">How it works</p>
				<h2 class="display mt-3 text-[44px] leading-none sm:text-[56px]">Connected in <em>10 minutes</em>.</h2>
				<p class="mt-4 text-ink-2">No events to configure, no tags to plan. Undercut matches each client to their Google properties and starts counting leads as soon as the line is on the site.</p>
				<a href={cta.href} class="btn btn-primary mt-6">{cta.label} →</a>
			</div>
			<ol class="grid gap-3">
				{#each steps as s (s.n)}
					<li class="flex gap-4 rounded-[22px] bg-tile p-5">
						<span class="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-lg text-accent">{s.n}</span>
						<div><h3 class="font-medium">{s.t}</h3><p class="mt-1 text-sm text-ink-2">{s.d}</p></div>
					</li>
				{/each}
				<li class="rounded-[22px] bg-ink p-5 font-mono text-[13px] text-accent">&lt;script defer src="https://app.undercut.be/u.js" data-site="your-client"&gt;&lt;/script&gt;</li>
			</ol>
		</div>
	</section>

	<!-- comparison -->
	<section class="mx-auto max-w-[1200px] px-4 pb-20 sm:px-6">
		<h2 class="display text-[40px] leading-none sm:text-[56px]">Why not just…</h2>
		<div class="card mt-8 overflow-x-auto p-2 sm:p-4">
			<table class="w-full min-w-[640px] text-sm">
				<thead><tr class="text-left text-xs text-muted"><th class="p-3 font-medium"></th><th class="p-3 font-medium">GA4</th><th class="p-3 font-medium">Plausible / Fathom</th><th class="p-3 font-medium">Agency dashboards</th><th class="rounded-t-[16px] bg-ink p-3 font-medium text-white">Undercut</th></tr></thead>
				<tbody>
					{#each [['A client can read it alone', '✕', '✓', '~', '✓'], ['Leads by channel without setting up events', '✕', '~', '✕', '✓'], ['Says why a number changed', '✕', '✕', '✕', '✓'], ['Fixes SEO problems for you', '✕', '✕', '✕', '✓'], ['Heatmaps + SEO audit included', '✕', '✕', '~', '✓'], ['Price per client, not per pageview', '—', '✕', '✓', '✓'], ['Cookieless', '✕', '✓', '—', '✓']] as row, i (i)}
						<tr class="border-t border-line">
							<td class="p-3 font-medium">{row[0]}</td>
							{#each row.slice(1) as c, j (j)}<td class="p-3 {j === 3 ? 'bg-ink text-accent' : c === '✓' ? 'text-good' : 'text-muted'} {j === 3 && i === 6 ? 'rounded-b-[16px]' : ''}">{c}</td>{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<!-- pricing -->
	<section id="pricing" class="mx-auto max-w-[1200px] scroll-mt-20 px-4 pb-20 sm:px-6">
		<div class="text-center">
			<h2 class="display text-[44px] leading-none sm:text-[68px]">Priced per <em>client</em>.</h2>
			<p class="mt-3 text-ink-2">Not per pageview. 14 days free, no card.</p>
		</div>
		<div class="mt-10 grid gap-4 md:grid-cols-3">
			{#each (['freelance', 'agency', 'studio'] as const) as id (id)}
				{@const p = PLANS[id]}
				<div class="flex flex-col gap-4 p-7 {id === 'agency' ? 'card-dark' : 'card'}">
					<div class="flex items-center justify-between"><p class="font-medium">{p.name}</p>{#if id === 'agency'}<span class="rounded-full bg-accent px-2.5 py-0.5 text-[11px] text-accent-ink">Most popular</span>{/if}</div>
					<p><span class="big text-[60px]">€{p.price}</span><span class="text-sm opacity-60"> / month</span></p>
					<p class="text-sm opacity-70">Up to {p.clients} clients · all features{id === 'freelance' ? '' : id === 'agency' ? ' · team & client logins · white-label' : ' · own report domain · priority support'}</p>
					<a href="/signup?plan={id}" class="btn mt-auto {id === 'agency' ? 'btn-accent' : 'btn-primary'}">Start free</a>
				</div>
			{/each}
		</div>
	</section>

	<!-- faq -->
	<section id="faq" class="mx-auto max-w-3xl scroll-mt-20 px-4 pb-20 sm:px-6">
		<h2 class="display text-center text-[44px] leading-none sm:text-[56px]">Questions</h2>
		<ul class="mt-8 space-y-2">
			{#each faqs as f, i (f.q)}
				<li class="card overflow-hidden">
					<button class="flex w-full items-center justify-between gap-4 p-5 text-left font-medium" onclick={() => (open = open === i ? null : i)} aria-expanded={open === i}>{f.q}<span class="text-xl text-muted">{open === i ? '−' : '+'}</span></button>
					{#if open === i}<p class="px-5 pb-5 text-sm text-ink-2">{f.a}</p>{/if}
				</li>
			{/each}
		</ul>
	</section>

	<!-- final cta -->
	<section class="mx-auto max-w-[1200px] px-4 pb-10 sm:px-6">
		<div class="card-dark relative overflow-hidden p-8 text-center sm:p-16">
			<div class="pointer-events-none absolute -bottom-24 left-1/2 size-80 -translate-x-1/2 rounded-full bg-accent/80 blur-3xl"></div>
			<h2 class="display relative text-[48px] leading-none sm:text-[80px]">Stop sending <em>dashboards</em>.<br />Send answers.</h2>
			<a href={cta.href} class="btn btn-accent relative mt-8 px-7 py-3 text-base">{cta.label} →</a>
		</div>
	</section>

	<footer class="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:px-6">
		<Logo size={24} />
		<p>Made in Brussels · Cookieless · Data in the EU</p>
	</footer>
</div>
