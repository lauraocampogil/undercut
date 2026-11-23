<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { act } from '#lib/act.ts';
	import StartSetup from '#lib/components/StartSetup.svelte';
	import { dict, UI_LANGS } from '#lib/i18n.ts';
	let { data, form } = $props();
	const t = $derived(dict(page.data.ui));
	const keep = () => async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => update({ reset: false });
</script>

<svelte:head><title>{t.settings} · Undercut</title></svelte:head>

<div class="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
	<section class="card-dark relative overflow-hidden p-6 sm:p-8">
		<h2 class="text-[28px] leading-tight font-medium tracking-[-0.03em]">{t.agencyTitle}</h2>
		<div class="mt-5"><StartSetup profile={data.profile} error={form?.setupError ?? ''} {t} mode="save" saved={Boolean(form?.setupOk)} /></div>
	</section>
	<div class="grid content-start gap-4">
		<section class="card p-6">
			<h2 class="font-medium">{t.langTitle}</h2>
			<p class="mt-1 text-sm text-muted">{t.langHelp}</p>
			<div class="mt-4 flex flex-wrap gap-2">
				{#each UI_LANGS as [k, l] (k)}
					<form method="POST" action={act('ui')} use:enhance={keep}><input type="hidden" name="ui" value={k} /><button class="pill text-sm {page.data.ui === k ? 'pill-active' : ''}">{l}</button></form>
				{/each}
			</div>
		</section>
		<section class="card p-6">
			<h2 class="font-medium">{t.briefTitle}</h2>
			<p class="mt-1 text-sm text-muted">{t.briefHelp}</p>
			<form method="POST" action={act('brief')} use:enhance={keep} class="mt-4 flex flex-wrap items-center gap-3">
				<input type="hidden" name="on" value={data.brief.on ? '0' : '1'} />
				<button class="pill text-sm {data.brief.on ? 'pill-active' : ''}">{data.brief.on ? t.briefOn : t.briefOff}</button>
				{#if !data.brief.ready}<span class="text-xs text-muted">{t.briefNotReady}</span>{/if}
			</form>
		</section>
		<a href="/app/settings/advanced" class="px-2 text-xs text-muted underline">{t.advanced}</a>
	</div>
</div>
