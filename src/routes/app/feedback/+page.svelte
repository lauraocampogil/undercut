<script lang="ts">
	import { enhance } from '$app/forms';
	import { appT } from '#lib/app-i18n.ts';
	let { data, form } = $props();
	const t = $derived(appT(data.lang));
	const F = $derived(t.feedback);
	let found = $state('');
	let pay = $state('');
	let again = $state(false);
	let busy = $state(false);
</script>

<svelte:head><title>{F.title} · Undercut</title></svelte:head>

<section class="mx-auto flex max-w-[720px] flex-col gap-7">
	<header>
		<span class="rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-white">{F.badge}</span>
		<h1 class="mt-3 text-[34px] font-medium tracking-tight">{F.title}</h1>
		<p class="mt-2 text-[15px] leading-relaxed text-ink-2">{F.intro}</p>
	</header>

	{#if form?.thanks && !again}
		<div class="card flex flex-col items-start gap-3 p-6">
			<p class="text-[15px]">{F.thanks}</p>
			<button class="text-sm underline" onclick={() => (again = true)}>{F.again}</button>
		</div>
	{:else}
		<form method="POST" class="card flex flex-col gap-6 p-6 sm:p-8" use:enhance={() => { busy = true; return async ({ update }) => { await update(); busy = false; again = false; found = ''; pay = ''; }; }}>
			{#snippet area(name: string, label: string, ph = '')}
				<label class="block"><span class="text-[15px] font-medium">{label}</span><textarea class="input mt-2 min-h-[88px]" {name} placeholder={ph}></textarea></label>
			{/snippet}
			{#snippet choice(name: string, label: string, opts: [string, string][], bind?: (v: string) => void)}
				<fieldset>
					<legend class="text-[15px] font-medium">{label}</legend>
					<div class="mt-2 flex flex-wrap gap-2">
						{#each opts as [v, l] (v)}
							<label class="cursor-pointer rounded-full border border-line bg-white px-4 py-2 text-sm has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white">
								<input type="radio" {name} value={v} class="sr-only" onchange={() => bind?.(v)} />{l}
							</label>
						{/each}
					</div>
				</fieldset>
			{/snippet}

			{@render area('used', F.used, F.usedPh)}
			{@render choice('found', F.found, F.foundOpts, (v) => (found = v))}
			{#if found === 'yes' || found === 'maybe'}{@render area('foundWhat', F.foundWhat)}{/if}
			{@render area('why', F.why, F.whyPh)}
			{@render area('liked', F.liked)}
			{@render area('confusing', F.confusing)}
			{@render area('missing', F.missing)}
			{@render choice('disappointed', F.disappointed, F.disOpts)}
			{@render area('recommend', F.recommend)}
			{@render choice('pay', F.pay, F.payOpts, (v) => (pay = v))}
			{#if pay === 'less'}<label class="block"><span class="text-[15px] font-medium">{F.price}</span><input class="input mt-2 w-40" name="price" placeholder="€" /></label>{/if}
			{@render area('other', F.other)}
			<button class="btn btn-primary self-start" disabled={busy}>{F.send}</button>
		</form>
	{/if}
</section>
