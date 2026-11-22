<script lang="ts">
	// First run: URL + 3 questions, then Undercut finds the first 5 businesses right away. Styled like AgencySetup (dark card).
	import { enhance } from '$app/forms';
	import { act } from '#lib/act.ts';
	type Profile = { url: string; name: string; city: string; services: string[]; target?: string } | null;
	let { profile, error = '' }: { profile: Profile; error?: string } = $props();

	const SERVICES = [
		['web', 'Websites'],
		['branding', 'Branding'],
		['social', 'Social media'],
		['seo', 'SEO'],
		['ads', 'Ads'],
		['video', 'Photo & video'],
		['app', 'Apps']
	] as const;
	const TARGETS = [
		['small', 'Small local shops'],
		['big', 'Bigger companies'],
		['any', 'Both']
	] as const;
	const SVC: Record<string, string> = Object.fromEntries(SERVICES);

	let busy = $state(false);
	let si = $state(0);
	const steps = $derived(['Reading your site…', `Looking around ${profile?.city || 'your city'}…`, 'Checking each business…', 'Writing the messages in their language…', 'Almost there…']);
	$effect(() => {
		if (!busy) return;
		si = 0;
		const t = setInterval(() => (si = Math.min(steps.length - 1, si + 1)), 4000);
		return () => clearInterval(t);
	});
	const field = 'bg-white/10 text-white placeholder:text-white/35';
</script>

<form
	method="POST"
	action={act('start')}
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
		<span class="text-white/60">1 · Your agency’s website, Instagram, TikTok or LinkedIn</span>
		<input name="url" value={profile?.url ?? ''} required inputmode="url" placeholder="youragency.com or instagram.com/youragency" class="mt-1.5 w-full rounded-2xl px-4 py-3 text-base outline-none focus:ring-1 focus:ring-accent {field}" />
		{#if profile}<span class="mt-1.5 block text-xs text-accent">✓ Found: {profile.name}{profile.city ? `, ${profile.city}` : ''}{profile.services.length ? ` · ${profile.services.map((s) => SVC[s] ?? s).join(', ').toLowerCase()}` : ''}</span>{/if}
	</label>

	<div>
		<p class="text-sm text-white/60">2 · What you sell <span class="text-white/40">{profile ? '(we guessed, fix it if needed)' : '(we guess from your site if you skip this)'}</span></p>
		<input type="hidden" name="servicesSent" value="1" />
		<div class="mt-2 flex flex-wrap gap-2">
			{#each SERVICES as [k, l] (k)}
				<label class="cursor-pointer"><input type="checkbox" name="services" value={k} checked={profile?.services.includes(k) ?? false} class="peer sr-only" /><span class="inline-block rounded-full bg-white/10 px-4 py-2 text-sm peer-checked:bg-accent peer-checked:text-accent-ink peer-focus-visible:ring-1 peer-focus-visible:ring-accent">{l}</span></label>
			{/each}
		</div>
	</div>

	<div>
		<p class="text-sm text-white/60">3 · Which businesses do you want as clients?</p>
		<div class="mt-2 flex flex-wrap gap-2">
			{#each TARGETS as [k, l] (k)}
				<label class="cursor-pointer"><input type="radio" name="target" value={k} checked={(profile?.target ?? 'small') === k} class="peer sr-only" /><span class="inline-block rounded-full bg-white/10 px-4 py-2 text-sm peer-checked:bg-accent peer-checked:text-accent-ink peer-focus-visible:ring-1 peer-focus-visible:ring-accent">{l}</span></label>
			{/each}
		</div>
		<p class="mt-1.5 text-xs text-white/45">Small: shops, restaurants, salons, independents. Bigger: hotels, clinics, law and accounting firms, offices.</p>
		<label class="mt-4 block text-sm">
			<span class="text-white/60">Around which city?</span>
			<input name="city" value={profile?.city ?? ''} placeholder={profile ? 'Your city' : 'Detected from your site, or type it'} class="mt-1.5 w-full rounded-2xl px-4 py-3 outline-none focus:ring-1 focus:ring-accent sm:max-w-sm {field}" />
		</label>
	</div>

	<div class="flex flex-wrap items-center gap-3">
		<button class="btn btn-accent" disabled={busy}>{busy ? steps[si] : 'Find my first 5 clients →'}</button>
		<span class="text-xs text-white/50">{busy ? 'Up to a minute: every business is checked before you see it.' : 'You see each business and its message before anything is sent.'}</span>
	</div>
	{#if error}<p class="text-sm text-bad">{error}</p>{/if}
</form>
