<script lang="ts">
	import { page } from '$app/state';
	import Brand from '$lib/components/Brand.svelte';
	import DemoBanner from '$lib/components/DemoBanner.svelte';

	let { data, children } = $props();
	const links = [
		{ href: '/dashboard', label: 'Changes' },
		{ href: '/dashboard/settings', label: 'Settings' }
	];
</script>

<DemoBanner demoMode={data.demoMode} hasSearch={data.hasSearch} />

<header class="border-b border-line bg-card">
	<div class="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4 sm:px-6">
		<Brand href="/dashboard" />
		<nav class="flex gap-1 text-sm">
			{#each links as l (l.href)}
				<a
					href={l.href}
					class="rounded-lg px-3 py-1.5 font-medium transition {page.url.pathname === l.href ? 'bg-black/5 text-ink' : 'text-muted hover:text-ink'}"
					>{l.label}</a
				>
			{/each}
		</nav>
		<div class="ml-auto flex items-center gap-3 text-sm">
			<span class="hidden text-muted sm:inline">{data.email}</span>
			<form method="POST" action="/logout"><button class="text-muted hover:text-ink">Log out</button></form>
		</div>
	</div>
</header>

<main class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
	{@render children()}
</main>
