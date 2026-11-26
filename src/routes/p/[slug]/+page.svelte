<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	import ReviewBoard from '#lib/components/ReviewBoard.svelte';
	import IdeaCard from '#lib/components/IdeaCard.svelte';
	import SideBySide from '#lib/components/SideBySide.svelte';
	import { PRICE } from '#lib/pricing.ts';
	let { data } = $props();
	const app = $derived(data.open ? data.a.main.app : data.app);
	const comps = $derived(data.open ? data.a.competitors.map((c) => c.app.name) : data.competitors.map((c) => c.name));
	const link = $derived(app.domain ?? app.url);
	const unlock = $derived(data.open ? '' : data.signedIn ? '/app/settings/billing' : `/signup?next=${encodeURIComponent('/app/settings/billing')}`);
</script>

<svelte:head>
	<title>{app.name}: what users hate · Undercut</title>
	<meta name="description" content="{app.name} vs {comps.join(', ')}: what their users complain about, compared." />
</svelte:head>

<div class="mx-auto flex max-w-[1240px] flex-col gap-8 px-5 py-6 sm:px-8">
	<nav class="flex items-center justify-between"><a href="/"><Logo /></a><a href="/#top" class="text-sm text-muted">← Database</a></nav>
	<header class="flex flex-wrap items-center gap-5">
		{#if app.icon}<img src={app.icon} alt="" class="size-20 rounded-3xl" />{/if}
		<div class="min-w-0 flex-1">
			<h1 class="display text-4xl sm:text-5xl">{app.name}</h1>
			<p class="text-sm text-muted">{app.genre} · <a href={app.domain ? `https://${app.domain}` : app.url} target="_blank" rel="noopener" class="underline">{app.domain ?? 'Store page'}</a></p>
		</div>
		{#if data.p.owner}
			<div class="card px-6 py-4 text-center"><p class="tag">Fix score</p><p class="big text-5xl">{data.p.score}%</p><p class="text-xs text-muted">✓ Verified team</p></div>
		{:else}
			<a href="/app/analyses?url={encodeURIComponent(link)}" class="card flex flex-col px-5 py-4 text-sm"><span class="font-medium">Is this your product?</span><span class="text-muted">Verify it and show what you fixed →</span></a>
		{/if}
	</header>

	{#if data.open}
		{#if data.report.answer}
			<section class="rounded-3xl bg-ink p-7 text-white sm:p-9">
				<p class="text-[13px] text-white/60">The answer</p>
				<p class="mt-2 text-[28px] leading-tight font-medium tracking-tight">{app.name}’s #1 problem: {data.report.answer.topic.toLowerCase()}.</p>
				<p class="mt-3 text-[15px] text-white/75">{data.report.answer.n} reviews say it{data.report.answer.times && data.report.answer.times >= 1.2 ? `, ${data.report.answer.times}× more than its competitors` : ''}.{data.report.answer.best ? ` ${data.report.answer.best.name} gets far fewer complaints about it.` : ''}</p>
			</section>
		{/if}
		<SideBySide r={data.report} />
		<h2 class="text-[22px] font-medium tracking-tight">Every review</h2>
		<ReviewBoard a={data.a} verified={data.verified} start="reviews" />
		{#if data.ideas.length}
			<section class="flex flex-col gap-4">
				<h2 class="text-2xl font-medium tracking-tight">Ideas from {app.name}’s reviews</h2>
				<div class="grid gap-4 xl:grid-cols-2">{#each data.ideas as idea, i (idea.id)}<IdeaCard {idea} open={i === 0} />{/each}</div>
			</section>
		{/if}
	{:else}
		<div class="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
			<div class="card p-6 sm:p-8">
				<p class="tag">What users complain about most</p>
				<ul class="mt-5 divide-y divide-line">
					{#each data.top as t, i}
						<li class="flex items-center gap-4 py-3.5">
							<span class="w-5 text-sm text-muted">{i + 1}</span>
							<span class="flex-1 {i > 0 ? 'blur-[5px] select-none' : ''}" aria-hidden={i > 0}>{i > 0 ? 'Hidden topic name here' : t.label}</span>
							<span class="text-sm text-muted">{t.n} reviews</span>
						</li>
					{/each}
				</ul>
				<p class="mt-5 text-sm text-ink-2">{data.total} reviews read from the App Store, Google Play, Hacker News and GitHub, compared with {comps.join(', ')}.</p>
			</div>
			<div class="card flex flex-col justify-between gap-6 p-6 sm:p-8">
				<div>
					<p class="text-xl font-medium tracking-tight">See every topic and every review</p>
					<p class="mt-2 text-sm leading-relaxed text-ink-2">Unlock the whole database: all products, all topics, every review with its link{data.ideaCount ? `, ${data.ideaCount} ideas for this product` : ''}, and {PRICE.paidAnalyses} new analyses a day.</p>
				</div>
				<div class="flex flex-col gap-2">
					<a href={unlock} class="btn btn-primary justify-center py-3">Unlock the database · {PRICE.full}</a>
					<a href="/app/analyses?url={encodeURIComponent(link)}" class="btn btn-ghost justify-center py-3">Or use a free analysis on it</a>
				</div>
			</div>
		</div>
	{/if}
	<p class="text-xs text-muted">Excerpts of public reviews from the App Store and Google Play, comments from Hacker News and GitHub issues. Updated {data.p.updatedAt.slice(0, 10)}.</p>
</div>
