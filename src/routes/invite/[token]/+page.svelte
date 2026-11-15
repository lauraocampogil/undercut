<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	import GoogleButton from '#lib/components/GoogleButton.svelte';
	let { data, form } = $props();
</script>

<svelte:head><title>Join {data.agency} · Undercut</title></svelte:head>

<div class="grid min-h-dvh place-items-center bg-paper px-4 py-10">
	<div class="w-full max-w-sm">
		<a href="/" class="flex justify-center"><Logo /></a>
		<form method="POST" class="card mt-8 space-y-4 p-7">
			<p class="label">{data.agency} invited you</p>
			<h1 class="display text-[38px] leading-none">{data.client ? `See ${data.client}` : 'Join the team'}</h1>
			<p class="text-sm text-muted">{data.email}</p>
			{#if data.emailError}<p class="rounded-[16px] bg-bad-bg p-3 text-sm text-bad">Use the Google account of {data.email}.</p>{/if}
			{#if form?.error}<p class="rounded-[16px] bg-bad-bg p-3 text-sm text-bad">{form.error}</p>{/if}
			{#if data.google}
				<GoogleButton href="/auth/google?mode=login&invite={data.token}" label="Join with Google" />
				<p class="flex items-center gap-3 text-xs text-muted"><span class="h-px flex-1 bg-line"></span>or choose a password<span class="h-px flex-1 bg-line"></span></p>
			{/if}
			<label class="block"><span class="label">Your name</span><input class="input mt-1.5" name="name" value={form?.name ?? ''} autocomplete="name" required /></label>
			<label class="block"><span class="label">Choose a password</span><input class="input mt-1.5" type="password" name="password" minlength="8" autocomplete="new-password" required /></label>
			<button class="btn btn-primary w-full py-3 text-base">Join →</button>
		</form>
	</div>
</div>
