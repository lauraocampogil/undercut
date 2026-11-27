<script lang="ts">
	import SiteNav from '#lib/components/SiteNav.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import TopList from '#lib/components/TopList.svelte';
	import HowStory from '#lib/components/landing/HowStory.svelte';
	import FoundersCards from '#lib/components/landing/FoundersCards.svelte';
	import HeroMock from '#lib/components/landing/HeroMock.svelte';
	import Marquee from '#lib/components/landing/Marquee.svelte';
	import Faq from '#lib/components/landing/Faq.svelte';
	import { reveal, countUp } from '#lib/motion.ts';
	import { PRICE } from '#lib/pricing.ts';
	import { SITE, fill } from '#lib/site-i18n.ts';
	let { data } = $props();

	const t = $derived(SITE[data.lang]);
	const open = $derived(data.rows.filter((r) => !r.locked && r.app.icon));
	const amount = PRICE.full.replace('/mo', '');
	const wl = $derived(data.waitlist); // waitlist mode: every button leads to the waitlist, signed in or not (the app is behind Log in)
	const go = (p: string) => (wl ? '/waitlist' : p);
	const WL = {
		en: { pill: 'Early access · 30 founding spots at €29', ph: 'you@email.com', cta: 'Join the waitlist' },
		fr: { pill: 'Accès anticipé · 30 places fondateur à 29 €', ph: 'vous@email.com', cta: 'Rejoindre la liste' },
		es: { pill: 'Acceso anticipado · 30 plazas de fundador a 29 €', ph: 'tu@email.com', cta: 'Unirme a la lista' }
	};
	const w = $derived(WL[data.lang as 'en' | 'fr' | 'es']);
	const unlock = $derived(go(data.signedIn ? '/app/settings/billing' : '/signup'));
	const faq = $derived(t.faq.items.map(([q, a]) => [q, fill(a, { a: PRICE.freeAnalyses })] as [string, string]));
</script>

<svelte:head>
	<title>{t.meta.title}</title>
	<meta name="description" content={t.meta.desc} />
	<meta property="og:title" content={t.meta.title} />
	<meta property="og:description" content={t.meta.desc} />
	<meta property="og:url" content="https://getundercut.app" />
	<meta name="twitter:title" content={t.meta.title} />
	<meta name="twitter:description" content={t.meta.desc} />
	<link rel="alternate" hreflang="en" href="/?lang=en" />
	<link rel="alternate" hreflang="fr" href="/?lang=fr" />
	<link rel="alternate" hreflang="es" href="/?lang=es" />
	<link rel="canonical" href="https://getundercut.app/" />
	<!-- structured data: what Undercut is, its price and its FAQ (Google rich results and AI answers) -->
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{ '@type': 'Organization', name: 'Undercut', url: 'https://getundercut.app', logo: 'https://getundercut.app/og.png', founder: { '@type': 'Person', name: 'Laura Ocampo' } },
			{ '@type': 'SoftwareApplication', name: 'Undercut', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url: 'https://getundercut.app', description: t.meta.desc, offers: { '@type': 'Offer', price: '49', priceCurrency: 'EUR' } },
			{ '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }
		]
	}).replace(/</g, '\\u003c')}</script>`}
</svelte:head>

{#snippet head(label: string, icon: string, title: string, muted: string, intro: string, cta?: [string, string])}
	<div class="mb-14 grid gap-8 md:grid-cols-[1.3fr_1fr] md:items-end" use:reveal>
		<div class="flex flex-col gap-5">
			<span class="inline-flex items-center gap-2 self-start rounded-full border border-line px-3 py-1.5 text-xs text-ink-2"><Icon name={icon as any} size={13} />{label}</span>
			<h2 class="display text-4xl sm:text-[52px]">{title} <span class="text-muted">{muted}</span></h2>
		</div>
		<div class="flex flex-col items-start gap-5 md:pb-2">
			<p class="leading-relaxed text-ink-2">{intro}</p>
			{#if cta}<a href={cta[1]} class="btn btn-primary">{cta[0]}</a>{/if}
		</div>
	</div>
{/snippet}

<div class="min-h-dvh bg-white" lang={data.lang}>
	<SiteNav signedIn={data.signedIn} lang={data.lang} cta={go('/app/analyses')} ctaLabel={wl ? w.cta : ''} />

	{#if data.admin && (data.admin.dbProblem || !data.admin.key || data.admin.seed.running || data.admin.seed.errors.length)}
		<div class="mx-auto max-w-[1200px] px-5 sm:px-8">
			<div class="rounded-xl border border-line bg-[#fafaf8] px-4 py-3 text-sm">
				<span class="font-medium">Only you see this · </span>
				{#if data.admin.dbProblem}<span class="text-bad">Database error: {data.admin.dbProblem}</span>
				{:else if !data.admin.key}<span class="text-bad">ANTHROPIC_API_KEY is empty.</span>
				{:else if data.admin.seed.running}<span class="text-ink-2">Filling the top 100: {data.admin.seed.done}/{data.admin.seed.total}, now {data.admin.seed.current}.</span>{/if}
				{#if data.admin.seed.errors.length}<span class="block text-xs text-bad">Last errors: {data.admin.seed.errors.join(' · ')}</span>{/if}
			</div>
		</div>
	{/if}

	<!-- ============ HERO ============ -->
	<header class="mx-auto grid max-w-[1200px] items-center gap-10 px-5 pt-14 pb-10 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:pt-20 lg:pb-16">
		<div class="flex flex-col items-start">
			<a href="#top" class="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-ink-2" use:reveal>
				<span class="size-1.5 rounded-full bg-good"></span>{wl ? w.pill : t.hero.pill}<span class="text-muted">→</span>
			</a>
			<h1 class="display mt-7 text-5xl sm:text-[64px]" use:reveal={{ delay: 100 }}>{t.hero.h1a}<br /><span class="text-muted">{t.hero.h1b}</span></h1>
			<p class="mt-6 max-w-lg text-lg leading-relaxed text-ink-2" use:reveal={{ delay: 200 }}>{t.hero.sub}</p>
			<form method="GET" action={go('/app/analyses')} class="mt-8 flex w-full max-w-md flex-col gap-2 rounded-2xl border border-line p-1.5 sm:flex-row" use:reveal={{ delay: 300 }}>
				{#if wl}
					<input name="email" type="email" required placeholder={w.ph} autocomplete="email" class="min-w-0 flex-1 rounded-xl px-4 py-3 outline-none" />
					<button class="btn btn-primary px-6">{w.cta}</button>
				{:else}
					<input name="url" required placeholder={t.hero.placeholder} class="min-w-0 flex-1 rounded-xl px-4 py-3 outline-none" />
					<button class="btn btn-primary px-6">{t.hero.cta}</button>
				{/if}
			</form>
			<div class="mt-10 grid w-full max-w-md grid-cols-3" use:reveal={{ delay: 400 }}>
				<div><p class="big text-3xl" use:countUp={{ to: data.count }}>{data.count}</p><p class="mt-1 text-xs text-muted">{t.hero.products}</p></div>
				<div><p class="big text-3xl" use:countUp={{ to: data.reviews }}>{data.reviews}</p><p class="mt-1 text-xs text-muted">{t.hero.reviews}</p></div>
				<div><p class="big text-3xl">4</p><p class="mt-1 text-xs text-muted">{t.hero.sources}</p></div>
			</div>
		</div>
		<div use:reveal={{ delay: 250 }}><HeroMock lang={data.lang} /></div>
	</header>

	<!-- marquee, full width, edge to edge -->
	<section class="py-16 sm:py-24">
		<p class="mb-6 text-center text-sm text-muted">{fill(t.marquee, { n: data.count })}</p>
		<Marquee items={open.map((r) => ({ slug: r.slug, name: r.app.name, icon: r.app.icon }))} />
	</section>

	<main class="mx-auto max-w-[1200px] px-5 sm:px-8">
		<section id="top" class="scroll-mt-6 py-24 sm:py-36 lg:py-44">
			{@render head(t.top.label, 'chart', t.top.title, t.top.muted, t.top.intro, [t.top.cta, unlock])}
			<div use:reveal><TopList rows={data.rows} unlockHref={unlock} total={data.count} lang={data.lang} /></div>
		</section>

		<section id="how" class="scroll-mt-6 py-24 sm:py-36 lg:py-44">
			{@render head(t.how.label, 'search', t.how.title, t.how.muted, t.how.intro, [t.how.cta, go('/app/analyses')])}
			<HowStory lang={data.lang} />
		</section>

		<section id="founders" class="scroll-mt-6 py-24 sm:py-36 lg:py-44">
			{@render head(t.founders.label, 'flag', t.founders.title, t.founders.muted, t.founders.intro, [t.founders.cta, go('/app/analyses')])}
			<div use:reveal><FoundersCards lang={data.lang} /></div>
			<div class="mt-20 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4" use:reveal>
				{#each t.founders.gains as [g, d]}<div class="flex gap-3" data-stagger><span class="mt-0.5 text-good"><Icon name="check" size={18} /></span><div><p class="font-medium">{g}</p><p class="mt-1 text-sm leading-relaxed text-ink-2">{d}</p></div></div>{/each}
			</div>
		</section>

		<section id="pricing" class="scroll-mt-6 py-24 sm:py-36 lg:py-44">
			<div class="mb-14 flex flex-col items-center gap-5 text-center" use:reveal>
				<span class="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-ink-2"><Icon name="bill" size={13} />{t.pricing.label}</span>
				<h2 class="display text-4xl sm:text-[52px]">{t.pricing.title} <span class="text-muted">{t.pricing.muted}</span></h2>
			</div>
			<div class="mx-auto grid max-w-4xl gap-4 md:grid-cols-2" use:reveal>
				<div class="flex flex-col gap-6 rounded-3xl border border-line p-9" data-stagger>
					<p class="font-medium">{t.pricing.free}</p>
					<p class="big text-6xl">€0</p>
					<ul class="flex flex-col gap-3 text-sm text-ink-2">
						{#each t.pricing.freeList as li}<li class="flex gap-2.5"><Icon name="check" size={16} />{fill(li, { a: PRICE.freeAnalyses })}</li>{/each}
					</ul>
					<a href={go('/signup')} class="btn btn-ghost mt-auto py-3">{t.pricing.freeCta}</a>
				</div>
				<div class="flex flex-col gap-6 rounded-3xl border border-ink bg-[#fafaf8] p-9 ring-1 ring-ink" data-stagger>
					<p class="font-medium">{t.pricing.full}</p>
					<p><span class="big text-6xl">{amount}</span> <span class="text-muted">{t.pricing.perMonth}</span></p>
					<ul class="flex flex-col gap-3 text-sm text-ink-2">
						{#each t.pricing.fullList as li}<li class="flex gap-2.5"><Icon name="check" size={16} />{fill(li, { a: PRICE.paidAnalyses })}</li>{/each}
					</ul>
					<a href={unlock} class="btn btn-primary mt-auto py-3">{t.pricing.fullCta}</a>
				</div>
			</div>
		</section>

		<section id="faq" class="grid scroll-mt-6 gap-12 py-24 sm:py-36 lg:py-44 md:grid-cols-[1fr_1.6fr]">
			<div class="flex flex-col items-start gap-5" use:reveal>
				<span class="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-ink-2"><Icon name="search" size={13} />{t.faq.label}</span>
				<h2 class="display text-4xl sm:text-[52px]">{t.faq.title} <span class="text-muted">{t.faq.muted}</span></h2>
				<p class="text-ink-2">{t.faq.anything} <a href="mailto:hello@getundercut.app" class="underline">hello@getundercut.app</a></p>
			</div>
			<div use:reveal={{ delay: 100 }}>{#key data.lang}<Faq items={faq} />{/key}</div>
		</section>
	</main>

	<!-- ============ FOOTER ============ -->
	<footer class="mt-16 sm:mt-28">
		<div class="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-8 px-5 py-16 sm:px-8 md:flex-row md:items-end">
			<h2 class="display max-w-xl text-4xl sm:text-[56px]" use:reveal>{t.footer.title} <span class="text-muted">{t.footer.muted}</span></h2>
			<a href={go('/app/analyses')} class="btn btn-primary px-6 py-3 text-base" use:reveal={{ delay: 120 }}>{t.footer.cta}</a>
		</div>
		<div class="mx-auto grid max-w-[1200px] gap-10 px-5 py-10 text-sm sm:grid-cols-2 sm:px-8 md:grid-cols-4">
			<div class="flex flex-col gap-3"><p class="font-medium">Undercut</p><p class="text-muted">{t.footer.tagline}</p></div>
			<div class="flex flex-col gap-2.5"><p class="font-medium">{t.footer.product}</p><a href="#top" class="text-muted hover:text-ink">{t.nav.top}</a><a href="#how" class="text-muted hover:text-ink">{t.nav.how}</a><a href="#founders" class="text-muted hover:text-ink">{t.nav.founders}</a><a href="#pricing" class="text-muted hover:text-ink">{t.nav.pricing}</a></div>
			<div class="flex flex-col gap-2.5"><p class="font-medium">{t.footer.account}</p><a href={go('/signup')} class="text-muted hover:text-ink">{t.footer.signup}</a><a href="/login" class="text-muted hover:text-ink">{t.footer.login}</a></div>
			<div class="flex flex-col gap-2.5"><p class="font-medium">{t.footer.contact}</p><a href="mailto:hello@getundercut.app" class="text-muted hover:text-ink">hello@getundercut.app</a><a href="/privacy" class="text-muted hover:text-ink">{t.footer.privacy}</a><a href="/terms" class="text-muted hover:text-ink">{t.footer.terms}</a></div>
		</div>
		<div class="overflow-hidden pt-6">
			<p class="display -mb-[0.22em] text-center text-[21vw] leading-none text-black/[0.05] select-none" aria-hidden="true">undercut</p>
		</div>
		<p class="mx-auto max-w-[1200px] px-5 pt-4 pb-6 text-xs text-muted sm:px-8">© {new Date().getFullYear()} Undercut</p>
	</footer>
</div>
