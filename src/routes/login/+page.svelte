<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	let { data, form } = $props();
</script>

<svelte:head><title>Log in · Undercut</title></svelte:head>

<div class="grid min-h-dvh place-items-center bg-paper px-4 py-10">
	<div class="w-full max-w-sm">
		<a href="/" class="flex justify-center"><Logo /></a>
		<form method="POST" class="card mt-8 space-y-4 p-7">
			<h1 class="display text-[40px] leading-none">Welcome <em>back</em></h1>
			<input type="hidden" name="next" value={data.next} />
			{#if form?.error}<p class="rounded-[16px] bg-bad-bg p-3 text-sm text-bad">{form.error}</p>{/if}
			<label class="block"><span class="label">Email</span><input class="input mt-1.5" type="email" name="email" value={form?.email ?? ''} autocomplete="email" required /></label>
			<label class="block"><span class="label">Password</span><input class="input mt-1.5" type="password" name="password" autocomplete="current-password" required /></label>
			<button class="btn btn-primary w-full py-3 text-base">Log in →</button>
		</form>
		<p class="mt-4 text-center text-xs text-muted">Forgot your password? Ask the workspace owner to invite you again.</p>
	</div>
</div>
