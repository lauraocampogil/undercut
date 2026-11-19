<script lang="ts">
	// "Paste your agency's URL" — first step of the agency cockpit, and the place to correct what we detected.
	import { enhance } from '$app/forms';
	import { act } from '#lib/act.ts';
	type Profile = { url: string; name: string; services: string[]; city: string; needs?: string } | null;
	let { profile, error = '', dark = true, onsaved }: { profile: Profile; error?: string; dark?: boolean; onsaved?: () => void } = $props();
	let busy = $state(false);
	const SERVICES = [
		['web', 'Websites'],
		['app', 'Apps'],
		['social', 'Social media'],
		['seo', 'SEO'],
		['branding', 'Branding'],
		['ads', 'Ads']
	] as const;
	const field = $derived(dark ? 'bg-white/10 text-white placeholder:text-white/35' : 'bg-tile text-ink placeholder:text-muted');
</script>

<form
	method="POST"
	action={act('setup')}
	use:enhance={() => {
		busy = true;
		return async ({ update, result }) => {
			await update({ reset: false });
			busy = false;
			if (result.type === 'success' && profile && !profile.needs) onsaved?.();
		};
	}}
	class="grid gap-4"
>
	<label class="block text-sm">
		<span class={dark ? 'text-white/60' : 'label'}>Your agency’s website or Instagram</span>
		<input name="url" value={profile?.url ?? ''} required inputmode="url" placeholder="youragency.com" class="mt-1.5 w-full rounded-2xl px-4 py-3 text-base outline-none focus:ring-1 focus:ring-accent {field}" />
	</label>
	{#if profile}
		<div class="grid gap-4 sm:grid-cols-2">
			<label class="block text-sm"><span class={dark ? 'text-white/60' : 'label'}>Agency name</span><input name="name" value={profile.name} class="mt-1.5 w-full rounded-2xl px-4 py-3 outline-none focus:ring-1 focus:ring-accent {field}" /></label>
			<label class="block text-sm"><span class={dark ? 'text-white/60' : 'label'}>City where you look for clients</span><input name="city" value={profile.city} required placeholder="Your city" class="mt-1.5 w-full rounded-2xl px-4 py-3 outline-none focus:ring-1 focus:ring-accent {field}" /></label>
		</div>
		<input type="hidden" name="servicesSent" value="1" />
		<div>
			<p class="text-sm {dark ? 'text-white/60' : 'label'}">What you sell</p>
			<div class="mt-2 flex flex-wrap gap-2">
				{#each SERVICES as [k, l] (k)}
					<label class="cursor-pointer"><input type="checkbox" name="services" value={k} checked={profile.services.includes(k)} class="peer sr-only" /><span class="inline-block rounded-full px-4 py-2 text-sm peer-checked:bg-accent peer-checked:text-accent-ink {dark ? 'bg-white/10' : 'bg-tile'}">{l}</span></label>
				{/each}
			</div>
		</div>
		{#if profile.needs}<p class="text-sm {dark ? 'text-accent' : 'text-warn'}">{profile.needs}</p>{/if}
	{/if}
	<div class="flex items-center gap-3">
		<button class="btn btn-accent" disabled={busy}>{busy ? 'Reading your site…' : profile ? 'Save' : 'Build my dashboard →'}</button>
		{#if error}<p class="text-sm text-bad">{error}</p>{/if}
	</div>
</form>
