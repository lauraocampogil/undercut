<script lang="ts">
	import { page } from '$app/state';
	import { appT } from '#lib/app-i18n.ts';
	let { children } = $props();
	const S = $derived(appT(page.data.lang).settings);
	const tabs = $derived([
		{ href: '/app/settings/account', label: S.account },
		{ href: '/app/settings/billing', label: S.billing }
	]);
</script>

<h1 class="display text-4xl sm:text-5xl">{S.title}</h1>
<nav class="mt-4 flex gap-2">
	{#each tabs as tb (tb.href)}<a href={tb.href} class="rounded-[10px] border px-4 py-2 text-sm {page.url.pathname === tb.href ? 'border-ink bg-white font-medium' : 'border-line bg-white text-ink-2'}">{tb.label}</a>{/each}
</nav>
<div class="mt-6">{@render children()}</div>
