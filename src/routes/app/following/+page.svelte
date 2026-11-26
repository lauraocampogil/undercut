<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '#lib/components/Icon.svelte';
	import { appT } from '#lib/app-i18n.ts';
	let { data } = $props();
	const t = $derived(appT(data.lang));
	const F = $derived(t.following);
</script>

<svelte:head><title>{F.title} · Undercut</title></svelte:head>

<section class="flex flex-col gap-9">
	<header>
		<h1 class="text-[34px] font-medium tracking-tight">{F.title}</h1>
		<p class="mt-1 max-w-2xl text-sm text-ink-2">{F.intro}</p>
	</header>

	{#if data.followed.length}
		<div class="grid gap-3.5 md:grid-cols-3">
			{#each data.followed as f (f.id)}
				<a href="/app/analyses/{f.id}" class="card flex flex-col gap-3.5 p-5 hover:border-black/25">
					<span class="flex items-center gap-2.5">{#if f.icon}<img src={f.icon} alt="" class="size-9 rounded-[10px] border border-line" />{/if}<span class="truncate font-medium">{f.name}</span></span>
					<span class="grid grid-cols-3 gap-2 text-center">
						<span class="rounded-xl bg-[#e8f0fe] px-1 py-2.5 text-[#1a56db]"><span class="block text-[22px] leading-none font-semibold">{f.newN}</span><span class="text-[11px]">{F.new}</span></span>
						<span class="rounded-xl bg-bad-bg px-1 py-2.5 text-bad"><span class="block text-[22px] leading-none font-semibold">{f.up}</span><span class="text-[11px]">{F.rising}</span></span>
						<span class="rounded-xl bg-good-bg px-1 py-2.5 text-good"><span class="block text-[22px] leading-none font-semibold">{f.down}</span><span class="text-[11px]">{F.down}</span></span>
					</span>
					{#if f.top}<span><span class="block text-[13px] text-muted">{F.top}</span><span class="mt-0.5 block text-[15px] leading-snug font-medium">{f.top}</span></span>{/if}
				</a>
			{/each}
		</div>
	{:else}
		<div class="card p-5 text-sm text-ink-2">{F.none}</div>
	{/if}

	{#if data.analyses.length}
		<section class="flex flex-col gap-3.5">
			<h2 class="text-xl font-medium tracking-tight">{F.all}</h2>
			<div class="card overflow-hidden">
				{#each data.analyses as a (a.id)}
					<div class="group relative flex items-center gap-3.5 border-b border-line px-5 py-3.5 last:border-0 hover:bg-[#fafaf8]">
						<a href="/app/analyses/{a.id}" class="absolute inset-0" aria-label={a.name}></a>
						{#if a.icon}<img src={a.icon} alt="" class="size-9 shrink-0 rounded-xl border border-line" />{/if}
						<span class="min-w-0 flex-1"><span class="block truncate font-medium">{a.name}</span><span class="block truncate text-[13px] text-muted">{a.topWant ? `#1: ${a.topWant}` : F.update}</span></span>
						<span class="rounded-full border border-line px-2.5 py-1 text-xs {a.watching ? 'text-ink' : 'text-muted'}">{a.watching ? F.following : F.notFollowed}</span>
						<form method="POST" action="/app/analyses?/remove" class="relative" use:enhance onsubmit={(e) => { if (!confirm(F.confirmRemove(a.name))) e.preventDefault(); }}>
							<input type="hidden" name="id" value={a.id} />
							<button class="icon-btn size-8 text-muted hover:text-bad sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100" aria-label="{F.remove} {a.name}" title={F.remove}><Icon name="x" size={15} /></button>
						</form>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</section>
