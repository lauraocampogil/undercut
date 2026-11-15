<script lang="ts">
	import { page } from '$app/state';
	import Logo from '#lib/components/Logo.svelte';
	import Assistant from '#lib/components/Assistant.svelte';
	import Icon from '#lib/components/Icon.svelte';
	let { data, children } = $props();

	let drawer = $state(false); // mobile sidebar
	let menu = $state<'clients' | 'account' | null>(null);

	const path = $derived(page.url.pathname);
	const current = $derived(data.clients.find((c) => path.startsWith(`/app/clients/${c.id}`)));
	const q = $derived(page.url.searchParams.get('days') ? `?days=${page.url.searchParams.get('days')}` : '');
	const planLabel = $derived({ trial: 'Free trial', freelance: 'Freelance', agency: 'Agency', studio: 'Studio' }[data.billing.plan]);
	const initial = (s: string) => s.trim().slice(0, 1).toUpperCase() || 'U';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	type Item = { href: string; label: string; icon: any; badge?: number };
	const agencyNav = $derived([
		{ href: '/app', label: 'All clients', icon: 'grid' },
		{ href: '/app/alerts', label: 'Alerts', icon: 'bell', badge: data.unread }
	] as Item[]);
	const clientNav = $derived.by(() => {
		if (!current) return [] as { group: string; items: Item[] }[];
		const b = `/app/clients/${current.id}`;
		const web = current.type !== 'app';
		const app = current.type !== 'web';
		return [
			{ group: '', items: [{ href: b, label: 'Summary', icon: 'gauge' }] },
			...(web
				? [
						{
							group: 'Website',
							items: [
								{ href: `${b}/leads`, label: 'Leads', icon: 'target' },
								{ href: `${b}/traffic`, label: 'Traffic', icon: 'chart' },
								{ href: `${b}/search`, label: 'Search & Maps', icon: 'search' },
								{ href: `${b}/keywords`, label: 'Keywords', icon: 'key' },
								{ href: `${b}/seo`, label: 'SEO & fixes', icon: 'check' },
								{ href: `${b}/heatmaps`, label: 'Heatmaps', icon: 'flame' }
							]
						}
					]
				: []),
			...(web ? [{ group: 'Communication', items: [{ href: `${b}/campaigns`, label: 'Campaigns', icon: 'megaphone' }] }] : []),
		...(app ? [{ group: 'App', items: [{ href: `${b}/app`, label: 'App analytics', icon: 'phone' }, { href: `${b}/keywords?mode=app`, label: 'App Store keywords', icon: 'key' }] }] : []),
			{ group: '', items: [{ href: `${b}/settings`, label: 'Setup & connections', icon: 'sliders' }] }
		] as { group: string; items: Item[] }[];
	});
	const isActive = (href: string) => {
		const [hp, hq] = href.split('?');
		if (hp.endsWith('/keywords')) {
			const appMode = page.url.searchParams.get('mode') === 'app' || current?.type === 'app';
			return path === hp && (hq === 'mode=app') === appMode;
		}
		return hp === '/app' ? path === '/app' : path === hp || (!hp.endsWith('/settings') && hp.split('/').length > 4 && path.startsWith(hp + '/'));
	};

	$effect(() => {
		path;
		drawer = false;
		menu = null;
	});
</script>

{#snippet link(it: Item)}
	<a
		href={it.href + (it.href.includes('/clients/') && !it.href.endsWith('/settings') ? (it.href.includes('?') ? q.replace('?', '&') : q) : '')}
		class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors {isActive(it.href) ? 'bg-ink text-white' : 'text-ink-2 hover:bg-black/5'}"
	>
		<Icon name={it.icon} />
		<span class="flex-1 truncate">{it.label}</span>
		{#if it.badge}<span class="rounded-full bg-bad px-1.5 text-[10px] font-semibold text-white">{it.badge}</span>{/if}
	</a>
{/snippet}

<div class="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
	<!-- mobile top bar -->
	<header class="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
		<button class="icon-btn" onclick={() => (drawer = true)} aria-label="Open menu"><Icon name="menu" /></button>
		<a href="/app"><Logo size={26} /></a>
		<a href="/app/alerts" class="relative icon-btn" aria-label="Alerts"><Icon name="bell" />{#if data.unread}<span class="absolute -top-1 -right-1 grid min-w-4 place-items-center rounded-full bg-bad px-1 text-[9px] text-white">{data.unread}</span>{/if}</a>
	</header>

	<!-- sidebar -->
	<aside
		class="no-print fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col gap-1 overflow-y-auto border-r border-line bg-paper px-3 py-4 transition-transform lg:sticky lg:top-0 lg:z-40 lg:h-dvh lg:w-auto lg:translate-x-0"
		class:-translate-x-full={!drawer}
	>
		<div class="flex items-center justify-between px-2 pb-3">
			<a href="/app"><Logo /></a>
			<button class="icon-btn size-9 lg:hidden" onclick={() => (drawer = false)} aria-label="Close menu"><Icon name="x" /></button>
		</div>

		<!-- client switcher -->
		<div class="relative">
			<button class="flex w-full items-center gap-3 rounded-2xl bg-white p-2 text-left text-sm" onclick={() => (menu = menu === 'clients' ? null : 'clients')} aria-expanded={menu === 'clients'}>
				<span class="grid size-9 shrink-0 place-items-center rounded-xl text-xs font-semibold text-white" style="background:{current?.color ?? '#0D0D0D'}">{initial(current?.name ?? 'A')}</span>
				<span class="min-w-0 flex-1">
					<span class="block text-[11px] leading-tight text-muted">{current ? 'Client' : data.agency.name}</span>
					<span class="block truncate leading-tight font-medium">{current?.name ?? 'All clients'}</span>
				</span>
				<Icon name="chevron" size={14} />
			</button>
			{#if menu === 'clients'}
				<div class="absolute top-full right-0 left-0 z-40 mt-2 max-h-80 overflow-y-auto rounded-[20px] bg-white p-2 shadow-[0_20px_60px_-20px_rgba(0,0,0,.35)]">
					<a href="/app" class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-tile">All clients</a>
					{#each data.clients as c (c.id)}
						<a href="/app/clients/{c.id}" class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-tile {current?.id === c.id ? 'bg-tile font-medium' : ''}">
							<span class="size-2.5 rounded-full" style="background:{c.color}"></span><span class="flex-1 truncate">{c.name}</span>
							<span class="text-[10px] text-muted">{c.type === 'both' ? 'web+app' : c.type}</span>
						</a>
					{/each}
					<a href="/app/clients/new" class="mt-1 flex items-center justify-center gap-2 rounded-xl bg-ink px-3 py-2 text-sm text-white"><Icon name="plus" size={14} />Add client</a>
				</div>
			{/if}
		</div>

		<nav class="mt-3 flex flex-col gap-0.5" aria-label="Agency">
			{#each agencyNav as it (it.href)}{@render link(it)}{/each}
		</nav>

		{#if current}
			<nav class="mt-4 flex flex-col gap-0.5 border-t border-line pt-4" aria-label="{current.name} sections">
				<p class="flex items-center gap-2 px-3 pb-1 text-[11px] font-medium text-muted"><span class="size-2 rounded-full" style="background:{current.color}"></span><span class="truncate">{current.name}</span></p>
				{#each clientNav as g, gi (gi)}
					{#if g.group}<p class="mt-2 px-3 pb-0.5 text-[10px] font-medium tracking-wider text-muted uppercase">{g.group}</p>{/if}
					{#each g.items as it (it.href)}{@render link(it)}{/each}
				{/each}
			</nav>
		{/if}

		<div class="mt-auto flex flex-col gap-2 pt-4">
			<button class="flex items-center gap-3 rounded-2xl bg-ink px-3 py-2.5 text-sm text-white" onclick={() => window.dispatchEvent(new CustomEvent('undercut:open'))}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="#C6F432"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9zM19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9z" /></svg>
				<span class="flex-1 text-left">Ask Undercut AI</span><kbd class="rounded bg-white/15 px-1.5 text-[10px]">⌘J</kbd>
			</button>

			<!-- account & settings -->
			<div class="relative">
				{#if menu === 'account'}
					<div class="absolute right-0 bottom-full left-0 z-40 mb-2 rounded-[20px] bg-white py-2 text-sm shadow-[0_20px_60px_-20px_rgba(0,0,0,.35)]">
						<p class="label px-4 pt-1 pb-1">Agency</p>
						<a href="/app/settings" class="flex items-center gap-3 px-4 py-2 font-medium hover:bg-tile">
							<span class="grid size-6 place-items-center rounded-md bg-accent text-[11px] text-accent-ink">{initial(data.agency.name)}</span>
							<span class="flex-1 truncate">{data.agency.name}</span><span class="rounded-full bg-tile px-2 py-0.5 text-[10px] font-normal">{planLabel}</span>
						</a>
						<a href="/app/settings" class="flex items-center gap-3 px-4 py-2 hover:bg-tile"><span class="grid w-6 place-items-center"><Icon name="cog" /></span>Agency settings</a>
						<a href="/app/settings/team" class="flex items-center gap-3 px-4 py-2 hover:bg-tile"><span class="grid w-6 place-items-center"><Icon name="team" /></span>Team</a>
						<a href="/app/settings/billing" class="flex items-center gap-3 px-4 py-2 hover:bg-tile"><span class="grid w-6 place-items-center"><Icon name="bill" /></span>Billing & usage</a>
						<a href="/app/settings/alerts" class="flex items-center gap-3 px-4 py-2 hover:bg-tile"><span class="grid w-6 place-items-center"><Icon name="bell" /></span>Alert settings</a>
						<a href="/app/settings#connections" class="flex items-center gap-3 px-4 py-2 hover:bg-tile">
							<span class="grid w-6 place-items-center"><span class="size-2 rounded-full {data.google.connected ? 'bg-good' : 'bg-[#E3A21A]'}"></span></span>Connections
							<span class="ml-auto text-xs text-muted">{data.google.connected ? 'Google on' : 'Google off'}</span>
						</a>
						<div class="my-2 border-t border-line"></div>
						<a href="/app/settings/account" class="flex items-center gap-3 px-4 py-2 hover:bg-tile"><span class="grid w-6 place-items-center"><Icon name="team" /></span>My account</a>
						<a href="/app/settings/account#logout" class="flex items-center gap-3 px-4 py-2 hover:bg-tile"><span class="grid w-6 place-items-center"><Icon name="logout" /></span>Log out</a>
					</div>
				{/if}
				<button class="flex w-full items-center gap-3 rounded-2xl p-2 text-left text-sm hover:bg-white {menu === 'account' ? 'bg-white' : ''}" onclick={() => (menu = menu === 'account' ? null : 'account')} aria-expanded={menu === 'account'} aria-label="Account and settings">
					<span class="relative grid size-9 shrink-0 place-items-center rounded-full bg-[#E4F5B8] text-xs font-semibold text-accent-ink">
						{initial(data.account.name)}
						<span class="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-paper {data.google.connected ? 'bg-good' : 'bg-[#E3A21A]'}"></span>
					</span>
					<span class="min-w-0 flex-1"><span class="block truncate font-medium">{data.account.name}</span><span class="block truncate text-xs text-muted">Account & settings</span></span>
					<Icon name="cog" size={15} />
				</button>
			</div>
		</div>
	</aside>

	{#if drawer}<button class="fixed inset-0 z-40 bg-black/30 lg:hidden" aria-label="Close menu" onclick={() => (drawer = false)}></button>{/if}
	{#if menu}<button class="fixed inset-0 z-30 cursor-default" aria-label="Close" onclick={() => (menu = null)}></button>{/if}

	<main class="min-w-0 px-4 py-6 sm:px-8 lg:py-8">
		<div class="mx-auto max-w-[1240px] pb-20">
			{@render children()}
		</div>
	</main>
</div>

<Assistant clients={data.clients} />
