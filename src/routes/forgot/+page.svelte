<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	let { data, form } = $props();
	let busy = $state(false);
</script>

<svelte:head><title>Reset your password · Undercut</title></svelte:head>

<div class="grid min-h-dvh place-items-center bg-paper px-4 py-10">
	<div class="w-full max-w-sm">
		<a href="/" class="flex justify-center" aria-label="Undercut home"><Logo /></a>
		<div class="card mt-8 p-7">
			{#if form?.sent}
				<h1 class="text-[28px] leading-tight font-medium tracking-tight">Check your inbox</h1>
				<p class="mt-2 text-sm leading-relaxed text-ink-2">If an account exists for <b>{form.email}</b>, we just sent a link to choose a new password. It works for 1 hour. Check your spam folder if you don’t see it.</p>
				<a href="/login" class="btn btn-ghost mt-6 w-full justify-center py-3">Back to log in</a>
			{:else}
				<form method="POST" onsubmit={() => (busy = true)} class="space-y-4">
					<div>
						<h1 class="text-[28px] leading-tight font-medium tracking-tight">Forgot your password?</h1>
						<p class="mt-1 text-sm text-ink-2">Enter your email and we’ll send you a link to choose a new one.</p>
					</div>
					{#if !data.ready}<p class="rounded-[16px] bg-bad-bg p-3 text-sm text-bad">Email is not set up on this server yet. Write to hello@getundercut.app.</p>{/if}
					{#if form?.error}<p class="rounded-[16px] bg-bad-bg p-3 text-sm text-bad">{form.error}</p>{/if}
					<label class="block"><span class="label">Email</span><input class="input mt-1.5" type="email" name="email" value={form?.email ?? ''} autocomplete="email" required /></label>
					<button class="btn btn-primary w-full justify-center py-3 text-base" disabled={busy}>{busy ? 'Sending…' : 'Send the link'}</button>
				</form>
			{/if}
		</div>
		<p class="mt-4 text-center text-sm text-ink-2">Remembered it? <a href="/login" class="font-medium underline">Log in</a></p>
	</div>
</div>
