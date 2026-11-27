<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	import { enhance } from '$app/forms';
	let { data, form } = $props();
	let busy = $state(false);
</script>

<svelte:head><title>Check your email · Undercut</title></svelte:head>

<div class="grid min-h-dvh place-items-center bg-paper px-4 py-10">
	<div class="w-full max-w-sm">
		<a href="/" class="flex justify-center" aria-label="Undercut home"><Logo /></a>
		<form method="POST" action="?/verify" onsubmit={() => (busy = true)} class="card mt-8 space-y-4 p-7">
			<div>
				<h1 class="text-[28px] leading-tight font-medium tracking-tight">Check your email</h1>
				<p class="mt-1 text-sm text-ink-2">We sent a 6-digit code to <b>{data.email}</b>. It works for 10 minutes.</p>
			</div>
			{#if form?.error}<p class="rounded-[16px] bg-bad-bg p-3 text-sm text-bad">{form.error}</p>{/if}
			{#if form?.resent}<p class="rounded-[16px] bg-good-bg p-3 text-sm text-good">A new code is on its way.</p>{/if}
			<label class="block"><span class="label">Code</span><input class="input mt-1.5 text-center text-2xl tracking-[.4em]" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="000000" required /></label>
			<button class="btn btn-primary w-full justify-center py-3 text-base" disabled={busy}>{busy ? 'Checking…' : 'Continue'}</button>
		</form>
		<form method="POST" action="?/resend" use:enhance class="mt-4 text-center text-sm text-ink-2">
			Didn’t get it? <button class="underline">Send a new code</button> · <a href="/login" class="underline">Start again</a>
		</form>
	</div>
</div>
