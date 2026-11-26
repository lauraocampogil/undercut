<script lang="ts">
	import { enhance } from '$app/forms';
	import WantsList from '#lib/components/WantsList.svelte';
	import { appT } from '#lib/app-i18n.ts';
	let { data, form } = $props();
	const t = $derived(appT(data.lang));
	const P = $derived(t.product);
	const a = $derived(data.a);
	const r = $derived(data.report);
	const w = $derived(data.w);
	const fmt = (d: string) => (d ? new Date(d).toLocaleDateString(t.locale, { day: 'numeric', month: 'short' }) : '');
	let adding = $state(false);
	let addBusy = $state(false);
	let pickTheme = $state('');
	let boardKey = $state(0);
	function readTopic(id: string) {
		pickTheme = id;
		boardKey++;
		requestAnimationFrame(() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' }));
	}
	let refreshing = $state(false);
	let copied = $state(false);
	let finding = $state(false);
	let claimOpen = $state(false);
	let checking = $state(false);
	let method = $state<'email' | 'site'>('email');
	$effect(() => {
		if (form && 'site' in form && form.site) method = 'site';
	});
	const site = 'https://getundercut.app';
	const badge = $derived(`<a href="${site}/p/${data.slug}"><img src="${site}/p/${data.slug}/badge.svg" alt="Fix score on Undercut" height="28"></a>`);
</script>

<svelte:head><title>{P.wantsFrom} {a.main.app.name} · Undercut</title></svelte:head>

<section class="flex flex-col gap-7">
	<a href="/app/analyses" class="text-sm text-muted">{P.home}</a>

	<header class="flex flex-wrap items-center gap-4">
		{#if a.main.app.icon}<img src={a.main.app.icon} alt="" class="size-14 rounded-2xl border border-line" />{/if}
		<div class="min-w-[240px] flex-1">
			<p class="text-[13px] text-muted">{P.wantsFrom}</p>
			<h1 class="text-3xl font-medium tracking-tight sm:text-[34px]">{a.main.app.name}</h1>
			<p class="mt-1 text-[13px] text-muted">{P.read(w.read)}{w.from ? ` · ${fmt(w.from)} – ${fmt(w.to)}` : ''} · App Store, Google Play</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<form method="POST" action="?/watch" use:enhance><button class="btn {a.watch ? 'btn-primary' : 'btn-ghost'}">{a.watch ? P.followingOn : P.follow}</button></form>
			<form method="POST" action="?/refresh" use:enhance={() => { refreshing = true; return async ({ update }) => { await update(); refreshing = false; }; }}>
				<button class="btn btn-ghost" disabled={refreshing}>{refreshing ? P.updating : P.update}</button>
			</form>
		</div>
	</header>

	{#if form?.error}<p class="rounded-2xl bg-bad-bg px-4 py-3 text-sm text-bad">{form.error}</p>{/if}
	{#if !w.hasKinds || a.themeNote}
		<form method="POST" action="?/refresh" class="flex flex-wrap items-center gap-3 rounded-2xl bg-warn-bg px-4 py-3 text-sm text-warn" use:enhance={() => { refreshing = true; return async ({ update }) => { await update(); refreshing = false; }; }}>
			<span class="flex-1">{P.oldTopics}</span>
			<button class="font-medium underline" disabled={refreshing}>{refreshing ? P.updatingLong : P.updateNow}</button>
		</form>
	{/if}

	{#if w.list.length}
		<WantsList {w} base="/app/analyses/{a.id}" {t} />

	{:else if !a.themeNote}
		<div class="card p-8 text-sm text-ink-2">{P.noTopics}</div>
	{/if}

	<form method="POST" action="?/remove" onsubmit={(e) => { if (!confirm(P.confirmDelete)) e.preventDefault(); }}>
		<button class="text-xs text-muted underline">{P.delete}</button>
	</form>
</section>
