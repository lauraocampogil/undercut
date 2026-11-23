<script lang="ts">
	// The agency and who to find: URL + 3 questions. On Today it finds the first 5 right away; in Settings it just saves.
	import { enhance } from '$app/forms';
	import { act } from '#lib/act.ts';
	import type { Dict } from '#lib/i18n.ts';
	type Profile = { url: string; name: string; city: string; services: string[]; target?: string } | null;
	let { profile, error = '', t, mode = 'start', saved = false }: { profile: Profile; error?: string; t: Dict; mode?: 'start' | 'save'; saved?: boolean } = $props();

	const SERVICES = ['web', 'branding', 'social', 'seo', 'ads', 'video', 'app'];
	const TARGETS = ['small', 'big', 'any'];
	let busy = $state(false);
	let si = $state(0);
	$effect(() => {
		if (!busy || mode !== 'start') return;
		si = 0;
		const id = setInterval(() => (si = Math.min(t.startBusy.length - 1, si + 1)), 4000);
		return () => clearInterval(id);
	});
	const busyText = $derived(si === 1 ? `${t.startBusy[1]} ${profile?.city || ''}…` : t.startBusy[si]);
	const field = 'bg-white/10 text-white placeholder:text-white/35';
</script>

<form
	method="POST"
	action={act(mode === 'start' ? 'start' : 'setup')}
	use:enhance={() => {
		busy = true;
		return async ({ update }) => {
			await update({ reset: false });
			busy = false;
		};
	}}
	class="grid gap-5"
>
	<label class="block text-sm">
		<span class="text-white/60">{t.qUrl}</span>
		<input name="url" value={profile?.url ?? ''} required inputmode="url" placeholder={t.qUrlPh} class="mt-1.5 w-full rounded-2xl px-4 py-3 text-base outline-none focus:ring-1 focus:ring-accent {field}" />
		{#if profile}<span class="mt-1.5 block text-xs text-accent">✓ {t.foundYou} {profile.name}{profile.city ? `, ${profile.city}` : ''}</span>{/if}
	</label>

	<div>
		<p class="text-sm text-white/60">{t.qSell} <span class="text-white/40">{profile ? t.qSellGuess : t.qSellSkip}</span></p>
		<input type="hidden" name="servicesSent" value="1" />
		<div class="mt-2 flex flex-wrap gap-2">
			{#each SERVICES as k (k)}
				<label class="cursor-pointer"><input type="checkbox" name="services" value={k} checked={profile?.services.includes(k) ?? false} class="peer sr-only" /><span class="inline-block rounded-full bg-white/10 px-4 py-2 text-sm peer-checked:bg-accent peer-checked:text-accent-ink peer-focus-visible:ring-1 peer-focus-visible:ring-accent">{t.services[k]}</span></label>
			{/each}
		</div>
	</div>

	<div>
		<p class="text-sm text-white/60">{t.qWho}</p>
		<div class="mt-2 flex flex-wrap gap-2">
			{#each TARGETS as k (k)}
				<label class="cursor-pointer"><input type="radio" name="target" value={k} checked={(profile?.target ?? 'small') === k} class="peer sr-only" /><span class="inline-block rounded-full bg-white/10 px-4 py-2 text-sm peer-checked:bg-accent peer-checked:text-accent-ink peer-focus-visible:ring-1 peer-focus-visible:ring-accent">{t.targets[k]}</span></label>
			{/each}
		</div>
		<p class="mt-1.5 text-xs text-white/45">{t.qWhoHelp}</p>
		<label class="mt-4 block text-sm">
			<span class="text-white/60">{t.qCity}</span>
			<input name="city" value={profile?.city ?? ''} placeholder={t.qCityPh} class="mt-1.5 w-full rounded-2xl px-4 py-3 outline-none focus:ring-1 focus:ring-accent sm:max-w-sm {field}" />
		</label>
	</div>

	<div class="flex flex-wrap items-center gap-3">
		{#if mode === 'start'}
			<button class="btn btn-accent" disabled={busy}>{busy ? busyText : t.startBtn}</button>
			<span class="text-xs text-white/50">{busy ? t.startWait : t.startNote}</span>
		{:else}
			<button class="btn btn-accent" disabled={busy}>{t.saveBtn}</button>
			{#if saved && !busy}<span class="text-sm text-accent">{t.saved}</span>{/if}
		{/if}
	</div>
	{#if error}<p class="text-sm text-bad">{error}</p>{/if}
</form>
