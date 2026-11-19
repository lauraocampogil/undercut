<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	import { COMPANY, type Section } from '#lib/legal.ts';
	let { title, intro, sections, children }: { title: string; intro: string; sections: Section[]; children?: import('svelte').Snippet } = $props();
	const docs = [
		['/privacy', 'Privacy'],
		['/terms', 'Terms'],
		['/dpa', 'Data processing']
	];
</script>

<svelte:head>
	<title>{title} · Undercut</title>
	<meta name="robots" content="index,follow" />
</svelte:head>

<div class="min-h-dvh text-ink">
	<header class="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-5 pt-6 sm:px-10">
		<a href="/" aria-label="Undercut home"><Logo size={28} /></a>
		<nav class="flex gap-1 text-sm">
			{#each docs as [h, l] (h)}<a href={h} class="rounded-full px-3 py-2 text-ink-2 hover:bg-white/70 hover:text-ink">{l}</a>{/each}
		</nav>
	</header>

	<main class="mx-auto grid max-w-[1180px] gap-14 px-5 pt-20 pb-32 sm:px-10 lg:grid-cols-[220px_1fr] lg:gap-20">
		<aside class="hidden lg:block">
			<nav class="sticky top-10 grid gap-1 text-sm">
				<p class="tag mb-3">On this page</p>
				{#each sections as s (s.id)}<a href="#{s.id}" class="rounded-lg px-2 py-1.5 text-ink-2 hover:bg-white/70 hover:text-ink">{s.h}</a>{/each}
			</nav>
		</aside>
		<article class="max-w-[720px]">
			<p class="tag">Legal · last updated {COMPANY.updated}</p>
			<h1 class="mt-6 text-[clamp(36px,5vw,64px)] leading-[1.05] font-medium tracking-[-0.04em]">{title}</h1>
			<p class="mt-8 text-[19px] leading-[1.75] text-ink-2">{intro}</p>
			{#each sections as s (s.id)}
				<section id={s.id} class="scroll-mt-10 border-t border-black/[.08] pt-10 mt-12">
					<h2 class="text-[24px] leading-tight font-medium tracking-[-0.025em]">{s.h}</h2>
					{#each s.p as para, i (i)}
						{#if Array.isArray(para)}
							<ul class="mt-4 list-disc space-y-2 pl-5 text-[16px] leading-[1.75] text-ink-2">{#each para as li (li)}<li>{li}</li>{/each}</ul>
						{:else}
							<p class="mt-4 text-[16px] leading-[1.75] text-ink-2">{para}</p>
						{/if}
					{/each}
				</section>
			{/each}
			{@render children?.()}
			<p class="mt-16 rounded-[20px] bg-white/60 p-5 text-sm leading-[1.7] text-muted">
				{COMPANY.product} is operated by {COMPANY.name}{COMPANY.form ? `, ${COMPANY.form}` : ''}{COMPANY.enterprise ? `, enterprise number ${COMPANY.enterprise}` : ''}{COMPANY.address ? `, ${COMPANY.address}` : ''}, {COMPANY.country}. Questions: <a class="text-ink underline" href="mailto:{COMPANY.email}">{COMPANY.email}</a>.
			</p>
		</article>
	</main>
</div>
