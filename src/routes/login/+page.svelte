<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	import GoogleButton from '#lib/components/GoogleButton.svelte';
	let { data, form } = $props();
	let busy = $state(false);
</script>

<svelte:head><title>Log in · Undercut</title></svelte:head>

<div class="grid min-h-dvh place-items-center bg-paper px-4 py-10">
	<div class="w-full max-w-sm">
		<a href="/" class="flex justify-center" aria-label="Undercut home"><Logo /></a>
		<form method="POST" onsubmit={() => (busy = true)} class="card mt-8 space-y-4 p-7">
			<div>
				<h1 class="text-[32px] leading-tight font-medium tracking-tight">Log in</h1>
				<p class="mt-1 text-sm text-ink-2">Welcome back to your agency’s dashboard.</p>
			</div>
			<input type="hidden" name="next" value={data.next} />
			{#if form?.error || data.googleError}<p class="rounded-[16px] bg-bad-bg p-3 text-sm text-bad">{form?.error ?? data.googleError}</p>{/if}
			{#if data.google}
				<GoogleButton href="/auth/google?mode=login&next={encodeURIComponent(data.next)}" />
				<p class="flex items-center gap-3 text-xs text-muted"><span class="h-px flex-1 bg-line"></span>or with your email<span class="h-px flex-1 bg-line"></span></p>
			{/if}
			<label class="block"><span class="label">Email</span><input class="input mt-1.5" type="email" name="email" value={form?.email ?? ''} autocomplete="email" required /></label>
			<label class="block"><span class="label">Password</span><input class="input mt-1.5" type="password" name="password" autocomplete="current-password" required /></label>
			<button class="btn btn-primary w-full justify-center py-3 text-base" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
			<p class="text-center text-xs text-muted">Forgot your password? Write to <a class="underline" href="mailto:hello@getundercut.app">hello@getundercut.app</a></p>
		</form>
		<div class="mt-4 rounded-[22px] border border-line p-5 text-center text-sm">
			<span class="text-ink-2">No account yet?</span>
			<a href="/signup" class="ml-1 font-medium underline">Create one, it’s free</a>
		</div>
	</div>
</div>
