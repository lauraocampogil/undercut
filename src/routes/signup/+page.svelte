<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	import GoogleButton from '#lib/components/GoogleButton.svelte';
	let { data, form } = $props();
</script>

<svelte:head><title>Start free · Undercut</title></svelte:head>

<div class="grid min-h-dvh bg-paper lg:grid-cols-2">
	<div class="flex flex-col px-5 py-6 sm:px-10">
		<a href="/"><Logo /></a>
		<div class="mx-auto my-auto w-full max-w-md py-10">
			{#if data.prefill}
				<p class="tag text-muted">Beta invitation</p>
				<h1 class="mt-3 text-[40px] leading-tight font-medium tracking-tight">Welcome, {data.prefill.name.split(' ')[0]}</h1>
				<p class="mt-2 text-ink-2">Create your account to start.</p>
			{:else}
				<h1 class="text-[40px] leading-tight font-medium tracking-tight">Create your account</h1>
				<p class="mt-2 text-ink-2">Free to start. Analyze any product and see the top 20 of the database.</p>
			{/if}
			{#if data.google}
				<div class="mt-8 space-y-4">
					<GoogleButton href="/auth/google?mode=login&next={encodeURIComponent(data.next || '/app/analyses')}{data.code ? `&beta=${data.code}` : ''}" label="Continue with Google" />
					<p class="flex items-center gap-3 text-xs text-muted"><span class="h-px flex-1 bg-line"></span>or with email<span class="h-px flex-1 bg-line"></span></p>
				</div>
			{/if}
			<form method="POST" class="mt-8 space-y-4">
				{#if form?.error}<p class="rounded-[16px] bg-bad-bg p-3 text-sm text-bad">{form.error}</p>{/if}
				<input type="hidden" name="code" value={data.code} />
				<input type="hidden" name="next" value={data.next} />
				<label class="block"><span class="label">Your name</span><input class="input mt-1.5" name="name" value={form?.name ?? data.prefill?.name ?? ''} autocomplete="name" required /></label>
				<label class="block"><span class="label">Email</span><input class="input mt-1.5" type="email" name="email" value={form?.email ?? data.prefill?.email ?? ''} autocomplete="email" required /></label>
				<label class="block"><span class="label">Password</span><input class="input mt-1.5" type="password" name="password" minlength="8" autocomplete="new-password" placeholder="At least 8 characters" required /></label>
				<button class="btn btn-primary w-full justify-center py-3 text-base">Create my account</button>
				<p class="mt-3 text-center text-xs text-muted">By continuing you agree to the <a href="/terms" class="underline">Terms</a> and <a href="/privacy" class="underline">Privacy policy</a>.</p>
				<p class="text-center text-sm text-ink-2">Already have an account? <a href="/login{data.next ? `?next=${encodeURIComponent(data.next)}` : ''}" class="font-medium underline">Log in</a></p>
			</form>
		</div>
	</div>
	<div class="relative m-3 hidden overflow-hidden rounded-3xl border border-line bg-white p-10 lg:flex lg:flex-col lg:justify-end">
		<p class="relative text-[40px] leading-tight font-medium tracking-tight">See what users hate.<br />For any product.</p>
		<ul class="relative mt-8 space-y-2 text-sm text-ink-2">
			<li>Reviews from the App Store, Google Play, Hacker News and GitHub</li>
			<li>Your product compared with its 3 closest competitors</li>
			<li>Claim your product and show what you fixed</li>
			<li>Your analyses stay private</li>
		</ul>
	</div>
</div>
