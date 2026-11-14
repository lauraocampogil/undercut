<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	let { form } = $props();
</script>

<svelte:head><title>Start free · Undercut</title></svelte:head>

<div class="grid min-h-dvh bg-paper lg:grid-cols-2">
	<div class="flex flex-col px-5 py-6 sm:px-10">
		<a href="/"><Logo /></a>
		<div class="mx-auto my-auto w-full max-w-md py-10">
			<h1 class="display text-[52px] leading-none">Start <em>free</em></h1>
			<p class="mt-3 text-ink-2">14 days, every feature, no card. Your first client is connected in about 10 minutes.</p>
			<form method="POST" class="mt-8 space-y-4">
				{#if form?.error}<p class="rounded-[16px] bg-bad-bg p-3 text-sm text-bad">{form.error}</p>{/if}
				<label class="block"><span class="label">Your name</span><input class="input mt-1.5" name="name" value={form?.name ?? ''} autocomplete="name" required /></label>
				<label class="block"><span class="label">Work email</span><input class="input mt-1.5" type="email" name="email" value={form?.email ?? ''} autocomplete="email" required /></label>
				<label class="block"><span class="label">Password</span><input class="input mt-1.5" type="password" name="password" minlength="8" autocomplete="new-password" placeholder="At least 8 characters" required /></label>
				<label class="block"><span class="label">Agency name</span><input class="input mt-1.5" name="agency" value={form?.agency ?? ''} placeholder="Unix Creative Studio" autocomplete="organization" required /></label>
				<label class="flex items-center gap-3 rounded-[16px] bg-white p-3 text-sm"><input type="checkbox" name="examples" class="size-4 accent-[#0D0D0D]" />Keep a few example clients to explore</label>
				<button class="btn btn-primary w-full py-3 text-base">Create my workspace →</button>
				<p class="text-center text-xs text-muted">Already have one? <a href="/app" class="underline">Open the app</a></p>
			</form>
		</div>
	</div>
	<div class="card-dark relative m-3 hidden overflow-hidden p-10 lg:flex lg:flex-col lg:justify-end">
		<div class="absolute -top-24 -right-24 size-96 rounded-full bg-accent/80 blur-3xl"></div>
		<p class="display relative text-[44px] leading-tight">“Which page do we fix, and did last month’s change work?” — answered every Monday, for every client.</p>
		<ul class="relative mt-8 space-y-2 text-sm text-white/70">
			<li>✓ Leads by channel, counted automatically</li>
			<li>✓ Why numbers changed, in one sentence</li>
			<li>✓ SEO fixes published in one click</li>
			<li>✓ Reports your clients read without a call</li>
		</ul>
	</div>
</div>
