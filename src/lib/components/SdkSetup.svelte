<script lang="ts">
	import { sdkCode, type SdkKey } from '#lib/sdk.ts';
	let { api, site, focus = 'all' }: { api: string; site: string; focus?: 'paywall' | 'errors' | 'all' } = $props();
	let kind = $state<SdkKey>('rn');
	const tabs: [SdkKey, string][] = [
		['rn', 'React Native / Expo'],
		['swift', 'Swift (iOS)'],
		['kotlin', 'Kotlin (Android)'],
		['flutter', 'Flutter']
	];
	const c = $derived(sdkCode(kind, api, site));
	let copied = $state('');
	function copy(t: string, k: string) {
		navigator.clipboard?.writeText(t);
		copied = k;
		setTimeout(() => (copied = ''), 1500);
	}
</script>

<div class="card-dark p-6 sm:p-8">
	<p class="text-sm text-accent">Connect the app · 5 minutes</p>
	<h2 class="mt-1 text-2xl font-medium">Add one file to the app</h2>
	<p class="mt-2 max-w-2xl text-sm text-white/60">
		{#if focus === 'paywall'}Call <code class="text-accent">paywall()</code> when the paywall shows and <code class="text-accent">purchase()</code> after a successful payment (works with RevenueCat, StoreKit, Play Billing or Superwall).
		{:else if focus === 'errors'}Crashes are caught automatically after <code class="text-accent">start()</code>. Send caught errors with <code class="text-accent">error(e)</code>.
		{:else}One file, no package: sessions, paywall, purchases and crashes.{/if}
		No personal data is sent — only an anonymous random ID.
	</p>
	<div class="mt-5 flex flex-wrap gap-1.5">
		{#each tabs as [k, l] (k)}<button class="rounded-full px-3.5 py-1.5 text-sm {kind === k ? 'bg-accent text-accent-ink' : 'bg-white/10 text-white/80 hover:bg-white/15'}" onclick={() => (kind = k)}>{l}</button>{/each}
	</div>
	<div class="mt-4 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
		<div class="min-w-0">
			<div class="flex items-center justify-between text-xs text-white/50"><span>1 · Create <b class="text-white">{c.file}</b></span><button class="rounded-full bg-white/10 px-3 py-1 text-white hover:bg-white/20" onclick={() => copy(c.code, 'code')}>{copied === 'code' ? 'Copied ✓' : 'Copy'}</button></div>
			<pre class="mt-2 max-h-[340px] overflow-auto rounded-[16px] bg-white/[.06] p-4 text-[12px] leading-relaxed text-white/85">{c.code}</pre>
		</div>
		<div class="min-w-0">
			<div class="flex items-center justify-between text-xs text-white/50"><span>2 · Call it</span><button class="rounded-full bg-white/10 px-3 py-1 text-white hover:bg-white/20" onclick={() => copy(c.usage, 'use')}>{copied === 'use' ? 'Copied ✓' : 'Copy'}</button></div>
			<pre class="mt-2 max-h-[340px] overflow-auto rounded-[16px] bg-accent/10 p-4 text-[12px] leading-relaxed text-accent">{c.usage}</pre>
			<p class="mt-3 text-xs text-white/50">3 · Open the app once — data appears here within a minute.</p>
		</div>
	</div>
</div>
