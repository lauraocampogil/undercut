<script lang="ts">
	import { page } from '$app/state';
	let { children } = $props();
	const tabs = [
		{ href: '/app/settings', label: 'Agency' },
		{ href: '/app/settings/alerts', label: 'Alerts' },
		{ href: '/app/settings/team', label: 'Team' },
		{ href: '/app/settings/billing', label: 'Billing & usage' },
		{ href: '/app/settings/account', label: 'My account' }
	];
</script>

<h1 class="display text-[56px] sm:text-[72px]">Settings</h1>
<nav class="scrollbar-none mt-4 -mx-3 flex gap-2 overflow-x-auto px-3">
	{#each tabs as t (t.href)}<a href={t.href} class="pill {page.url.pathname === t.href ? 'pill-active' : ''}">{t.label}</a>{/each}
</nav>
<div class="mt-6">{@render children()}</div>
