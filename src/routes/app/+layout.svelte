<script lang="ts">
	import { page } from '$app/state';
	import Logo from '#lib/components/Logo.svelte';
	import Assistant from '#lib/components/Assistant.svelte';
	import Icon from '#lib/components/Icon.svelte';
	let { data, children } = $props();
	let menu = $state<'clients' | 'account' | null>(null);

	const nav = [
		{ href: '/app', label: 'Overview' },
		{ href: '/app/ideas', label: 'Keywords' },
		{ href: '/app/settings', label: 'Settings' }
	];
	const active = (href: string) =>
		href === '/app' ? page.url.pathname === '/app' || page.url.pathname.startsWith('/app/clients') : page.url.pathname.startsWith(href);
	const current = $derived(data.clients.find((c) => page.url.pathname.startsWith(`/app/clients/${c.id}`)));
	const planLabel = $derived({ trial: 'Free trial', freelance: 'Freelance', agency: 'Agency', studio: 'Studio' }[data.billing.plan]);
	$effect(() => {
		page.url.pathname;
		menu = null;
	});
	const initial = (s: string) => s.trim().slice(0, 1).toUpperCase() || 'U';
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
			<!-- client switcher -->
			<button class="flex items-center gap-2 rounded-full bg-white py-1.5 pr-4 pl-1.5 text-sm" onclick={() => (menu = menu === 'clients' ? null : 'clients')} aria-expanded={menu === 'clients'}>
				<span class="grid size-8 place-items-center rounded-full text-xs font-semibold text-white" style="background:{current?.color ?? '#0D0D0D'}">{initial(current?.name ?? 'All')}</span>
				<span class="hidden max-w-[150px] truncate text-left sm:block">
					<span class="block text-[11px] leading-tight text-muted">Client</span>
					<span class="block leading-tight font-medium">{current?.name ?? 'All clients'}</span>
				</span>
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m6 9 6 6 6-6" /></svg>
			</button>

			<button class="hidden h-11 items-center gap-2 rounded-full bg-ink pr-4 pl-3 text-sm text-white md:flex" onclick={() => window.dispatchEvent(new CustomEvent('undercut:open'))}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="#C6F432"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9zM19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9z" /></svg>Ask AI
			</button>

			<!-- account menu -->
			<button class="grid size-11 place-items-center rounded-full bg-white" onclick={() => (menu = menu === 'account' ? null : 'account')} aria-expanded={menu === 'account'} aria-label="Account and settings">
				<span class="relative grid size-8 place-items-center rounded-full bg-[#E4F5B8] text-xs font-semibold text-accent-ink">
					{initial(data.account.name)}
					<span class="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-white {data.google.connected ? 'bg-good' : 'bg-[#E3A21A]'}"></span>
				</span>
			</button>

			{#if menu === 'clients'}
				<div class="absolute top-full right-0 z-40 mt-2 w-72 rounded-[24px] bg-white p-2 shadow-[0_20px_60px_-20px_rgba(0,0,0,.35)]">
					<a href="/app" class="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm hover:bg-tile {current ? '' : 'font-medium'}">All clients</a>
					<p class="label px-3 pt-2 pb-1">Clients</p>
					{#each data.clients as c (c.id)}
						<a href="/app/clients/{c.id}" class="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm hover:bg-tile {current?.id === c.id ? 'bg-tile font-medium' : ''}">
							<span class="size-2.5 rounded-full" style="background:{c.color}"></span><span class="truncate">{c.name}</span>
						</a>
					{/each}
					<a href="/app/clients/new" class="mt-1 flex items-center justify-center gap-2 rounded-2xl bg-ink px-3 py-2.5 text-sm text-white">+ Add client</a>
				</div>
			{/if}

			{#if menu === 'account'}
				<div class="absolute top-full right-0 z-40 mt-2 w-80 rounded-[24px] bg-white py-2 text-sm shadow-[0_20px_60px_-20px_rgba(0,0,0,.35)]">
					{#if current}
						<p class="label px-5 pt-2 pb-1">Client</p>
						<a href="/app/clients/{current.id}" class="flex items-center gap-3 px-5 py-2 font-medium hover:bg-tile"><span class="grid size-6 place-items-center rounded-md text-[11px] text-white" style="background:{current.color}">{initial(current.name)}</span>{current.name}</a>
						<a href="/app/clients/{current.id}/settings" class="flex items-center gap-3 px-5 py-2 hover:bg-tile"><span class="grid w-6 place-items-center"><Icon name="cog" /></span>Client setup</a>
						<a href="/app/settings/team?client={current.id}" class="flex items-center gap-3 px-5 py-2 hover:bg-tile"><span class="grid w-6 place-items-center"><Icon name="plus" /></span>Invite the client</a>
						<div class="my-2 border-t border-line"></div>
					{/if}
					<p class="label px-5 pt-1 pb-1">Agency</p>
					<a href="/app/settings" class="flex items-center gap-3 px-5 py-2 font-medium hover:bg-tile">
						<span class="grid size-6 place-items-center rounded-md bg-accent text-[11px] text-accent-ink">{initial(data.agency.name)}</span>
						<span class="flex-1 truncate">{data.agency.name}</span>
						<span class="rounded-full bg-tile px-2 py-0.5 text-[10px] font-normal">{planLabel}</span>
					</a>
					<a href="/app/settings/team" class="flex items-center gap-3 px-5 py-2 hover:bg-tile"><span class="grid w-6 place-items-center"><Icon name="team" /></span>Team</a>
					<a href="/app/settings/billing" class="flex items-center gap-3 px-5 py-2 hover:bg-tile"><span class="grid w-6 place-items-center"><Icon name="bill" /></span>Billing & usage</a>
					<a href="/app/settings" class="flex items-center gap-3 px-5 py-2 hover:bg-tile"><span class="grid w-6 place-items-center"><Icon name="cog" /></span>Agency settings</a>
					<a href="/app/settings#connections" class="flex items-center gap-3 px-5 py-2 hover:bg-tile">
						<span class="w-6 text-center"><span class="inline-block size-2 rounded-full {data.google.connected ? 'bg-good' : 'bg-[#E3A21A]'}"></span></span>Connections
						<span class="ml-auto text-xs text-muted">{data.google.connected ? 'Google on' : 'Google off'}</span>
					</a>
					<div class="my-2 border-t border-line"></div>
					<p class="label px-5 pt-1 pb-1">Account</p>
					<a href="/app/settings/account" class="flex items-center gap-3 px-5 py-2 hover:bg-tile">
						<span class="grid size-8 place-items-center rounded-full bg-[#E4F5B8] text-xs font-semibold text-accent-ink">{initial(data.account.name)}</span>
						<span class="min-w-0"><span class="block truncate font-medium">{data.account.name}</span><span class="block truncate text-xs text-muted">{data.account.email || 'Add your email'}</span></span>
					</a>
					<a href="/app/settings/account#logout" class="flex items-center gap-3 px-5 py-2 hover:bg-tile"><span class="grid w-6 place-items-center"><Icon name="logout" /></span>Log out</a>
				</div>
			{/if}
		</div>
	</header>

	{#if menu}
		<button class="fixed inset-0 z-30 cursor-default" aria-label="Close menu" onclick={() => (menu = null)}></button>
	{/if}

	<main class="mx-auto mt-6 max-w-[1320px] pb-20 sm:mt-8">
		{@render children()}
	</main>
</div>

<Assistant clients={data.clients} />
