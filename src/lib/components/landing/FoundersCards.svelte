<script lang="ts">
	// For founders: three numbered cards; the active one opens wide and shows its preview.
	// It moves on by itself every 5 s (pauses while the pointer is over it); click a card to open it.
	import { fade } from 'svelte/transition';
	import { SITE, type Lang } from '#lib/site-i18n.ts';
	let { lang = 'en' as Lang }: { lang?: Lang } = $props();
	const t = $derived(SITE[lang].founders);
	const steps = $derived(t.steps);
	const tones = ['text-good', 'text-warn', 'text-muted'];
	const counts = [42, 31, 12];
	const weeks = [9, 11, 8, 10, 9, 4, 3, 2, 2, 1];
	let active = $state(0);
	let paused = $state(false);
	$effect(() => {
		if (paused || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const t = setInterval(() => (active = (active + 1) % steps.length), 5000);
		return () => clearInterval(t);
	});
</script>

{#snippet preview(i: number)}
	{#if i === 0}
		<div class="rounded-2xl border border-line bg-white p-5">
			<div class="flex items-center gap-3"><span class="grid size-11 place-items-center rounded-xl bg-ink text-sm font-semibold text-white">Y</span><div><p class="font-medium">{t.yourApp}</p><p class="text-xs text-muted">{t.meta}</p></div></div>
			<div class="pop mt-5 flex items-center justify-between gap-3 rounded-xl bg-[#fafaf8] p-3" style="--d:300ms"><p class="text-sm">{t.isYours}</p><span class="btn btn-primary">{t.claim}</span></div>
		</div>
	{:else if i === 1}
		<div class="rounded-2xl border border-line bg-white px-5 py-3 text-sm">
			{#each t.rows as [c, st], k}<div class="pop grid grid-cols-[1.4fr_0.6fr_1.3fr] border-b border-line py-3 last:border-0" style="--d:{k * 160}ms"><span class="font-medium">{c}</span><span class="num text-muted">{counts[k]}</span><span class={tones[k]}>{st}</span></div>{/each}
		</div>
	{:else}
		<div class="rounded-2xl border border-line bg-white p-5">
			<div class="mb-4 flex items-center justify-between"><p class="text-xs text-muted">{t.perWeek}</p><span class="pop rounded-full bg-good-bg px-2.5 py-1 text-xs text-good" style="--d:900ms">{t.verified}</span></div>
			<div class="flex h-24 items-end gap-1.5">{#each weeks as w, k}<span class="growh flex-1 rounded-t {k < 5 ? 'bg-bad/55' : 'bg-good/70'}" style="--h:{(w / 11) * 96}px; --d:{k * 60}ms"></span>{/each}</div>
			<div class="mt-2 flex justify-between text-xs text-muted"><span>{t.before}</span><span>{t.after}</span></div>
		</div>
	{/if}
{/snippet}

<div class="flex flex-col gap-4 md:h-[460px] md:flex-row" role="tablist" aria-label={t.label} onpointerenter={() => (paused = true)} onpointerleave={() => (paused = false)}>
	{#each steps as s, i}
		<div
			role="tab"
			tabindex="0"
			aria-selected={active === i}
			onclick={() => (active = i)}
			onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (active = i)}
			class="relative flex cursor-pointer flex-col overflow-hidden rounded-3xl border p-7 text-left transition-[flex-grow,background-color,border-color] duration-700 ease-[cubic-bezier(.2,.75,.15,1)] md:min-w-0 {active === i ? 'border-ink/15 bg-[#fafaf8] md:grow-[3]' : 'border-line bg-white hover:border-black/20 md:grow'}"
			style="flex-basis:0"
		>
			<div class="flex items-start justify-between gap-4">
				<span class="big text-6xl transition-colors duration-500 {active === i ? 'text-ink' : 'text-black/10'}">0{i + 1}.</span>
				{#if active === i && !paused}<span class="mt-3 h-1 w-16 overflow-hidden rounded-full bg-black/10"><span class="block h-full animate-[cardbar_5s_linear_forwards] bg-ink"></span></span>{/if}
			</div>
			<div class="mt-auto pt-8">
				<p class="text-lg font-medium">{s.t}</p>
				{#if active === i}
					<div in:fade={{ duration: 400, delay: 250 }}>
						<p class="mt-2 max-w-md text-sm leading-relaxed text-ink-2">{s.d}</p>
						<div class="mt-6 hidden md:block">{@render preview(i)}</div>
					</div>
				{/if}
				<div class="mt-5 md:hidden">{@render preview(i)}</div>
			</div>
		</div>
	{/each}
</div>

<style>
	@keyframes -global-cardbar {
		from {
			width: 0;
		}
		to {
			width: 100%;
		}
	}
</style>
