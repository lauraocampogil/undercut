<script lang="ts">
	import { page } from '$app/state';
	import { dict } from '#lib/i18n.ts';
	let { children } = $props();
	const t = $derived(dict(page.data.ui));
	const tabs = $derived([
		{ href: '/app/settings', label: t.tabAgency },
		{ href: '/app/settings/team', label: t.team },
		{ href: '/app/settings/billing', label: t.billing },
		{ href: '/app/settings/account', label: t.myAccount }
	]);
</script>

<h1 class="display text-[56px] sm:text-[72px]">{t.settings}</h1>
<nav class="scrollbar-none mt-4 -mx-3 flex gap-2 overflow-x-auto px-3">
	{#each tabs as tb (tb.href)}<a href={tb.href} class="pill {page.url.pathname === tb.href ? 'pill-active' : ''}">{tb.label}</a>{/each}
</nav>
<div class="mt-6">{@render children()}</div>
