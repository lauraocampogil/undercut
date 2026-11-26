<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	let { data, form } = $props();
	let busy = $state(false);
</script>

<svelte:head><title>Choose a new password · Undercut</title></svelte:head>

<div class="grid min-h-dvh place-items-center bg-paper px-4 py-10">
	<div class="w-full max-w-sm">
		<a href="/" class="flex justify-center" aria-label="Undercut home"><Logo /></a>
		<div class="card mt-8 p-7">
			{#if !data.valid}
				<h1 class="text-[28px] leading-tight font-medium tracking-tight">This link doesn’t work anymore</h1>
				<p class="mt-2 text-sm leading-relaxed text-ink-2">Reset links work for 1 hour and only once.</p>
				<a href="/forgot" class="btn btn-primary mt-6 w-full justify-center py-3">Ask for a new link</a>
			{:else}
				<form method="POST" onsubmit={() => (busy = true)} class="space-y-4">
					<input type="hidden" name="t" value={data.t} />
					<div>
						<h1 class="text-[28px] leading-tight font-medium tracking-tight">Choose a new password</h1>
						<p class="mt-1 text-sm text-ink-2">For {data.email}</p>
					</div>
					{#if form?.error}<p class="rounded-[16px] bg-bad-bg p-3 text-sm text-bad">{form.error}</p>{/if}
					<label class="block"><span class="label">New password</span><input class="input mt-1.5" type="password" name="password" minlength="8" autocomplete="new-password" required /></label>
					<p class="text-xs text-muted">At least 8 characters.</p>
					<button class="btn btn-primary w-full justify-center py-3 text-base" disabled={busy}>{busy ? 'Saving…' : 'Save and log in'}</button>
				</form>
			{/if}
		</div>
	</div>
</div>
