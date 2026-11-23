<script lang="ts">
	import { slide } from 'svelte/transition';
	import Logo from '#lib/components/Logo.svelte';
	import SplitText from '#lib/components/SplitText.svelte';
	import SplitChars from '#lib/components/SplitChars.svelte';
	import DotGlobe from '#lib/components/DotGlobe.svelte';
	import CutText from '#lib/components/CutText.svelte';
	import { reveal, inview, pointer, scrub, countUp, spotlight, nightZone } from '#lib/motion.ts';
	import { PLANS } from '#lib/plans.ts';
	import { themeStyle } from '#lib/theme.ts';

	let open = $state<number | null>(0);
	let menu = $state(false);
	let y = $state(0);
	let going = $state(false);

	// lock the page behind the mobile menu
	$effect(() => {
		document.documentElement.style.overflow = menu ? 'hidden' : '';
		return () => (document.documentElement.style.overflow = '');
	});
	// sliding highlight under the hovered link
	let ind = $state({ x: 0, w: 0, on: false });
	const over = (e: PointerEvent) => {
		const a = e.currentTarget as HTMLElement;
		ind = { x: a.offsetLeft, w: a.offsetWidth, on: true };
	};

	const bars = [3, 5, 4, 7, 6, 9, 8, 11, 10, 13];
	const steps = [
		{ n: '01', t: 'Paste your URL', d: 'Your site or your Instagram. We read what you sell, where you work, in which language.', k: 'READING youragency.com' },
		{ n: '02', t: 'Get businesses that need you', d: 'Real businesses around you. Their website checked (mobile, speed, https, socials) and their Google reviews read: what their own customers complain about.', k: 'CHECKING businesses near you' },
		{ n: '03', t: 'Approve the message', d: 'Written in their language (French, Dutch or English) from what we found. One business at a time: read it, change it, send it from your own email.', k: 'WRITING message 1/5' },
		{ n: '04', t: 'Follow up, then sign', d: 'No answer after 4 days? The follow-up is written for you. After two, Undercut stops. When they reply, it’s your turn.', k: 'FOLLOWING UP 2 businesses' }
	];
	const scans = [
		'lumenhair.com · mobile ✕ · https ✕ · score 90',
		'corner bakery · no website · score 70',
		'harperlaw.com · last update 2019 · score 55',
		'olive-kitchen.com · 4.8 s on mobile · score 48',
		'brut-studio.com · no instagram · score 40',
		'maison lenoir · “wrong opening hours on Google” · score 75',
		'salon iris · replied “oui, envoyez-moi les idées”'
	];
	const statement =
		'You started an agency to make [great work] — not to chase clients across ten tabs. Undercut finds the businesses that need you, writes the first message and tells you when to follow up. You create. [We bring the work.]';
	const lit = (() => {
		let on = false;
		return statement.split(' ').map((raw) => {
			if (raw.startsWith('[')) on = true;
			const w = { t: raw.replace(/[[\]]/g, ''), hi: on };
			if (raw.includes(']')) on = false;
			return w;
		});
	})();
	const jobs = [
		{ k: 'Find', t: 'Finds the businesses', d: 'Local businesses that need what you sell: no website, a slow site, no Instagram, or customers complaining on Google about things you fix.' },
		{ k: 'Write', t: 'Writes to them', d: 'A first message in their language, around one real problem, with an easy yes. You read it and send it yourself.' },
		{ k: 'Follow up', t: 'Reminds you to follow up', d: 'Follow-ups written and due at the right time. When someone replies, they move to your turn. Nothing to set up.' }
	];
	const faqs = [
		{ q: 'Where do the prospects come from?', a: 'Real local businesses from OpenStreetMap, around the city you work in. Undercut visits each website — mobile, speed, https, last update, Instagram — reads their Google reviews, and only keeps the ones that need what you sell.' },
		{ q: 'Why would they answer?', a: 'Because the message talks about one real problem they have (often what their own customers wrote on Google), in their language, and asks for an easy “yes” to 3 free ideas. No video call to book.' },
		{ q: 'Do you send the messages for me?', a: 'Undercut writes every message and puts it in “To approve”. You read it, change it if you want and send it from your own email or as a DM in one click. No spam, no new domain to warm up, nothing goes out without you.' },
		{ q: 'Why not use a free agent like Harvey?', a: 'Harvey is great if you can install it: a paid Claude plan, Python, the terminal, a second domain and weeks of mailbox warm-up. Undercut works in two minutes from your browser or phone, in French, Dutch or English, and reminds you to follow up.' },
		{ q: 'Is it legal to contact these businesses?', a: 'Undercut only uses public business data (OpenStreetMap). You send a few personal messages yourself, and every first message says how to opt out. You stay responsible for what you send.' },
		{ q: 'What if my agency is only on Instagram?', a: 'Paste the Instagram link and tell us your city and what you sell. That’s enough to start.' },
		{ q: 'Is it only for web agencies?', a: 'No. Websites, social media, SEO, ads, branding, apps, photo and video: Undercut looks for the problem your service fixes and writes about that.' },
		{ q: 'Where is my data?', a: 'In the EU. Undercut only uses public business information and never sends anything without your click.' }
	];
	const nav = [
		['#how', 'How it works'],
		['/prospects', 'Free tool'],
		['#features', 'Features'],
		['#pricing', 'Pricing'],
		['#faq', 'FAQ']
	];
	const chips = [
		{ n: 'Lumen Hair Studio', w: 'not mobile · no https', s: 90, x: '2%', y: '20%', d: 0 },
		{ n: 'Corner Bakery', w: 'no website', s: 70, x: '56%', y: '6%', d: -2 },
		{ n: 'Harper Law', w: 'last update 2019', s: 55, x: '50%', y: '72%', d: -4 }
	];
	const notes = [
		{ t: 'Businesses that need you, found every week', x: '22%', y: '-2%' },
		{ t: 'Who replied, who signed', x: '74%', y: '56%' },
		{ t: 'Follow-ups, written for you', x: '58%', y: '97%' }
	];
</script>

<svelte:window bind:scrollY={y} />
<svelte:head>
	<title>Undercut — your next clients, found for you</title>
	<meta name="description" content="Paste your agency’s URL. Undercut finds local businesses that need what you sell, writes the first message in their language and reminds you to follow up. You just approve." />
	<meta name="theme-color" content="#ECECEA" />
</svelte:head>


{#snippet urlForm(id: string)}
	<form method="POST" action="/prospects" class="w-full max-w-xl" onsubmit={() => (going = true)}>
		<div class="card flex flex-col gap-2 rounded-[22px]! p-1.5 focus-within:shadow-[0_0_0_2px_rgba(13,13,13,.25)] sm:flex-row">
			<label class="sr-only" for={id}>Your agency’s website, Instagram, TikTok or LinkedIn</label>
			<input {id} name="url" required inputmode="url" autocomplete="url" placeholder="Your site, Instagram, TikTok or LinkedIn" class="min-w-0 flex-1 bg-transparent px-4 py-3 text-[15px] text-ink outline-none placeholder:text-muted" />
			<button class="btn btn-primary group justify-center px-5 py-3 text-[15px]" disabled={going}><span class="roll" data-t={going ? 'Searching…' : 'Find my 5 clients'}><span>{going ? 'Searching…' : 'Find my 5 clients'}</span></span><span class="transition-transform group-hover:translate-x-0.5">→</span></button>
		</div>
	</form>
{/snippet}

{#snippet dotbars(hs: number[], dark = false, max = 13)}
	<div class="flex items-end gap-[5px]" aria-hidden="true">
		{#each hs as h, i (i)}
			<div class="flex flex-col-reverse gap-[4px]">
				{#each Array(max) as _, k (k)}
					<span class="size-[5px] rounded-full transition-all duration-500 {k < h ? (dark ? 'bg-white/85' : 'bg-ink/80') : dark ? 'bg-white/10' : 'bg-ink/[.07]'} {k < h ? 'scale-0 group-[.in]:scale-100' : ''}" style="transition-delay:{i * 60 + k * 25}ms"></span>
				{/each}
			</div>
		{/each}
	</div>
{/snippet}

<!-- A small, live dashboard: neutral, or in the agency's colour -->
{#snippet mock(accent: string | null, name: string)}
	{@const weeks = [4, 6, 5, 8, 7, 10, 9, 13, 12, 16, 15, 19]}
	<div class="overflow-hidden rounded-[22px] bg-[#f4f4f2] text-left text-ink" style={themeStyle(accent)}>
		<div class="grid md:grid-cols-[200px_1fr]">
			<!-- sidebar -->
			<aside class="hidden flex-col gap-0.5 border-r border-black/[.06] bg-white/50 p-3 text-[12px] md:flex">
				<div class="mb-3 flex items-center gap-2 rounded-xl bg-white p-2 shadow-[0_0_0_1px_rgba(0,0,0,.05)]"><span class="grid size-7 place-items-center rounded-lg bg-ink text-[11px] font-semibold text-white">{name.slice(0, 1)}</span><span class="min-w-0"><b class="block truncate text-[12px] font-semibold">{name}</b><span class="block text-[10px] text-muted">Pro plan</span></span></div>
				{#each [['Dashboard', 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', true], ['Prospects', 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 6a4 4 0 110 8 4 4 0 010-8z', false], ['Pipeline', 'M4 6h16M4 12h10M4 18h6', false], ['Agenda', 'M4 5h16v15H4zM4 10h16M9 3v4M15 3v4', false], ['Alerts', 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20h4', false]] as [l, d, a] (l)}
					<span class="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 {a ? 'bg-ink text-white' : 'text-ink-2'}"><svg viewBox="0 0 24 24" class="size-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d={d as string} /></svg>{l}{#if l === 'Alerts'}<span class="ml-auto rounded-full bg-black/[.07] px-1.5 text-[9px]">2</span>{/if}</span>
				{/each}
				<p class="mt-4 mb-1 px-2.5 text-[9px] font-semibold tracking-[0.14em] text-muted uppercase">Clients</p>
				{#each [['Motion Physio', '#3E8E63'], ['Lou Studio', '#E0A458'], ['Northline', '#4C7DD9'], ['Moove app', '#8B5CF6']] as [c, col] (c)}<span class="flex items-center gap-2.5 px-2.5 py-1.5 text-ink-2"><span class="size-2 rounded-full" style="background:{col}"></span>{c}</span>{/each}
				<div class="mt-auto rounded-xl bg-white p-2.5 text-[10px] text-muted shadow-[0_0_0_1px_rgba(0,0,0,.05)]">✦ Ask Undercut…</div>
			</aside>

			<div class="min-w-0 p-4 sm:p-6">
				<!-- top bar -->
				<div class="flex flex-wrap items-end justify-between gap-4">
					<div><p class="text-[11px] text-muted">Monday, good morning</p><p class="mt-1 text-[28px] leading-none font-medium tracking-[-0.04em] sm:text-[34px]">Your week</p></div>
					<div class="flex items-center gap-2">
						<span class="hidden rounded-full bg-white px-3 py-1.5 text-[11px] text-muted shadow-[0_0_0_1px_rgba(0,0,0,.05)] sm:block">⌕ Search clients, prospects…</span>
						<span class="rounded-full bg-ink px-3 py-1.5 text-[11px] font-medium text-white">+ Find 5</span>
					</div>
				</div>

				<!-- KPI row -->
				<div class="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
					{#each [['New prospects', '12', '+5 this week'], ['In conversation', '4', '2 replied today'], ['Won this month', '2', '€1,400 / month'], ['Follow-ups today', '3', 'written for you']] as [l, v, sub], i (l)}
						<div class="rounded-[16px] p-3.5 {i === 0 ? 'bg-ink text-white' : 'bg-white shadow-[0_0_0_1px_rgba(0,0,0,.04)]'}">
							<p class="text-[10px] {i === 0 ? 'text-white/60' : 'text-muted'}">{l}</p>
							<p class="mt-1.5 text-[24px] leading-none font-medium tracking-[-0.04em]">{v}</p>
							<p class="mt-1.5 text-[10px] {i === 0 ? 'text-white/60' : 'text-muted'}">{sub}</p>
						</div>
					{/each}
				</div>

				<div class="mt-2 grid gap-2 lg:grid-cols-[1.35fr_1fr]">
					<!-- prospects -->
					<div class="rounded-[16px] bg-white p-4 shadow-[0_0_0_1px_rgba(0,0,0,.04)]">
						<div class="flex items-center justify-between"><p class="text-[12px] font-semibold">New prospects</p><p class="text-[10px] text-muted">near you · sorted by need</p></div>
						<ul class="mt-3 divide-y divide-black/[.05]">
							{#each [[92, 'Lumen Hair Studio', 'Hair salon', ['not mobile', 'no https'], 'Write'], [78, 'Corner Bakery', 'Bakery', ['no website'], 'Write'], [64, 'Harper Law', 'Law firm', ['slow · 4.8 s', '2019'], 'Sent'], [51, 'Olive Kitchen', 'Restaurant', ['no instagram'], 'Write']] as [sc, nm, cat, tags, st] (nm)}
								<li class="flex items-center gap-3 py-2.5">
									<span class="relative grid size-8 shrink-0 place-items-center"><svg viewBox="0 0 36 36" class="absolute inset-0 -rotate-90"><circle cx="18" cy="18" r="15" fill="none" stroke="rgba(0,0,0,.07)" stroke-width="3" /><circle cx="18" cy="18" r="15" fill="none" stroke="#0d0d0d" stroke-width="3" pathLength="100" stroke-dasharray="{sc} 100" stroke-linecap="round" /></svg><span class="text-[9px] font-semibold">{sc}</span></span>
									<span class="min-w-0 flex-1"><b class="block truncate text-[12px] font-medium">{nm}</b><span class="block truncate text-[10px] text-muted">{cat}</span></span>
									<span class="hidden gap-1 sm:flex">{#each tags as string[] as t (t)}<span class="rounded-full bg-black/[.04] px-2 py-0.5 text-[9px] text-ink-2">{t}</span>{/each}</span>
									<span class="rounded-full px-2.5 py-1 text-[10px] font-medium {st === 'Sent' ? 'bg-black/[.04] text-muted' : 'bg-ink text-white'}">{st}</span>
								</li>
							{/each}
						</ul>
					</div>

					<div class="grid gap-2">
						<!-- chart -->
						<div class="rounded-[16px] bg-white p-4 shadow-[0_0_0_1px_rgba(0,0,0,.04)]">
							<div class="flex items-center justify-between"><p class="text-[12px] font-semibold">Replies</p><p class="text-[10px] text-muted">12 weeks</p></div>
							<div class="mt-3 flex h-20 items-end gap-1.5">
								{#each weeks as w, i (i)}<span class="flex-1 rounded-t-[4px] {i === weeks.length - 1 ? 'bg-ink' : 'bg-black/[.1]'}" style="height:{(w / 19) * 100}%"></span>{/each}
							</div>
						</div>
						<!-- pipeline -->
						<div class="rounded-[16px] bg-white p-4 shadow-[0_0_0_1px_rgba(0,0,0,.04)]">
							<p class="text-[12px] font-semibold">Pipeline</p>
							<div class="mt-3 grid grid-cols-4 gap-1.5 text-center">
								{#each [['To contact', 12], ['Contacted', 7], ['Talking', 4], ['Won', 2]] as [l, n], i (l)}
									<div class="rounded-[10px] py-2 {i === 3 ? 'bg-ink text-white' : 'bg-black/[.035]'}"><p class="text-[16px] leading-none font-medium">{n}</p><p class="mt-1 text-[9px] {i === 3 ? 'text-white/60' : 'text-muted'}">{l}</p></div>
								{/each}
							</div>
						</div>
					</div>
				</div>

				<!-- clients + this week -->
				<div class="mt-2 grid gap-2 lg:grid-cols-[1.35fr_1fr]">
					<div class="rounded-[16px] bg-white p-4 shadow-[0_0_0_1px_rgba(0,0,0,.04)]">
						<div class="flex items-center justify-between"><p class="text-[12px] font-semibold">From their Google reviews</p><p class="text-[10px] text-muted">1–3 stars</p></div>
						<ul class="mt-2 space-y-2 text-[11px]">
							{#each [['Maison Lenoir', '“Indiqué ouvert le dimanche, porte fermée.”'], ['Garage Martens', '“Personne ne répond au téléphone.”'], ['Bistro Kom', '“Geen menu online te vinden.”']] as [c, q] (c)}
								<li class="flex items-center gap-3"><span class="w-24 shrink-0 truncate font-medium">{c}</span><span class="min-w-0 truncate text-muted italic">{q}</span></li>
							{/each}
						</ul>
					</div>
					<div class="rounded-[16px] bg-white p-4 shadow-[0_0_0_1px_rgba(0,0,0,.04)]">
						<p class="text-[12px] font-semibold">This week</p>
						<ul class="mt-2 space-y-1.5 text-[11px]">
							{#each [['Follow up with Harper Law', 'Today', true], ['Salon Iris replied: send the 3 ideas', 'Your turn', false], ['Last follow-up: Olive Kitchen', 'Thu', false]] as [t, w, u] (t)}
								<li class="flex items-center gap-2"><span class="grid size-3.5 shrink-0 place-items-center rounded-full border {u ? 'border-ink' : 'border-black/20'}">{#if u}<span class="size-1.5 rounded-full bg-ink"></span>{/if}</span><span class="min-w-0 flex-1 truncate">{t}</span><span class="shrink-0 text-[10px] text-muted">{w}</span></li>
							{/each}
						</ul>
					</div>
				</div>
			</div>
		</div>
	</div>
{/snippet}

<div class="night-veil" aria-hidden="true"></div>
<div class="relative z-[1] min-h-dvh overflow-x-clip text-ink">
	<!-- frame: hairlines down the page, like a technical drawing -->
	<div class="pointer-events-none fixed inset-y-0 left-1/2 z-0 hidden w-full max-w-[1280px] -translate-x-1/2 border-x border-black/[.06] lg:block" aria-hidden="true">
		<div class="absolute inset-y-0 left-1/2 border-l border-dashed border-black/[.04]"></div>
	</div>

	<!-- ================= NAV: a wide glass bar ================= -->
	<header class="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
		<div class="dock mx-auto flex max-w-[1200px] items-center justify-between gap-4 rounded-[22px] py-2 pr-2 pl-5 transition-all duration-500 {y > 40 ? 'shadow-[0_14px_40px_-18px_rgba(0,0,0,.35)]' : ''}">
			<a href="/" aria-label="Undercut home" class="shrink-0"><Logo size={28} /></a>
			<nav class="relative hidden items-center lg:flex" onpointerleave={() => (ind = { ...ind, on: false })}>
				<span class="dock-ind absolute inset-y-0 rounded-full bg-black/[.05] transition-all duration-300 ease-[cubic-bezier(.2,.75,.15,1)]" style="left:{ind.x}px;width:{ind.w}px;opacity:{ind.on ? 1 : 0}" aria-hidden="true"></span>
				{#each nav as [h, l] (h)}<a href={h} onpointerenter={over} class="dock-link relative rounded-full px-4 py-2.5 text-[15px] text-ink-2 transition-colors hover:text-ink">{l}</a>{/each}
			</nav>
			<div class="flex items-center gap-1">
				<a href="/login" class="dock-link hidden rounded-full px-4 py-2.5 text-[15px] text-ink-2 hover:text-ink sm:block">Log in</a>
				<a href="/prospects" class="group hidden items-center gap-3 rounded-[16px] bg-ink py-2 pr-2 pl-5 text-[15px] font-medium text-white sm:flex"><span class="roll" data-t="Find my clients"><span>Find my clients</span></span><span class="grid size-8 place-items-center rounded-[11px] bg-white/15 transition-transform duration-300 group-hover:translate-x-0.5">→</span></a>
				<button class="grid size-11 place-items-center rounded-[14px] lg:hidden" onclick={() => (menu = !menu)} aria-label="Menu" aria-expanded={menu}>
					<span class="relative block h-3 w-4"><span class="absolute left-0 h-px w-4 bg-current transition-all duration-300 {menu ? 'top-1.5 rotate-45' : 'top-0'}"></span><span class="absolute left-0 h-px w-4 bg-current transition-all duration-300 {menu ? 'top-1.5 -rotate-45' : 'top-3'}"></span></span>
				</button>
			</div>
		</div>
	</header>
	{#if menu}
		<div class="fixed inset-0 z-40 flex flex-col justify-end bg-paper/90 p-6 pb-10 backdrop-blur-2xl lg:hidden" transition:slide={{ duration: 350 }}>
			<nav class="grid gap-2">
				{#each [...nav, ['/login', 'Log in']] as [h, l], i (h)}
					<a href={h} class="flex items-baseline gap-4 border-b border-black/[.08] py-3 text-[40px] leading-none font-medium tracking-[-0.04em] [animation:fade-up_.6s_var(--ease-out)_both]" style="animation-delay:{i * 60}ms" onclick={() => (menu = false)}><span class="text-xs text-muted">0{i + 1}</span>{l}</a>
				{/each}
			</nav>
		</div>
	{/if}

	<!-- ================= HERO ================= -->
	<section class="relative isolate mx-auto flex min-h-dvh max-w-[1280px] flex-col px-5 pt-32 sm:px-10 sm:pt-40" use:pointer>
		<div class="flex flex-wrap items-center justify-between gap-3 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase" use:reveal>
			<span class="tag">For freelancers & small studios · web, social, SEO, ads, photo & video</span>
			<a href="/beta" class="hidden items-center gap-2 sm:flex"><span class="relative flex size-2"><span class="ping-soft absolute inset-0 rounded-full bg-ink"></span><span class="relative size-2 rounded-full bg-ink"></span></span>Free beta · 30 places</a>
		</div>
		<div class="mt-10 grid flex-1 items-center gap-10 lg:mt-6 lg:grid-cols-[1.15fr_1fr]">
			<div class="relative z-10">
				<h1 class="text-[clamp(38px,4.7vw,72px)] leading-[1.05] font-medium tracking-[-0.04em]">
					<SplitChars as="span" class="block text-ink/40" text="Paste your URL." delay={150} step={30} />
					<SplitChars as="span" class="block" text="Get your next" delay={500} />
					<span class="block" use:reveal={{ delay: 900 }}><CutText words={['clients.', 'replies.', 'projects.']} shift={0.035} /></span>
				</h1>
				<p class="mt-12 max-w-[31rem] text-[19px] leading-[1.75] text-ink-2" use:reveal={{ delay: 1100 }}>Undercut finds local businesses that need what you sell, reads what their customers complain about, writes the first message in their language and reminds you to follow up. You just approve.</p>
				<div class="mt-10" use:reveal={{ delay: 1250 }}>
					{@render urlForm('hero-url')}
					<p class="mt-4 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Free preview: your first 5 prospects · no account</p>
				</div>
			</div>
			<div class="relative mx-auto w-full max-w-[600px]" use:reveal={{ delay: 400 }} style="transform:translate(calc(var(--mx,0) * -12px), calc(var(--my,0) * -10px))">
				<DotGlobe />
				{#each chips as c (c.n)}
					<div class="card absolute flex w-[min(210px,46%)] items-center gap-3 rounded-[18px]! p-2.5 pr-3.5 [animation:floaty_6s_ease-in-out_infinite]" style="left:{c.x};top:{c.y};animation-delay:{c.d}s">
						<span class="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold text-white">{c.s}</span>
						<span class="min-w-0"><b class="block truncate text-[13px] font-medium">{c.n}</b><span class="block truncate text-[10px] text-muted">{c.w}</span></span>
					</div>
				{/each}
				<p class="tag absolute bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap">Example of what Undercut finds around you</p>
			</div>
		</div>
		<!-- the cut: a hairline at the logo's angle slices the hero -->
		<svg class="pointer-events-none absolute inset-0 -z-10 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
			<line x1="-5" y1="78" x2="105" y2="44" stroke="rgb(13 13 13 / .14)" stroke-width="1" vector-effect="non-scaling-stroke" pathLength="1" class="cut-line" />
		</svg>
		<div class="h-16"></div>
	</section>

	<!-- ================= LIVE SCAN STRIP ================= -->
	<div class="relative overflow-hidden border-y border-black/[.07] bg-white/40 py-4 backdrop-blur" aria-hidden="true">
		<span class="absolute top-1/2 left-0 z-10 -translate-y-1/2 bg-[#ececea] py-1 pr-4 pl-5 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase sm:pl-10">Examples</span>
		<div class="flex w-max [animation:marquee_45s_linear_infinite]">
			{#each [0, 1] as k (k)}
				<div class="flex items-center gap-10 pr-10 text-[12px] tracking-wide text-ink-2 uppercase">
					{#each scans as t (t)}<span class="flex items-center gap-3 whitespace-nowrap"><span class="size-1.5 rounded-full bg-ink/70"></span>{t}</span>{/each}
				</div>
			{/each}
		</div>
	</div>

	<!-- ================= NIGHT ZONE: the screen turns black ================= -->
	<div class="zone relative" use:nightZone>
		<section class="relative h-[230vh]" use:scrub={{ start: 0, end: 1 }}>
			<div class="sticky top-0 flex h-dvh flex-col items-center justify-center px-6">
				<p class="tag zone-muted mb-12">Why Undercut</p>
				<p class="lit mx-auto max-w-5xl text-center text-[clamp(28px,3.8vw,52px)] leading-[1.3] font-medium tracking-[-0.03em]" style="--n:{lit.length}">
					{#each lit as w, i (i)}<span style="--i:{i}" class={w.hi ? 'font-serif font-normal italic' : ''}>{w.t}</span>{' '}{/each}
				</p>
			</div>
		</section>

		<!-- what Undercut does, in three jobs -->
		<section class="relative mx-auto max-w-[1280px] px-5 pt-10 pb-20 sm:px-10">
			<div class="flex flex-wrap items-end justify-between gap-8">
				<div>
					<p class="tag zone-muted">What Undercut does</p>
					<h2 class="mt-6 text-[clamp(32px,4.2vw,58px)] leading-[1.08] font-medium tracking-[-0.035em]" use:reveal>One job:<br /><span class="zone-muted">your next clients.</span></h2>
				</div>
				<p class="zone-muted max-w-sm leading-[1.75]" use:reveal={{ delay: 150 }}>Built from your website, in your language. No CRM to fill, no dashboard to set up.</p>
			</div>
			<ol class="mt-16 grid gap-3 lg:grid-cols-3" use:reveal>
				{#each jobs as j, i (j.t)}
					<li class="job group flex min-h-[420px] flex-col rounded-[28px] p-7 sm:p-8" data-stagger use:inview use:spotlight>
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium opacity-50">0{i + 1}</span>
							<span class="rounded-full border border-current/15 px-3 py-1 text-xs opacity-70">{j.k}</span>
						</div>
						<div class="mt-8 rounded-[20px] bg-white/[.06] p-4">
							{#if i === 0}
								{#each [[92, 'Lumen Hair Studio', 'not mobile · no https'], [78, 'Corner Bakery', 'no website']] as [sc, nm, w], k (nm)}
									<div class="flex items-center gap-3 py-1.5 opacity-0 transition-all duration-500 group-[.in]:opacity-100" style="transition-delay:{400 + k * 200}ms">
										<span class="grid size-8 shrink-0 place-items-center rounded-full bg-white text-[11px] font-semibold text-ink">{sc}</span>
										<span class="min-w-0"><b class="block truncate text-sm font-medium">{nm}</b><span class="block truncate text-xs opacity-50">{w}</span></span>
										<span class="ml-auto rounded-full bg-white/10 px-2.5 py-1 text-[11px]">Write</span>
									</div>
								{/each}
							{:else if i === 1}
								<p class="text-[11px] opacity-50">Bakery · written in French</p>
								<p class="mt-2 text-sm leading-relaxed opacity-0 transition-opacity delay-500 duration-700 group-[.in]:opacity-90">“Bonjour, dans vos avis Google, un client écrit qu’il a trouvé porte fermée un dimanche indiqué ouvert. C’est le genre de détail qui se règle en ligne…”</p>
								<p class="mt-3 flex gap-2 text-[11px]"><span class="rounded-full bg-white px-2.5 py-1 text-ink">Send by email</span><span class="rounded-full bg-white/10 px-2.5 py-1">Copy for Instagram</span></p>
							{:else}
								<div class="space-y-2 text-sm">
									<p class="flex items-center justify-between gap-3 opacity-0 transition-opacity delay-500 duration-500 group-[.in]:opacity-100"><span>Harper Law</span><span class="rounded-full bg-white/10 px-2.5 py-1 text-[11px]">Follow-up today</span></p>
									<p class="flex items-center justify-between gap-3 opacity-0 transition-opacity delay-700 duration-500 group-[.in]:opacity-100"><span>Salon Iris</span><span class="rounded-full bg-white px-2.5 py-1 text-[11px] text-ink">Replied</span></p>
									<p class="text-xs opacity-60">“Oui, envoyez-moi les idées !”</p>
								</div>
							{/if}
						</div>
						<h3 class="mt-auto pt-10 text-[26px] leading-tight font-medium tracking-[-0.03em]">{j.t}</h3>
						<p class="mt-3 text-[15px] leading-[1.7] opacity-65">{j.d}</p>
					</li>
				{/each}
			</ol>
		</section>

		<section class="relative mx-auto max-w-[1280px] px-5 pt-8 pb-40 sm:px-10">
			<div class="zone-line grid grid-cols-2 border-y lg:grid-cols-4" use:reveal>
				{#each [[30, ' s', 'to your first prospects'], [5, '', 'free prospects, no account'], [0, '', 'messages sent without your click'], [3, '', 'languages: FR · NL · EN']] as [v, suf, l], i (l)}
					<div class="zone-line px-2 py-12 sm:px-6 {i ? 'lg:border-l' : ''} {i % 2 ? 'border-l' : ''}" data-stagger>
						<p class="big text-[clamp(44px,5vw,76px)] whitespace-nowrap" use:countUp={{ to: v as number, suffix: suf as string, ms: 1400 + i * 200 }}>{v}{suf}</p>
						<p class="zone-muted mt-3 text-[11px] tracking-wide uppercase">{l}</p>
					</div>
				{/each}
			</div>
		</section>
	</div>

	<!-- ================= PRODUCT (tilts flat on scroll) ================= -->
	<section class="relative mx-auto max-w-[1280px] px-4 py-24 sm:px-10 sm:py-40">
		<div class="text-center">
			<p class="tag" use:reveal>The app</p>
			<SplitText text={'One screen.\n*Your next clients.*'} class="mt-6 text-[clamp(32px,4.2vw,58px)] leading-[1.08] font-medium tracking-[-0.035em]" emClass="font-serif font-normal text-ink/40" />
			<p class="mx-auto mt-8 max-w-lg leading-[1.75] text-ink-2" use:reveal={{ delay: 200 }}>Businesses that need you, who replied and what to follow up today. It builds itself from your URL, in your colours and your language.</p>
		</div>
		<div class="relative mt-20 [perspective:2000px]" use:scrub={{ start: 0.95, end: 0.92 }}>
			<div class="relative origin-top transition-transform duration-150 ease-out" style="transform:rotateX(calc(22deg - var(--p,0) * 22deg)) scale(calc(.9 + var(--p,0) * .1));opacity:calc(.4 + var(--p,0) * .6)">
				<div class="card rounded-[30px]! p-2 sm:p-2.5">
					<div class="flex items-center gap-2 px-3 pt-1 pb-2.5">
						<span class="size-2.5 rounded-full bg-black/10"></span><span class="size-2.5 rounded-full bg-black/10"></span><span class="size-2.5 rounded-full bg-black/10"></span>
						<span class="mx-auto rounded-full bg-black/[.04] px-4 py-1 text-[11px] text-muted">app.getundercut.app</span>
					</div>
					{@render mock(null, 'Your agency')}
				</div>
				{#each notes as n, i (n.t)}
					<div class="pointer-events-none absolute hidden lg:block" style="left:{n.x};top:{n.y};opacity:clamp(0, calc(var(--p,0) * 3.5 - {0.9 + i * 0.35}), 1);transform:translateY(calc((1 - clamp(0, var(--p,0) * 3.5 - {0.9 + i * 0.35}, 1)) * 12px))">
						<span class="glass-btn flex items-center gap-2 rounded-full py-2 pr-4 pl-2 text-[13px] font-medium"><span class="grid size-6 place-items-center rounded-full bg-ink text-[10px] text-white">{i + 1}</span>{n.t}</span>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- ================= HOW (sticky title + drawn timeline) ================= -->
	<section id="how" class="relative mx-auto grid max-w-[1280px] scroll-mt-24 gap-16 px-5 py-24 sm:px-10 sm:py-40 lg:grid-cols-[1fr_1.2fr]">
		<div class="lg:sticky lg:top-32 lg:self-start">
			<p class="tag" use:reveal>How it works</p>
			<SplitText text={'How it works,\n*step by step.*'} class="mt-6 text-[clamp(32px,4.2vw,58px)] leading-[1.08] font-medium tracking-[-0.035em]" emClass="font-serif font-normal text-ink/40" />
			<p class="mt-8 max-w-sm leading-[1.75] text-ink-2" use:reveal={{ delay: 200 }}>What happens after you paste your website — from finding a business to signing it.</p>
		</div>
		<ol class="relative" use:scrub={{ start: 0.8, end: 0.5 }}>
			<span class="absolute top-2 bottom-2 left-[11px] w-px origin-top bg-[linear-gradient(to_bottom,rgba(13,13,13,.5)_50%,transparent_50%)] bg-[length:1px_6px]" style="transform:scaleY(var(--p,0))" aria-hidden="true"></span>
			{#each steps as s, i (s.n)}
				<li class="relative pb-20 pl-14 last:pb-0" use:reveal={{ delay: i * 80 }}>
					<span class="absolute top-1 left-0 grid size-[23px] place-items-center rounded-full border border-ink/30 bg-paper"><span class="size-2 rounded-full bg-ink"></span></span>
					<p class="text-sm font-medium text-muted">{s.n}</p>
					<h3 class="mt-4 text-[clamp(28px,3vw,40px)] leading-tight font-medium tracking-[-0.035em]">{s.t}</h3>
					<p class="mt-4 max-w-md leading-[1.75] text-ink-2">{s.d}</p>
				</li>
			{/each}
		</ol>
	</section>

	<!-- ================= FEATURES ================= -->
	<section id="features" class="relative mx-auto max-w-[1280px] scroll-mt-24 px-4 py-24 sm:px-10 sm:py-40">
		<div class="flex flex-wrap items-end justify-between gap-8">
			<div>
				<p class="tag" use:reveal>Features</p>
				<SplitText text={'Find. Write. Follow up.\n*Nothing else.*'} class="mt-6 text-[clamp(32px,4.2vw,58px)] leading-[1.08] font-medium tracking-[-0.035em]" emClass="font-serif font-normal text-ink/40" />
			</div>
			<p class="max-w-sm leading-[1.75] text-ink-2" use:reveal={{ delay: 200 }}>Everything to bring clients in. No CRM, no analytics, no settings to learn.</p>
		</div>
		<div class="mt-20 grid grid-cols-1 gap-3 md:grid-cols-6" use:reveal>
			<article class="card group flex flex-col gap-8 p-8 md:col-span-4" data-stagger use:inview use:spotlight>
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div><span class="tag">Find clients</span><h3 class="mt-4 text-[32px] leading-tight font-medium tracking-[-0.03em]">Prospects that need you.</h3></div>
					<p class="max-w-xs text-sm leading-[1.75] text-ink-2">Real businesses around you, each website checked and Google reviews read, a first message written from what we found.</p>
				</div>
				<div class="rounded-[20px] bg-white/60 p-5 shadow-[inset_0_0_0_1px_rgba(0,0,0,.05)]">
					<p class="flex items-center justify-between gap-3"><span><b class="block text-lg font-medium">Lumen Hair Studio</b><span class="text-xs text-muted">Hair salon · 400 m away</span></span><span class="grid size-12 place-items-center rounded-full bg-ink font-semibold text-white">90</span></p>
					<div class="mt-4 flex flex-wrap gap-1.5">{#each ['site not mobile', 'no https', 'last update 2018'] as x, i (x)}<span class="translate-y-2 rounded-full bg-white px-3 py-1 text-[11px] opacity-0 shadow-[0_0_0_1px_rgba(0,0,0,.06)] transition-all duration-500 group-[.in]:translate-y-0 group-[.in]:opacity-100" style="transition-delay:{300 + i * 150}ms">{x}</span>{/each}</div>
					<p class="mt-4 overflow-hidden rounded-[14px] bg-black/[.04] p-3 text-sm whitespace-nowrap text-ink-2 [clip-path:inset(0_100%_0_0)] transition-[clip-path] delay-700 duration-[1800ms] ease-linear group-[.in]:[clip-path:inset(0_0_0_0)]">“Hi, I was looking at your website and noticed it doesn’t display well on phones…”</p>
				</div>
			</article>
			<article class="card-dark group flex flex-col gap-6 p-8 md:col-span-2" data-stagger use:inview use:spotlight>
				<div><span class="tag text-white/50!">Replies</span><h3 class="mt-4 text-[26px] leading-tight font-medium tracking-[-0.03em]">Signed this month.</h3></div>
				<div class="mt-auto">{@render dotbars(bars, true)}</div>
				<p class="text-xs text-white/50">reply rate 32% · 3 signed</p>
			</article>
			<article class="card flex flex-col gap-5 p-8 md:col-span-2" data-stagger use:spotlight>
				<div><span class="tag">Their customers</span><h3 class="mt-4 text-[26px] leading-tight font-medium tracking-[-0.03em]">The problem, in their own reviews.</h3></div>
				<p class="text-sm leading-[1.75] text-ink-2">1–3 star Google reviews about things you fix: hours, booking, phone, website, menu, photos.</p>
				<p class="mt-auto rounded-[16px] bg-black/[.04] px-4 py-3 text-[12px] text-ink-2 italic">“Impossible de réserver en ligne.”</p>
			</article>
			<article class="card flex flex-col gap-5 p-8 md:col-span-2" data-stagger use:spotlight>
				<div><span class="tag">Their language</span><h3 class="mt-4 text-[26px] leading-tight font-medium tracking-[-0.03em]">French, Dutch or English.</h3></div>
				<p class="text-sm leading-[1.75] text-ink-2">Every message in the language the business speaks, read from its own website.</p>
				<p class="mt-auto flex gap-2 text-sm">{#each ['FR', 'NL', 'EN'] as l (l)}<span class="rounded-full bg-black/[.04] px-3 py-1.5">{l}</span>{/each}</p>
			</article>
			<article class="card flex flex-col gap-5 p-8 md:col-span-2" data-stagger use:spotlight>
				<div><span class="tag">You approve</span><h3 class="mt-4 text-[26px] leading-tight font-medium tracking-[-0.03em]">Nothing goes out without you.</h3></div>
				<p class="text-sm leading-[1.75] text-ink-2">From your own email or as an Instagram DM. No new domain, no spam, no warm-up.</p>
				<p class="mt-auto"><span class="big text-[56px]">0</span><span class="ml-2 text-xs text-muted">messages sent without your click</span></p>
			</article>
		</div>
	</section>

	<!-- ================= STUDIO NOTE ================= -->
	<section class="relative mx-auto max-w-[1280px] px-5 pb-8 sm:px-10">
		<div class="card grid items-center gap-10 p-8 sm:p-14 lg:grid-cols-[auto_1fr]" use:reveal use:spotlight>
			<div class="grid size-28 place-items-center rounded-[28px] bg-ink text-white shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] sm:size-36"><Logo size={64} wordmark={false} light /></div>
			<div>
				<p class="tag">A note from the studio</p>
				<p class="mt-6 max-w-3xl text-[clamp(22px,2.4vw,32px)] leading-[1.35] tracking-[-0.02em]">We’re a small studio too. Undercut is built with the same care we put into client work — <span class="font-serif italic">every pixel, every number, every message.</span> If something feels off, you’ll be talking to the people who made it.</p>
				<a href="https://unixcreativestudio.com/" target="_blank" rel="noopener" class="mt-8 inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase hover:text-ink">— Unix Creative Studio <span aria-hidden="true">↗</span></a>
			</div>
		</div>
	</section>

	<!-- ================= PRICING ================= -->
	<section id="pricing" class="relative mx-auto max-w-[1280px] scroll-mt-24 px-4 py-24 sm:px-10 sm:py-40">
		<div class="text-center">
			<p class="tag" use:reveal>Pricing</p>
			<SplitText text={'One new client\n*pays for the year.*'} class="mt-6 text-[clamp(32px,4.4vw,62px)] leading-[1.08] font-medium tracking-[-0.035em]" emClass="font-serif font-normal text-ink/40" />
			<p class="mt-8 text-ink-2" use:reveal={{ delay: 200 }}>Free during the beta. <b class="font-medium text-ink">The first 30 keep −50% for life.</b> No meeting with a prospect in 60 days? Your money back.</p>
		</div>
		<div class="mt-20 grid gap-3 md:grid-cols-3" use:reveal>
			<div class="card flex flex-col gap-5 p-8" data-stagger use:spotlight>
				<p class="font-medium">Free</p>
				<p><span class="big text-[64px]">€0</span></p>
				<p class="-mt-3 text-xs opacity-60">no account, no card</p>
				<ul class="space-y-2 text-sm opacity-80">
					<li>✓ 5 prospects in your city</li>
					<li>✓ Why each one needs you, with proof</li>
					<li>✓ The first message, written</li>
				</ul>
				<a href="/prospects" class="btn btn-primary mt-auto">Try it now</a>
			</div>
			{#each ['freelance', 'agency'] as const as id (id)}
				{@const p = PLANS[id]}
				<div class="flex flex-col gap-5 p-8 {id === 'agency' ? 'card-dark' : 'card'}" data-stagger use:spotlight>
					<div class="flex items-center justify-between"><p class="font-medium">{p.name}</p><span class="rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase {id === 'agency' ? 'bg-white text-ink' : 'bg-ink text-white'}">{id === 'agency' ? 'Studios, 2–10 people' : 'Freelancers'}</span></div>
					<p><span class="big text-[64px]">€{p.price % 2 ? (p.price / 2).toFixed(2) : p.price / 2}</span><span class="text-sm opacity-60"> / month for life</span></p>
					<p class="-mt-3 text-xs opacity-60"><s>€{p.price}</s> after the first 30 · free during the beta</p>
					<ul class="space-y-2 text-sm opacity-80">
						<li>✓ {p.prospects} prospects a month</li>
						<li>✓ Today: first messages and follow-ups to approve</li>
						<li>✓ {id === 'freelance' ? 'Google reviews read · morning email' : '3 team members · FR, NL and EN messages'}</li>
					</ul>
					<a href="/beta" class="btn mt-auto {id === 'agency' ? 'bg-white text-ink hover:bg-white/90' : 'btn-primary'}">Join the free beta</a>
				</div>
			{/each}
		</div>
	</section>

	<!-- ================= FAQ ================= -->
	<section id="faq" class="relative mx-auto grid max-w-[1280px] scroll-mt-24 gap-14 px-5 py-24 sm:px-10 sm:py-40 lg:grid-cols-[1fr_1.5fr] lg:gap-24">
		<div class="lg:sticky lg:top-32 lg:self-start">
			<p class="tag" use:reveal>FAQ</p>
			<SplitText text={'Questions,\n*answered.*'} class="mt-6 text-[clamp(32px,4.2vw,58px)] leading-[1.08] font-medium tracking-[-0.035em]" emClass="font-serif font-normal text-ink/40" />
			<p class="mt-8 max-w-sm leading-[1.75] text-ink-2" use:reveal={{ delay: 150 }}>Everything agencies ask us before they start. Something missing?</p>
			<a href="mailto:hello@getundercut.app" class="group mt-8 inline-flex items-center gap-3 rounded-full py-1.5 pr-5 pl-1.5 text-sm font-medium glass-btn" use:reveal={{ delay: 250 }}>
				<span class="grid size-9 place-items-center rounded-full bg-ink text-white transition-transform duration-300 group-hover:rotate-[-45deg]">→</span>Ask the studio
			</a>
		</div>
		<ul class="border-t border-black/[.08]" use:reveal>
			{#each faqs as f, i (f.q)}
				<li class="border-b border-black/[.08]" data-stagger>
					<button class="group flex w-full items-start gap-6 py-7 text-left" onclick={() => (open = open === i ? null : i)} aria-expanded={open === i}>
						<span class="mt-1.5 w-6 shrink-0 text-xs text-muted tabular-nums">0{i + 1}</span>
						<span class="flex-1 text-[clamp(18px,1.6vw,22px)] leading-snug font-medium tracking-[-0.02em] transition-colors {open === i ? 'text-ink' : 'text-ink/80 group-hover:text-ink'}">{f.q}</span>
						<span class="relative mt-1 grid size-8 shrink-0 place-items-center rounded-full transition-colors duration-300 {open === i ? 'bg-ink text-white' : 'bg-black/[.05] group-hover:bg-black/10'}" aria-hidden="true">
							<span class="absolute h-px w-3 bg-current"></span><span class="absolute h-3 w-px bg-current transition-transform duration-300 {open === i ? 'scale-y-0' : ''}"></span>
						</span>
					</button>
					{#if open === i}
						<div transition:slide={{ duration: 320 }}><p class="max-w-xl pb-8 pl-12 text-[16px] leading-[1.75] text-ink-2">{f.a}</p></div>
					{/if}
				</li>
			{/each}
		</ul>
	</section>

	<!-- ================= FINAL CTA ================= -->
	<section class="relative px-3 pb-3 sm:px-5">
		<div class="card-dark relative isolate mx-auto flex max-w-[1280px] flex-col items-center overflow-hidden rounded-[36px]! px-6 py-28 text-center sm:py-40">
			<div class="pointer-events-none absolute -bottom-56 left-1/2 -z-10 w-[760px] -translate-x-1/2 opacity-70" aria-hidden="true"><DotGlobe size={760} points={1000} hot={12} dark /></div>
			<p class="tag text-white/50!">Free tool</p>
			<h2 class="mt-6 text-[clamp(36px,5.6vw,84px)] leading-[1.04] font-medium tracking-[-0.04em]">
				<SplitChars as="span" class="block" text="Your next client" />
				<SplitChars as="span" class="block font-serif font-normal text-white/45 italic" text="is around the corner." delay={300} step={30} />
			</h2>
			<div class="mt-12 flex w-full justify-center" use:reveal={{ delay: 300 }}>{@render urlForm('cta-url')}</div>
			<p class="mt-5 text-[11px] text-white/50 uppercase">No card · −50% for life for the first 30 · Data in the EU</p>
		</div>
	</section>

	<footer class="relative overflow-hidden px-4 pt-14 sm:px-10">
		<div class="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 text-sm text-muted">
			<Logo size={24} />
			<nav class="flex flex-wrap gap-x-5 gap-y-2 text-[13px]"><a href="/prospects" class="hover:text-ink">Free tool</a><a href="#pricing" class="hover:text-ink">Pricing</a><a href="/privacy" class="hover:text-ink">Privacy</a><a href="/terms" class="hover:text-ink">Terms</a><a href="/dpa" class="hover:text-ink">DPA</a><a href="/login" class="hover:text-ink">Log in</a></nav>
			<p class="text-[11px] uppercase">Designed & built by <a href="https://unixcreativestudio.com/" class="text-ink underline decoration-black/20 underline-offset-4 hover:decoration-ink" target="_blank" rel="noopener">Unix Creative Studio</a></p>
		</div>
		<div class="mx-auto mt-10 max-w-[1280px] overflow-hidden pb-4 text-center" use:scrub={{ start: 1, end: 0.6 }} aria-hidden="true">
			<p class="text-[22vw] leading-[0.85] font-medium tracking-[-0.075em] text-ink select-none lg:text-[280px]"><CutText text="undercut" shift={0.04} scroll /></p>
		</div>
	</footer>
</div>

<style>
	.job {
		background: rgb(255 255 255 / 0.55);
		box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.06);
		transition:
			background 0.8s,
			box-shadow 0.8s;
	}
	:global(.night) .job {
		background: linear-gradient(180deg, rgb(255 255 255 / 0.06), rgb(255 255 255 / 0.02));
		box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.08), inset 0 0 0 1px rgb(255 255 255 / 0.08);
	}
	.cut-line {
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
		animation: draw 1.6s cubic-bezier(0.7, 0, 0.2, 1) 0.4s forwards;
	}
	@keyframes draw {
		to {
			stroke-dashoffset: 0;
		}
	}
	.lit > span {
		transition: opacity 0.2s linear;
	}
</style>
