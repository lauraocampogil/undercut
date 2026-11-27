<script lang="ts">
	// One thing users want: how big it is, what it means, what to do, and the reviews that prove it.
	import { enhance } from '$app/forms';
	import { SOURCES } from '#lib/review-types.ts';
	import { kindOf } from '#lib/kinds.ts';
	import type { AppDict } from '#lib/app-i18n.ts';
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let { data, form, t, back, backLabel, canFix = false }: { data: any; form: any; t: AppDict; back: string; backLabel: string; canFix?: boolean } = $props();
	const T = $derived(t.item);

	const k = $derived(kindOf(data.item.kind));
	const maxOther = $derived(Math.max(1, ...data.others.map((o: { n: number }) => o.n)));
	let shown = $state(6);
	let asking = $state(false);
	let insightForm = $state<HTMLFormElement>();
	let trForm = $state<HTMLFormElement>();
	let howForm = $state<HTMLFormElement>();
	let howBusy = $state(false);
	// each automatic request is tried once per page view: a failure shows its message and a retry link, never a loop
	let insightTried = $state(false);
	let howTried = $state(false);
	let trTried = $state(false);
	let insightError = $state('');
	let howError = $state('');
	$effect(() => {
		if (data.best && !data.best.how && howForm && !howBusy && !howTried) {
			howTried = true;
			howForm.requestSubmit();
		}
	});
	let translating = $state(false);
	let original = $state(false);
	let zoom = $state<string | null>(null);
	// the full analysis is written on first open (a few seconds), then kept
	$effect(() => {
		if (!data.insight && insightForm && !asking && !insightTried) {
			insightTried = true;
			insightForm.requestSubmit();
		}
	});
	// reviews in the dashboard's language: translated once, then kept
	$effect(() => {
		if (data.untranslated && trForm && !translating && !trTried) {
			trTried = true;
			trForm.requestSubmit();
		}
	});
	const SRC: Record<string, string> = { googleplay: 'Google Play', hackernews: 'Hacker News', github: 'GitHub', appstore: 'App Store' };
	const stars = (n: number) => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '');
</script>

<form method="POST" action="?/insight" bind:this={insightForm} class="hidden" use:enhance={() => { asking = true; insightError = ''; return async ({ result, update }) => { if (result.type === 'failure') insightError = String(result.data?.insightError ?? 'Error'); await update({ reset: false }); asking = false; }; }}></form>
{#if data.best}<form method="POST" action="?/how" bind:this={howForm} class="hidden" use:enhance={() => { howBusy = true; howError = ''; return async ({ result, update }) => { if (result.type === 'failure') howError = String(result.data?.howError ?? 'Error'); await update({ reset: false }); howBusy = false; }; }}><input type="hidden" name="rival" value={data.best.name} /></form>{/if}
<form method="POST" action="?/translate" bind:this={trForm} class="hidden" use:enhance={() => { translating = true; return async ({ update }) => { await update({ invalidateAll: true, reset: false }); translating = false; }; }}></form>

{#snippet shots(list: string[], name: string)}
	<div class="flex gap-3 overflow-x-auto pb-1">
		{#each list as src}
			<button class="shrink-0 cursor-zoom-in" onclick={() => (zoom = src)} aria-label="{name} screenshot"><img {src} alt="{name} screenshot" class="h-72 rounded-xl border border-line" loading="lazy" /></button>
		{/each}
	</div>
{/snippet}

{#if zoom}
	<div class="fixed inset-0 z-50 grid place-items-center bg-black/80 p-6" role="dialog" aria-modal="true" tabindex="-1" onclick={() => (zoom = null)} onkeydown={(e) => e.key === 'Escape' && (zoom = null)}>
		<img src={zoom} alt="" class="max-h-[90vh] max-w-[90vw] rounded-2xl" />
		<button class="absolute top-5 right-5 rounded-full bg-white px-4 py-2 text-sm" onclick={() => (zoom = null)}>{T.close}</button>
	</div>
{/if}

<div class="mx-auto flex max-w-[1080px] flex-col gap-7">
	<a href={back} class="text-sm text-muted">{backLabel}</a>

	<header class="flex flex-col gap-3">
		<div class="flex flex-wrap items-center gap-2">
			<span class="rounded-full px-2.5 py-1 text-xs font-medium" style="background:{k.bg};color:{k.fg}">{t.kinds[data.item.kind] ?? k.label}</span>
			<span class="text-[13px] text-muted">{T.rankFor(data.rank, data.app.name)}</span>
		</div>
		<h1 class="text-[34px] leading-[1.1] font-medium tracking-tight sm:text-[40px]">{data.item.label}</h1>
	</header>

	<section class="grid grid-cols-2 gap-3 md:grid-cols-4">
		<div class="rounded-[18px] bg-ink p-5 text-white"><p class="text-xs text-white/60">{T.asking}</p><p class="big mt-1.5 text-[38px] leading-none">{data.n}</p></div>
		<div class="card p-5"><p class="text-xs text-muted">{T.ofAll}</p><p class="big mt-1.5 text-[38px] leading-none">{data.share}%</p></div>
		<div class="rounded-[18px] p-5 {data.delta && data.delta > 0 ? 'bg-bad-bg text-bad' : 'bg-[#f1f1ee] text-ink-2'}">
			<p class="text-xs">{T.sinceLast}</p>
			<p class="big mt-1.5 text-[38px] leading-none">{data.delta == null ? '—' : data.delta > 0 ? `▲ ${data.delta}` : data.delta < 0 ? `▼ ${-data.delta}` : '0'}</p>
		</div>
		<div class="rounded-[18px] p-5" style="background:{data.signal.bg};color:{data.signal.fg}"><p class="text-xs">{T.signal}</p><p class="big mt-1.5 text-[38px] leading-none">{t.signal[data.signal.label] ?? data.signal.label}</p></div>
	</section>

	{#if data.insight}
		<section class="grid gap-3.5 lg:grid-cols-3">
			<div class="card flex flex-col gap-3 p-6 lg:col-span-2">
				<p class="text-xs font-semibold tracking-wider text-muted uppercase">{T.mean}</p>
				<ul class="flex list-disc flex-col gap-2 pl-5 text-[15px] leading-relaxed">{#each data.insight.mean as m}<li>{m}</li>{/each}</ul>
			</div>
			<div class="flex flex-col gap-2.5 rounded-[20px] border border-[#d5ecdc] bg-[#f3faf5] p-6">
				<p class="text-xs font-semibold tracking-wider text-[#1e6b3a] uppercase">{T.todo}</p>
				<p class="text-[15px] leading-relaxed font-medium">{data.insight.todo}</p>
			</div>
		</section>
		<section class="grid gap-3.5 md:grid-cols-2 lg:grid-cols-4">
			<div class="card p-5"><p class="text-xs font-semibold tracking-wider text-[#b3261e] uppercase">{T.why}</p><p class="mt-2 text-sm leading-relaxed">{data.insight.why}</p></div>
			<div class="card p-5"><p class="text-xs font-semibold tracking-wider text-[#b45f06] uppercase">{T.whyNow}</p><p class="mt-2 text-sm leading-relaxed">{data.insight.whyNow}</p></div>
			<div class="card p-5"><p class="text-xs font-semibold tracking-wider text-[#1a56db] uppercase">{T.who}</p><p class="mt-2 text-sm leading-relaxed">{data.insight.who}</p></div>
			<div class="card p-5"><p class="text-xs font-semibold tracking-wider text-[#6a43d6] uppercase">{T.say}</p><p class="mt-2 text-sm leading-relaxed font-medium">“{data.insight.pitch}”</p></div>
		</section>
	{:else}
		<section class="card flex items-center gap-3 p-6 text-sm text-ink-2">
			{#if insightError}{insightError} <button class="underline" onclick={() => insightForm?.requestSubmit()}>{T.retry}</button>
			{:else}<span class="size-2 animate-pulse rounded-full bg-ink"></span>{T.writing(data.n)}{/if}
		</section>
	{/if}

	<!-- same ask elsewhere: the comparison -->
	<section class="card flex flex-col gap-3 p-6">
		<p class="text-xs font-semibold tracking-wider text-muted uppercase">{T.same}</p>
		{#each data.others as o}
			<div class="grid grid-cols-[130px_1fr_90px] items-center gap-3 text-sm">
				<span class="truncate {o.main ? 'font-medium' : ''}">{o.name}</span>
				<span class="h-2.5 overflow-hidden rounded-full bg-[#f1f1ee]"><span class="block h-full rounded-full" style="width:{(o.n / maxOther) * 100}%;background:{o.color}"></span></span>
				<span class="text-right text-ink-2">{T.reviewsN(o.n)}</span>
			</div>
		{/each}
		{#if data.best}
			<div class="mt-2 flex flex-col gap-3 border-t border-line pt-4">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<p class="text-[14px] text-good">{T.best(data.best.name, data.best.n === 0)}</p>
					<span class="flex gap-3 text-[13px] font-medium">
						{#if data.best.inDb}<a href="/app/database/{data.best.slug}" class="underline">{T.seeIn(data.best.name)}</a>{/if}
						{#if data.best.store}<a href={data.best.store} target="_blank" rel="noopener" class="text-muted underline">{T.storeOpen}</a>{/if}
					</span>
				</div>
				<div class="rounded-2xl bg-[#f3faf5] p-5">
					<p class="text-xs font-semibold tracking-wider text-[#1e6b3a] uppercase">{T.howBy(data.best.name)}</p>
					{#if data.best.how}
						{#if data.best.how.points.length}<ul class="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-relaxed">{#each data.best.how.points as p}<li>{p}</li>{/each}</ul>{/if}
						{#if data.best.how.thin}<p class="mt-2 text-[13px] text-muted">{T.howThin}</p>{/if}
						{#if data.best.how.proof.length}
							<div class="mt-3 grid gap-2 md:grid-cols-3">
								{#each data.best.how.proof as r (r.id)}<blockquote class="rounded-xl bg-white p-3 text-[13px] leading-relaxed text-ink-2"><span class="text-[#e8a317]">{stars(r.stars)}</span><br />{r.text.slice(0, 260)}</blockquote>{/each}
							</div>
						{/if}
						<p class="mt-2 text-xs text-muted">{T.howSource}</p>
					{:else if howError}
						<p class="mt-2 text-sm text-ink-2">{howError} <button class="underline" onclick={() => howForm?.requestSubmit()}>{T.retry}</button></p>
					{:else}
						<p class="mt-2 flex items-center gap-2 text-sm text-ink-2"><span class="size-2 animate-pulse rounded-full bg-ink"></span>{T.howLoading(data.best.name)}</p>
					{/if}
				</div>
				{#if data.best.screenshots.length}
					<p class="text-[13px] text-muted">{T.howTitle(data.best.name)}</p>
					{@render shots(data.best.screenshots, data.best.name)}
				{:else}
					<p class="text-[13px] text-muted">{T.howEmpty(data.best.name)}</p>
				{/if}
			</div>
		{/if}
	</section>

	<!-- the proof -->
	<section class="flex flex-col gap-4">
		<div class="flex flex-wrap items-baseline justify-between gap-3">
			<h2 class="text-[22px] font-medium tracking-tight">{T.proof}</h2>
			<span class="flex items-center gap-3 text-[13px] text-muted">
				{#if translating}<span class="flex items-center gap-2"><span class="size-2 animate-pulse rounded-full bg-ink"></span>{T.translating}</span>
				{:else if data.reviews.some((r: { translated: boolean }) => r.translated)}<button class="underline" onclick={() => (original = !original)}>{original ? T.showTranslated : T.showOriginal}</button>{/if}
				<span>{T.ofReviews(Math.min(shown, data.reviews.length), data.n)}</span>
			</span>
		</div>
		<div class="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
			{#each data.reviews.slice(0, shown) as r (r.id)}
				<figure class="card flex flex-col gap-2.5 p-5">
					<div class="flex items-center justify-between">{#if r.stars}<span class="text-[15px] tracking-wide text-[#e8a317]">{stars(r.stars)}</span>{:else}<span class="text-xs text-muted">{T.forum}</span>{/if}<span class="text-xs text-muted">{r.date}</span></div>
					{#if (original ? r.origTitle : r.title)}<p class="text-[15px] font-medium">{original ? r.origTitle : r.title}</p>{/if}
					<blockquote class="text-sm leading-relaxed text-ink-2">{original ? r.origText : r.text}</blockquote>
					<figcaption class="mt-auto flex items-center justify-between gap-2 border-t border-line pt-2.5 text-xs text-muted">
						<span title={r.source === 'appstore' ? T.noLink : ''}>{SRC[r.source] ?? SOURCES[r.source as keyof typeof SOURCES] ?? r.source}{r.version ? ` · v${r.version}` : ''}</span>
						{#if r.url}<a href={r.url} target="_blank" rel="noopener" class="underline">{T.openOn(SRC[r.source] ?? r.source)}</a>{/if}
					</figcaption>
				</figure>
			{/each}
		</div>
		{#if data.reviews.length > shown}<button class="btn btn-ghost self-center" onclick={() => (shown += 9)}>{T.more(data.reviews.length - shown)}</button>{/if}
		{#if data.app.screenshots.length}
			<div class="card flex flex-col gap-3 p-5">
				<p class="text-[13px] text-muted">{T.screens(data.app.name)}</p>
				{@render shots(data.app.screenshots, data.app.name)}
			</div>
		{/if}
	</section>

	{#if canFix && data.claimed}
		<form method="POST" action="?/fix" use:enhance class="card flex flex-wrap items-center gap-3 p-5 text-sm">
			<span class="flex-1">{T.status}</span>
			<select name="status" class="select input w-auto" value={data.fix?.status ?? 'none'}>{#each Object.entries(T.statuses) as [v, l]}<option value={v}>{l}</option>{/each}</select>
			<button class="btn btn-primary">{T.save}</button>
		</form>
	{/if}
</div>
