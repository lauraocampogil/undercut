<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	let { data, form } = $props();
	let kind = $state('web');
	const kinds = [
		['web', 'Web agency'],
		['app', 'App studio'],
		['comms', 'Communication'],
		['other', 'Other']
	];
</script>

<svelte:head><title>Join the beta · Undercut</title></svelte:head>

<div class="min-h-dvh bg-paper p-3">
	<div class="grid min-h-[calc(100dvh-24px)] gap-3 lg:grid-cols-[1fr_1.1fr]">
		<!-- left: the pitch -->
		<div class="relative flex flex-col justify-between overflow-hidden rounded-[36px] bg-ink p-8 text-white sm:p-12">
			<div class="absolute -right-24 -bottom-24 size-96 rounded-full bg-accent/30 blur-3xl"></div>
			<a href="/" class="relative"><Logo light /></a>
			<div class="relative py-12">
				<p class="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-ink">Private beta · {data.seats} agencies</p>
				<h1 class="mt-6 text-[48px] leading-[0.9] sm:text-[72px]"><span class="shout">Free.</span><br /><span class="display">For the first <em class="text-accent">{data.seats}</em> agencies.</span></h1>
				<p class="mt-6 max-w-md text-white/65">Undercut is built with its first users. Join the beta: every feature, free, for all your clients — in exchange for your honest feedback.</p>
				<ul class="mt-8 space-y-3 text-sm">
					{#each ['Leads, traffic, SEO & heatmaps for every client', 'One-click fixes, reports with your logo', 'A direct line to the founder — your requests get built'] as t (t)}
						<li class="flex items-center gap-3"><span class="grid size-6 place-items-center rounded-full bg-accent text-xs text-accent-ink">✓</span>{t}</li>
					{/each}
				</ul>
			</div>
			<p class="relative text-xs text-white/40">Made in Brussels · Cookieless · Data in the EU</p>
		</div>

		<!-- right: the form -->
		<div class="flex items-center justify-center rounded-[36px] bg-white p-6 sm:p-12">
			{#if form?.joined}
				<div class="max-w-md text-center">
					<p class="text-5xl">✦</p>
					<h2 class="display mt-4 text-[48px] leading-none">You’re on the <em>list</em>, {form.joined}.</h2>
					<p class="mt-4 text-ink-2">We invite agencies one by one so each gets proper help. You’ll get an email with your personal invitation link.</p>
					<a href="/" class="btn btn-primary mt-8">Back to the site</a>
				</div>
			{:else}
				<form method="POST" class="w-full max-w-lg space-y-5">
					<div>
						<h2 class="display text-[44px] leading-none">Join the <em>beta</em></h2>
						<p class="mt-2 text-sm text-muted">Two minutes. We read every answer.</p>
					</div>
					{#if form?.error}<p class="rounded-[16px] bg-bad-bg p-3 text-sm text-bad">{form.error}</p>{/if}
					<div class="grid gap-4 sm:grid-cols-2">
						<label class="block"><span class="label">Your name</span><input class="input mt-1.5" name="name" value={form?.name ?? ''} autocomplete="name" required /></label>
						<label class="block"><span class="label">Work email</span><input class="input mt-1.5" type="email" name="email" value={form?.email ?? ''} autocomplete="email" required /></label>
					</div>
					<label class="block"><span class="label">Agency name</span><input class="input mt-1.5" name="agency" value={form?.agency ?? ''} autocomplete="organization" required /></label>
					<fieldset>
						<legend class="label">What kind of agency?</legend>
						<div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
							{#each kinds as [v, l] (v)}
								<label class="cursor-pointer"><input type="radio" name="kind" value={v} bind:group={kind} class="peer sr-only" /><span class="block rounded-full border border-line py-2.5 text-center text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white">{l}</span></label>
							{/each}
						</div>
					</fieldset>
					<label class="block"><span class="label">Agency website</span><input class="input mt-1.5" name="website" value={form?.website ?? ''} placeholder="agency.be" inputmode="url" /></label>
					<label class="block"><span class="label">What annoys you most in analytics today? (optional)</span><textarea class="input mt-1.5 rounded-[20px]" rows="3" name="note">{form?.note ?? ''}</textarea></label>
					<button class="btn btn-accent w-full py-3 text-base">Request my invitation →</button>
					<p class="text-center text-xs text-muted">Already invited? <a href="/login" class="underline">Log in</a></p>
				</form>
			{/if}
		</div>
	</div>
</div>
