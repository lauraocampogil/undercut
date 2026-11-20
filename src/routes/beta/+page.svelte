<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	let { data, form } = $props();
	let kind = $state('web');
	const kinds = [
		['web', 'Web agency'],
		['app', 'App studio'],
		['comms', 'Communication agency'],
		['freelance', 'Freelancer'],
		['other', 'Other']
	];
</script>

<svelte:head><title>Join the beta · Undercut</title></svelte:head>

<div class="min-h-dvh bg-paper p-3">
	<div class="grid min-h-[calc(100dvh-24px)] gap-3 lg:grid-cols-[1fr_1.1fr]">
		<!-- left: the pitch -->
		<div class="relative flex flex-col justify-between overflow-hidden rounded-[36px] bg-ink p-8 text-white sm:p-12">
			<div class="absolute -right-24 -bottom-24 size-96 rounded-full bg-white/10 blur-3xl"></div>
			<a href="/" class="relative"><Logo light /></a>
			<div class="relative py-12">
				<p class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink">Private beta · {data.left > 0 ? `${data.left} of ${data.seats} places left` : 'full: join the waitlist'}</p>
				<h1 class="mt-6 text-[44px] leading-[1.02] font-medium tracking-[-0.04em] sm:text-[64px]">A dashboard<br /><span class="text-white/45">made just for you.</span></h1>
				<p class="mt-6 max-w-md leading-[1.7] text-white/65">Agency, studio or freelancer: paste your URL and Undercut creates <b class="font-medium text-white">your own personalised dashboard</b> — built from what you sell and where you work. Then make it yours: drag blocks, resize them, choose what you see.</p>
				<p class="mt-4 max-w-md text-sm leading-[1.7] text-white/45">Free during the beta, then −50% for life for the first {data.seats}, in exchange for your honest feedback.</p>
				<ul class="mt-8 space-y-3 text-sm">
					{#each ['A dashboard built for you from your URL', 'Drag, resize and choose your blocks', 'New prospects every week, first message written', 'Your clients’ sites and apps: leads, fixes, reports'] as t (t)}
						<li class="flex items-center gap-3"><span class="grid size-6 place-items-center rounded-full bg-white text-xs text-ink">✓</span>{t}</li>
					{/each}
				</ul>
			</div>
			<p class="relative text-xs text-white/40">Cookieless · Data in the EU</p>
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
			{:else if data.left > 0}
				<div class="max-w-md text-center">
					<p class="tag text-muted">{data.left} free places left</p>
					<h2 class="mt-4 text-[40px] leading-tight font-medium tracking-tight">No waiting list yet.</h2>
					<p class="mt-4 text-ink-2">The first {data.seats} agencies get in directly. Create your account and paste your URL: your dashboard is ready in a minute.</p>
					<a href="/signup" class="btn btn-primary mt-8">Create my account</a>
					<p class="mt-4 text-sm text-ink-2">Already have one? <a href="/login" class="underline">Log in</a></p>
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
					<label class="block"><span class="label">Agency or business name</span><input class="input mt-1.5" name="agency" value={form?.agency ?? ''} autocomplete="organization" required /></label>
					<fieldset>
						<legend class="label">You are…</legend>
						<div class="mt-2 flex flex-wrap gap-2">
							{#each kinds as [v, l] (v)}
								<label class="cursor-pointer"><input type="radio" name="kind" value={v} bind:group={kind} class="peer sr-only" /><span class="block rounded-full border border-line px-4 py-2.5 text-center text-sm whitespace-nowrap transition-colors hover:border-ink/40 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white">{l}</span></label>
							{/each}
						</div>
					</fieldset>
					<label class="block"><span class="label">Your website, Instagram, TikTok or LinkedIn</span><input class="input mt-1.5" name="website" value={form?.website ?? ''} placeholder="youragency.com" inputmode="url" /></label>
					<label class="block"><span class="label">What would you want your dashboard to do for you? (optional)</span><textarea class="input mt-1.5 rounded-[20px]" rows="3" name="note" placeholder="Find me new clients, show what my clients need, keep my week organised…">{form?.note ?? ''}</textarea></label>
					<button class="btn btn-primary w-full py-3 text-base">Request my invitation →</button>
				<p class="text-center text-xs text-muted">By continuing you agree to the <a href="/terms" class="underline">Terms</a> and <a href="/privacy" class="underline">Privacy policy</a>.</p>
					<p class="text-center text-xs text-muted">Already invited? <a href="/login" class="underline">Log in</a></p>
				</form>
			{/if}
		</div>
	</div>
</div>
