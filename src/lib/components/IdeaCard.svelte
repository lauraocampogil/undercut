<script lang="ts">
	import type { Idea } from '#lib/review-types.ts';
	import { SOURCES } from '#lib/review-types.ts';
	let { idea, open = false, product = '', href = '' }: { idea: Idea; open?: boolean; product?: string; href?: string } = $props();
	let more = $state(false);
	$effect(() => {
		more = open;
	});
	const stars = (n: number) => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '');
</script>

<article class="card flex flex-col gap-5 p-6">
	<header class="flex flex-wrap items-start justify-between gap-3">
		<div class="min-w-0 flex-1">
			<p class="text-xs text-muted">
				{#if product}{#if href}<a {href} class="underline">{product}</a>{:else}{product}{/if} · {/if}{idea.topicLabel}
			</p>
			<h3 class="mt-1.5 text-xl font-medium tracking-tight">{idea.title}</h3>
		</div>
		<span class="flex shrink-0 gap-1" title="How big the problem looks: {idea.strength}/5" aria-label="Strength {idea.strength} of 5">
			{#each [1, 2, 3, 4, 5] as i}<span class="h-4 w-1.5 rounded-full {i <= idea.strength ? 'bg-ink' : 'bg-line'}"></span>{/each}
		</span>
	</header>

	<div class="grid gap-3 sm:grid-cols-3">
		<div class="rounded-2xl bg-[#f6f6f4] p-4">
			<p class="big text-3xl">{idea.share}%</p>
			<p class="mt-1 text-xs text-ink-2">of {idea.product}’s reviews ({idea.count} of {idea.total})</p>
		</div>
		<div class="rounded-2xl bg-[#f6f6f4] p-4 sm:col-span-2">
			<p class="text-xs text-muted">The problem</p>
			<p class="mt-1 text-sm leading-relaxed">{idea.problem}</p>
		</div>
	</div>

	<div>
		<p class="text-xs text-muted">What you could build</p>
		<p class="mt-1 text-[15px] leading-relaxed">{idea.build}</p>
		{#if idea.best}<p class="mt-2 text-xs text-ink-2">Best competitor on this: {idea.best.name}, only {idea.best.share}% of its reviews.</p>{/if}
	</div>

	{#if more}
		<div class="grid gap-5 sm:grid-cols-2">
			<div>
				<p class="text-xs text-muted">Who has this problem</p>
				<p class="mt-1 text-sm leading-relaxed">{idea.audience}</p>
			</div>
			<div>
				<p class="text-xs text-muted">What {idea.product} could fix</p>
				<p class="mt-1 text-sm leading-relaxed">{idea.improve}</p>
			</div>
		</div>
		{#if idea.seo.length}
			<div>
				<p class="text-xs text-muted">Content & SEO ideas</p>
				<ul class="mt-2 flex flex-col gap-1.5 text-sm">{#each idea.seo as s}<li class="flex gap-2"><span class="text-muted">→</span>{s}</li>{/each}</ul>
				{#if idea.keywords.length}<div class="mt-3 flex flex-wrap gap-1.5">{#each idea.keywords as k}<span class="rounded-full border border-line px-2.5 py-1 text-xs text-ink-2">{k}</span>{/each}</div>{/if}
			</div>
		{/if}
		{#if idea.quotes.length}
			<div>
				<p class="text-xs text-muted">Proof: real reviews</p>
				<ul class="mt-2 flex flex-col gap-2">
					{#each idea.quotes as q}
						<li class="rounded-2xl border border-line p-4 text-sm">
							<p class="leading-relaxed">“{q.text}”</p>
							<p class="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
								{#if q.stars}<span class="tracking-tight text-ink">{stars(q.stars)}</span>{/if}
								<span>{SOURCES[q.source as keyof typeof SOURCES] ?? q.source}</span><span>·</span><span>{q.date}</span>
								{#if q.url}<a href={q.url} target="_blank" rel="noopener" class="underline">Open ↗</a>{/if}
							</p>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/if}
	<button class="self-start text-sm underline" onclick={() => (more = !more)}>{more ? 'Show less' : 'Proof, audience & SEO ideas'}</button>
</article>
