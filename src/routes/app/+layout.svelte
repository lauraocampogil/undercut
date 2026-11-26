<script lang="ts">
	import { page } from '$app/state';
	import Logo from '#lib/components/Logo.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { appT } from '#lib/app-i18n.ts';
	let { data, children } = $props();
	const L = $derived(appT(data.lang));

	let drawer = $state(false); // mobile sidebar
	// lock the page behind the open mobile sidebar
	$effect(() => {
		document.documentElement.style.overflow = drawer ? 'hidden' : '';
		return () => (document.documentElement.style.overflow = '');
	});
	let menu = $state<'clients' | 'account' | null>(null);

	const path = $derived(page.url.pathname);
	const current = $derived(data.clients.find((c) => path.startsWith(`/app/clients/${c.id}`)));
	const q = $derived(page.url.searchParams.get('days') ? `?days=${page.url.searchParams.get('days')}` : '');
	const planLabel = $derived(({ trial: 'Free plan', freelance: 'Freelance', agency: 'Agency', studio: 'Studio', full: 'Full database' } as Record<string, string>)[data.billing.plan]);
	const initial = (s: string) => s.trim().slice(0, 1).toUpperCase() || 'U';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	type Item = { href: string; label: string; icon: any; badge?: number };
	// Undercut: what users hate, and who fixes it. Two places only.
	const agencyNav = $derived([
		{ href: '/app/analyses', label: L.nav.home, icon: 'grid' },
		{ href: '/app/following', label: L.nav.following, icon: 'star' },
		{ href: '/app/database', label: L.nav.database, icon: 'list' }
	] as Item[]);
	const clientNav = $derived.by(() => {
		if (!current) return [] as { group: string; items: Item[] }[];
		const b = `/app/clients/${current.id}`;
		const web = current.type !== 'app';
		const app = current.type !== 'web';
		return [
			{ group: '', items: [{ href: b, label: 'Summary', icon: 'gauge' }, { href: `${b}/goals`, label: 'Goals', icon: 'flag' }] },
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
		...(app ? [{ group: 'App', items: [{ href: `${b}/app`, label: 'App analytics', icon: 'phone' }, { href: `${b}/store`, label: 'App Store', icon: 'star' }, { href: `${b}/paywall`, label: 'Paywall', icon: 'lock' }, { href: `${b}/keywords?mode=app`, label: 'App Store keywords', icon: 'key' }] }] : []),
		{ group: '', items: [{ href: `${b}/errors`, label: 'Errors', icon: 'bug' }] },
			{ group: '', items: [{ href: `${b}/settings`, label: 'Setup & connections', icon: 'sliders' }] }
		] as { group: string; items: Item[] }[];
	});
	const isActive = (href: string) => {
		const [hp, hq] = href.split('?');
		if (hp.endsWith('/keywords')) {
			const appMode = page.url.searchParams.get('mode') === 'app' || current?.type === 'app';
			return path === hp && (hq === 'mode=app') === appMode;
		}
		if (['/app/analyses', '/app/following', '/app/database', '/app/crm', '/app/invoices', '/app/tasks', '/app/prospects', '/app/analytics', '/app/pipeline', '/app/settings'].includes(hp)) return path === hp || path.startsWith(hp + '/');
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
		class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors {isActive(it.href) ? 'bg-black/[0.06] font-medium text-ink' : 'text-ink-2 hover:bg-black/[0.04]'}"
	>
		<Icon name={it.icon} />
		<span class="flex-1 truncate">{it.label}</span>
		{#if it.badge}<span class="rounded-full bg-ink px-1.5 text-[10px] font-semibold text-white">{it.badge}</span>{/if}
	</a>
{/snippet}

<div class="app-shell min-h-dvh lg:grid lg:grid-cols-[264px_1fr]" style={data.theme}>
	<!-- mobile top bar -->
	<header class="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/60 bg-white/50 px-4 py-3 backdrop-blur-xl lg:hidden">
		<button class="icon-btn" onclick={() => (drawer = true)} aria-label="Open menu"><Icon name="menu" /></button>
		<a href="/app"><Logo size={26} /></a>
		<span class="size-10"></span>
	</header>

	<!-- sidebar -->
	<aside
		class="no-print fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col gap-1 overflow-y-auto border-r border-white/60 bg-white/80 lg:bg-white/40 backdrop-blur-2xl px-3 py-4 transition-transform lg:sticky lg:top-0 lg:z-40 lg:h-dvh lg:w-auto lg:translate-x-0"
		class:-translate-x-full={!drawer}
	>
		<div class="flex items-center justify-between px-2 pb-3">
			<a href="/app"><Logo /></a>
			<span class="flex items-center gap-2"><button class="icon-btn size-9 lg:hidden" onclick={() => (drawer = false)} aria-label="Close menu"><Icon name="x" /></button></span>
		</div>

		<nav class="mt-3 flex flex-col gap-0.5" aria-label="Main">
			{#each agencyNav as it (it.href)}{@render link(it)}{/each}
		</nav>


		<div class="mt-auto flex flex-col gap-2 pt-4">
			<a href="/app/feedback" class="rounded-2xl border border-line bg-white p-4 text-sm {path === '/app/feedback' ? 'border-ink' : ''}">
				<span class="flex items-center gap-2 font-medium"><span class="rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold text-white">{L.feedback.badge}</span>{L.feedback.nav}</span>
				{#if data.betaTester}<span class="mt-1.5 block text-xs leading-relaxed text-muted">{L.feedback.card}</span>{/if}
			</a>
			{#if !data.full}
				<a href="/app/settings/billing" class="rounded-2xl border border-line bg-white p-4 text-sm">
					<span class="block font-medium">{L.nav.unlock}</span>
					<span class="mt-1 block text-xs leading-relaxed text-muted">{L.nav.unlockText}</span>
					<span class="mt-3 inline-block text-xs font-medium underline">{L.nav.seePlan}</span>
				</a>
			{/if}

			<!-- account & settings -->
			<div class="relative">
				{#if menu === 'account'}
					<div class="absolute right-0 bottom-full left-0 z-40 mb-2 rounded-[20px] bg-white py-2 text-sm shadow-[0_20px_60px_-20px_rgba(0,0,0,.35)]">
						<a href="/app/settings/billing" class="flex items-center gap-3 px-4 py-2 hover:bg-tile"><span class="grid w-6 place-items-center"><Icon name="bill" /></span>{L.nav.billing}</a>
						<div class="my-2 border-t border-line"></div>
						<a href="/app/settings/account" class="flex items-center gap-3 px-4 py-2 hover:bg-tile"><span class="grid w-6 place-items-center"><Icon name="cog" /></span>{L.nav.account}</a>
						<form method="POST" action="/logout"><button class="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-tile"><span class="grid w-6 place-items-center"><Icon name="logout" /></span>{L.nav.logout}</button></form>
					</div>
				{/if}
				<button class="flex w-full items-center gap-3 rounded-2xl p-2 text-left text-sm hover:bg-white {menu === 'account' ? 'bg-white' : ''}" onclick={() => (menu = menu === 'account' ? null : 'account')} aria-expanded={menu === 'account'} aria-label="Account and settings">
					<span class="relative grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-ink">
						{initial(data.account.name)}
					</span>
					<span class="min-w-0 flex-1"><span class="block truncate font-medium">{data.account.name}</span><span class="block truncate text-xs text-muted">{data.full ? L.nav.full : L.nav.free}</span></span>
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
