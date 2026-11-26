<script lang="ts">
	let { data } = $props();
	const site = 'https://getundercut.app';
	let copied = $state('');
	const badge = (slug: string) => `<a href="${site}/p/${slug}"><img src="${site}/p/${slug}/badge.svg" alt="Fix score on Undercut" height="28"></a>`;
	function copy(slug: string) {
		navigator.clipboard.writeText(badge(slug));
		copied = slug;
		setTimeout(() => (copied = ''), 1800);
	}
</script>

<svelte:head><title>My products · Undercut</title></svelte:head>

<div class="flex flex-col gap-6">
	<header>
		<h1 class="text-3xl font-medium tracking-tight">My products</h1>
		<p class="mt-1 text-sm text-ink-2">The products you claimed. Mark what you fixed: once complaints drop by half, the fix is verified and your score goes up.</p>
	</header>

	{#each data.claimed as p (p.id)}
		<article class="card grid gap-6 p-6 lg:grid-cols-[1.3fr_1fr_1fr]">
			<div class="flex items-start gap-4">
				{#if p.icon}<img src={p.icon} alt="" class="size-14 rounded-2xl border border-line" />{/if}
				<div class="min-w-0">
					<p class="text-lg font-medium">{p.name}</p>
					<p class="text-sm text-muted">{p.genre}</p>
					<div class="mt-3 flex flex-wrap gap-2">
						<a href="/app/analyses/{p.id}" class="btn btn-primary">Mark fixes</a>
						<a href="/p/{p.slug}" target="_blank" class="btn btn-ghost">Public page ↗</a>
					</div>
				</div>
			</div>
			<div>
				<p class="tag">Fix score</p>
				<p class="big mt-1 text-5xl">{p.score}%</p>
				<p class="mt-2 text-sm text-ink-2">{p.verified} verified · {p.fixed} marked fixed · {p.working} in progress · {p.total} topics</p>
			</div>
			<div class="flex flex-col gap-3">
				<p class="tag">Still open</p>
				{#each p.open as c}
					<p class="flex justify-between gap-3 text-sm"><span class="truncate">{c.label}</span><span class="text-muted">{c.n}</span></p>
				{:else}
					<p class="text-sm text-ink-2">Every topic has a status.</p>
				{/each}
				<div class="mt-auto flex items-center gap-3 pt-2">
					<img src="/p/{p.slug}/badge.svg" alt="Badge" class="h-7" />
					<button class="text-xs underline" onclick={() => copy(p.slug)}>{copied === p.slug ? 'Copied' : 'Copy badge code'}</button>
				</div>
			</div>
		</article>
	{:else}
		<div class="card flex flex-col items-start gap-4 p-8">
			<p class="text-lg font-medium">You haven’t claimed a product yet</p>
			<p class="max-w-lg text-sm leading-relaxed text-ink-2">Analyse your own product, then click “Claim” on its page. You’ll be able to mark which complaints you fixed, get a public fix score and a badge for your website.</p>
			<a href="/app/analyses" class="btn btn-primary">Analyse my product</a>
		</div>
	{/each}
</div>
