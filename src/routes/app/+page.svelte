<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { act } from '#lib/act.ts';
	import StartSetup from '#lib/components/StartSetup.svelte';
	import Inbox from '#lib/components/Inbox.svelte';
	import { dict } from '#lib/i18n.ts';
	let { data, form } = $props();

	const t = $derived(dict(page.data.ui));
	const hour = new Date().getHours();
	const hello = $derived(t.hello[hour < 12 ? 0 : hour < 18 ? 1 : 2]);
	const left = $derived(Math.max(0, data.quota - data.used));
	let finding = $state(false);
</script>

<svelte:head><title>{t.today} · Undercut</title></svelte:head>

{#if !data.profile || !data.started}
	<section class="card-dark relative overflow-hidden p-6 sm:p-10">
		<div class="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-accent/30 blur-3xl"></div>
		<p class="relative text-sm text-accent">{t.start1}</p>
		<h1 class="relative mt-2 max-w-3xl text-[34px] leading-tight font-medium sm:text-[52px]">{t.startTitle}</h1>
		<p class="relative mt-3 max-w-xl text-white/60">{t.startText}</p>
		<div class="relative mt-6 max-w-2xl"><StartSetup profile={data.profile} error={form?.setupError ?? form?.findError ?? ''} {t} /></div>
	</section>
{:else}
	<section class="flex flex-wrap items-end justify-between gap-6">
		<div>
			<p class="label">{hello} · {data.profile.name}</p>
			<h1 class="display mt-2 text-[48px] sm:text-[76px]"><em>{t.today}</em></h1>
		</div>
		<div class="flex flex-wrap items-end gap-x-10 gap-y-4">
			<div><p class="big text-5xl">{data.inbox.length}</p><p class="mt-1 text-sm text-muted">{t.toApprove}</p></div>
			<div><p class="big text-5xl">{data.week.sent}</p><p class="mt-1 text-sm text-muted">{t.sentWeek}</p></div>
			<div><p class="big text-5xl">{data.week.replied}</p><p class="mt-1 text-sm text-muted">{t.repliesWeek}</p></div>
		</div>
	</section>

	{#if data.inbox.some((i) => i.old)}
		<form method="POST" action={act('refresh')} class="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-warn-bg p-4 text-sm text-warn" use:enhance={() => { finding = true; return async ({ update }) => { await update({ reset: false }); finding = false; }; }}>
			<p class="max-w-2xl">{t.oldBanner}</p>
			<button class="btn btn-primary text-sm" disabled={finding}>{finding ? `${t.finding} ${data.profile.city}…` : t.oldBtn}</button>
		</form>
	{/if}
	<div class="mt-6"><Inbox items={data.inbox} week={data.week} waiting={data.waiting} {t} mailbox={data.mailbox} /></div>

	<form
		method="POST"
		action={act('find')}
		class="mt-4 flex flex-wrap items-center gap-3"
		use:enhance={() => {
			finding = true;
			return async ({ update }) => {
				await update({ reset: false });
				finding = false;
			};
		}}
	>
		<button class="btn btn-primary" disabled={finding || !left}>{finding ? `${t.finding} ${data.profile.city}…` : `+ ${t.find5}`}</button>
		<span class="text-xs text-muted">{t.searchesLeft(left, data.quota)}</span>
		{#if form?.findError}<span class="text-sm text-bad">{form.findError}</span>{/if}
		{#if form?.found}<span class="text-sm text-good">{t.found(Number(form.found))}</span>{/if}
	</form>
{/if}
