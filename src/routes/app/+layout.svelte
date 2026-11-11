<script lang="ts">
	import { page } from '$app/state';
	import Logo from '#lib/components/Logo.svelte';
	let { data, children } = $props();
	let clientsOpen = $state(false);

	const nav = [
		{ href: '/app', label: 'Overview' },
		{ href: '/app/ideas', label: 'Keywords' },
		{ href: '/app/settings', label: 'Settings' }
	];
	const active = (href: string) =>
		href === '/app' ? page.url.pathname === '/app' || page.url.pathname.startsWith('/app/clients') : page.url.pathname.startsWith(href);
	const current = $derived(data.clients.find((c) => page.url.pathname.startsWith(`/app/clients/${c.id}`)));
	$effect(() => {
		page.url.pathname;
		clientsOpen = false;
	});
</script>

<div class="min-h-dvh px-3 py-3 sm:px-5 sm:py-5">
	<header class="no-print mx-auto flex max-w-[1320px] flex-wrap items-center gap-3 lg:flex-nowrap">
		<a href="/app" class="mr-auto shrink-0 lg:mr-0"><Logo /></a>

		<nav class="scrollbar-none order-3 -mx-3 w-[calc(100%+1.5rem)] overflow-x-auto px-3 lg:order-none lg:mx-auto lg:w-auto lg:px-0">
			<div class="flex w-max gap-1 rounded-full bg-white p-1.5">
				{#each nav as item (item.href)}
					<a href={item.href} class="rounded-full px-4 py-2 text-sm transition-colors {active(item.href) ? 'bg-ink text-white' : 'text-ink-2 hover:bg-tile'}">{item.label}</a>
				{/each}
			</div>
		</nav>

		<div class="relative flex shrink-0 items-center gap-2">
			<button
				class="flex items-center gap-2 rounded-full bg-white py-1.5 pr-4 pl-1.5 text-sm"
				onclick={() => (clientsOpen = !clientsOpen)}
				aria-expanded={clientsOpen}
			>
				<span class="grid size-8 place-items-center rounded-full text-xs font-semibold text-white" style="background:{current?.color ?? '#0D0D0D'}">
					{(current?.name ?? data.agency.name).slice(0, 1)}
				</span>
				<span class="hidden max-w-[160px] truncate text-left sm:block">
					<span class="block text-[11px] leading-tight text-muted">{current ? 'Client' : 'Workspace'}</span>
					<span class="block leading-tight font-medium">{current?.name ?? data.agency.name}</span>
				</span>
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m6 9 6 6 6-6" /></svg>
			</button>
			<a
				href="/app/settings#connections"
				class="grid size-11 place-items-center rounded-full bg-white"
				title={data.google.connected ? `Google: ${data.google.email ?? 'connected'}` : 'Google not connected'}
				aria-label="Google connection"
			>
				<span class="size-2.5 rounded-full {data.google.connected ? 'bg-good' : 'bg-[#E3A21A]'}"></span>
			</a>

			{#if clientsOpen}
				<div class="absolute top-full right-0 z-40 mt-2 w-72 rounded-[24px] bg-white p-2 shadow-[0_20px_60px_-20px_rgba(0,0,0,.35)]">
					<p class="label px-3 pt-2 pb-1">Clients</p>
					{#each data.clients as c (c.id)}
						<a href="/app/clients/{c.id}" class="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm hover:bg-tile">
							<span class="size-2.5 rounded-full" style="background:{c.color}"></span>
							<span class="truncate">{c.name}</span>
						</a>
					{/each}
					<a href="/app/clients/new" class="mt-1 flex items-center justify-center gap-2 rounded-2xl bg-ink px-3 py-2.5 text-sm text-white">+ Add client</a>
				</div>
			{/if}
		</div>
	</header>

	{#if clientsOpen}
		<button class="fixed inset-0 z-30 cursor-default" aria-label="Close" onclick={() => (clientsOpen = false)}></button>
	{/if}

	<main class="mx-auto mt-6 max-w-[1320px] sm:mt-8">
		{@render children()}
	</main>
</div>
