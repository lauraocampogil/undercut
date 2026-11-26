<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { appT, APP_LANGS, type AppLang } from '#lib/app-i18n.ts';
	let { data, form } = $props();
	const S = $derived(appT(data.lang).settings);
	const A = $derived(appT(data.lang).account);
	const NAMES: Record<AppLang, string> = { en: 'English', fr: 'Français', es: 'Español' };
	function setLang(l: AppLang) {
		document.cookie = `lang=${l}; path=/; max-age=${365 * 86400}; samesite=lax`;
		document.documentElement.lang = l;
		invalidateAll();
	}
	let confirm = $state('');
	let deleting = $state(false);
</script>

<svelte:head><title>{A.title} · Undercut</title></svelte:head>

<div class="grid gap-4 lg:grid-cols-2">
	<form method="POST" action="?/profile" use:enhance={() => async ({ update }) => update({ reset: false })} class="card space-y-5 p-6 sm:p-7">
		<h2 class="text-2xl font-medium tracking-tight">{A.title}</h2>
		<label class="block"><span class="label">{A.name}</span><input class="input mt-1.5" name="name" value={data.me.name} /></label>
		<label class="block"><span class="label">{A.email}</span><input class="input mt-1.5" type="email" name="email" value={data.me.email} disabled={data.emailLocked} /></label>
		{#if data.emailLocked}<p class="text-xs text-muted">{A.emailLocked}</p>{/if}
		{#if form?.error}<p class="rounded-[16px] bg-bad-bg p-3 text-sm text-bad">{form.error}</p>{/if}
		{#if form?.saved}<p class="rounded-[16px] bg-good-bg p-3 text-sm text-good">{A.saved}</p>{/if}
		<button class="btn btn-primary">{A.save}</button>
	</form>

	<div class="flex flex-col gap-4">
		<section class="card space-y-4 p-6 sm:p-7">
			<div><h2 class="text-2xl font-medium tracking-tight">{S.language}</h2><p class="mt-1 text-sm text-ink-2">{S.languageText}</p></div>
			<div class="flex flex-wrap gap-2" role="group" aria-label={S.language}>
				{#each APP_LANGS as [l] (l)}
					<button class="rounded-xl border px-4 py-2 text-sm {data.lang === l ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-2 hover:text-ink'}" aria-pressed={data.lang === l} onclick={() => setLang(l)}>{NAMES[l]}</button>
				{/each}
			</div>
		</section>
		<form method="POST" action="?/password" use:enhance class="card space-y-4 p-6 sm:p-7">
			<h2 class="text-2xl font-medium tracking-tight">{data.hasPassword ? A.password : A.addPassword}</h2>
			{#if !data.hasPassword}<p class="text-sm text-ink-2">{A.google}</p>{/if}
			{#if data.hasPassword}<label class="block"><span class="label">{A.current}</span><input class="input mt-1.5" type="password" name="current" autocomplete="current-password" required /></label>{/if}
			<label class="block"><span class="label">{A.newPw}</span><input class="input mt-1.5" type="password" name="password" minlength="8" autocomplete="new-password" placeholder={A.min} required /></label>
			{#if form?.pwError}<p class="rounded-[16px] bg-bad-bg p-3 text-sm text-bad">{form.pwError}</p>{/if}
			{#if form?.pwSaved}<p class="rounded-[16px] bg-good-bg p-3 text-sm text-good">{A.pwSaved}</p>{/if}
			<button class="btn btn-primary">{data.hasPassword ? A.change : A.savePw}</button>
		</form>

		<form method="POST" action="/logout" class="card flex items-center justify-between gap-4 p-6 sm:p-7">
			<div><h2 class="text-xl font-medium tracking-tight">{A.logout}</h2><p class="mt-1 text-sm text-ink-2">{A.logoutText}</p></div>
			<button class="btn btn-ghost shrink-0">{A.logout}</button>
		</form>

		{#if data.role === 'owner'}
			<form method="POST" action="?/delete" onsubmit={() => (deleting = true)} class="card space-y-4 p-6 sm:p-7">
				<div>
					<h2 class="text-xl font-medium tracking-tight">{A.del}</h2>
					<p class="mt-1 text-sm leading-relaxed text-ink-2">{A.delText}</p>
				</div>
				<label class="block"><span class="label">{A.type}</span><input class="input mt-1.5" name="confirm" bind:value={confirm} autocomplete="off" /></label>
				{#if form?.delError}<p class="rounded-[16px] bg-bad-bg p-3 text-sm text-bad">{form.delError}</p>{/if}
				<button class="btn border border-bad/40 text-bad" disabled={confirm !== 'DELETE' || deleting}>{deleting ? A.deleting : A.del}</button>
			</form>
		{/if}
	</div>
</div>
