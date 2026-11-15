<script lang="ts">
	import { enhance } from '$app/forms';
	import { act } from '#lib/act.ts';
	import Sparkline from '#lib/components/Sparkline.svelte';
	import SdkSetup from '#lib/components/SdkSetup.svelte';
	let { data } = $props();
	const r = $derived(data.r);
	let tab = $state<'open' | 'resolved' | 'ignored'>('open');
	let openId = $state<string | null>(null);
	let pf = $state<'all' | 'ios' | 'android' | 'web'>('all');
	const list = $derived(
		r.issues.filter((i) => (tab === 'open' ? i.status === 'open' || i.status === 'regressed' : i.status === tab)).filter((i) => pf === 'all' || i.platform === pf || i.platform === 'mixed')
	);
	const count = (s: string) => r.issues.filter((i) => (s === 'open' ? i.status === 'open' || i.status === 'regressed' : i.status === s)).length;
	const ago = (ts: number) => {
		const m = Math.round((Date.now() - ts) / 6e4);
		return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
	};
	const pfLabel = { ios: 'iOS', android: 'Android', web: 'Website', mixed: 'Several' } as const;
	let copied = $state(false);
</script>

<svelte:head><title>Errors · {data.client.name}</title></svelte:head>

{#if r.source === 'waiting'}
	<section class="grid gap-4 {data.isApp && data.isWeb ? 'lg:grid-cols-2' : ''}">
		{#if data.isWeb}
			<div class="card p-6 sm:p-8">
				<p class="text-sm text-muted">Website</p>
				<h2 class="mt-1 text-2xl font-medium">Already included in the snippet</h2>
				<p class="mt-2 text-sm text-ink-2">The Undercut snippet catches JavaScript errors on {data.client.domain.replace(/^https?:\/\//, '')} automatically (broken menus, forms that don’t send…). Nothing to add — they show here as soon as a visitor hits one.</p>
				<pre class="mt-4 overflow-x-auto rounded-[16px] bg-tile p-3 text-xs">{data.snippet}</pre>
				<button class="pill mt-3" onclick={() => { navigator.clipboard?.writeText(data.snippet); copied = true; setTimeout(() => (copied = false), 1500); }}>{copied ? 'Copied ✓' : 'Copy snippet'}</button>
			</div>
		{/if}
		{#if data.isApp}<SdkSetup api={data.api} site={data.client.id} focus="errors" />{/if}
	</section>
	<p class="mt-4 text-center text-sm text-muted">No error received yet{data.isWeb ? ' — good news, or the snippet isn’t live yet' : ''}.</p>
{:else}
	<section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
		<div class="card-dark p-5"><p class="text-sm text-white/60">Open issues</p><p class="big mt-3 text-[48px] {count('open') ? 'text-accent' : ''}">{count('open')}</p><p class="text-xs text-white/50">grouped errors to look at</p></div>
		<div class="card p-5"><p class="text-sm text-muted">Errors</p><p class="big mt-3 text-[48px]">{r.total.toLocaleString('en-US')}</p><p class="text-xs text-muted">last {r.days} days</p></div>
		<div class="card p-5"><p class="text-sm text-muted">People affected</p><p class="big mt-3 text-[48px]">{r.users.toLocaleString('en-US')}</p><p class="text-xs text-muted">anonymous users</p></div>
		{#if !data.isApp}
			<div class="card p-5"><p class="text-sm text-muted">Pages affected</p><p class="big mt-3 text-[48px]">{new Set(r.issues.map((i) => i.url).filter(Boolean)).size}</p><p class="text-xs text-muted">pages where visitors hit an error</p></div>
		{:else}
		<div class="card p-5"><p class="text-sm text-muted">Crash-free sessions</p><p class="big mt-3 text-[48px] {r.crashFree != null && r.crashFree < 99 ? 'text-bad' : ''}">{r.crashFree != null ? `${r.crashFree}%` : '—'}</p><p class="text-xs text-muted">{r.crashFree != null ? '99.5%+ is healthy' : 'after the first app sessions'}</p></div>
		{/if}
	</section>

	<section class="card mt-4 p-3 sm:p-5">
		<div class="flex flex-wrap items-center gap-2 px-2">
			{#each [['open', 'To fix'], ['resolved', 'Resolved'], ['ignored', 'Ignored']] as [k, l] (k)}<button class="pill {tab === k ? 'pill-active' : ''}" onclick={() => (tab = k as typeof tab)}>{l} ({count(k)})</button>{/each}
			{#if r.platforms.length > 1}
				<select class="input ml-auto w-auto py-1.5 text-sm" bind:value={pf} aria-label="Platform"><option value="all">All platforms</option>{#each r.platforms as p (p)}<option value={p}>{pfLabel[p]}</option>{/each}</select>
			{/if}
		</div>
		<ul class="mt-3 divide-y divide-line">
			{#each list as i (i.id)}
				<li class="py-1">
					<div class="flex items-center gap-3 rounded-[16px] px-2 py-2.5 sm:gap-4">
						<span class="size-2.5 shrink-0 rounded-full {i.fatal ? 'bg-bad' : 'bg-[#E3A21A]'}" title={i.fatal ? 'Crash' : 'Error'}></span>
						<button class="min-w-0 flex-1 text-left" onclick={() => (openId = openId === i.id ? null : i.id)} aria-expanded={openId === i.id}>
							<p class="flex items-center gap-2"><span class="truncate font-medium">{i.title}</span>{#if i.status === 'regressed'}<span class="shrink-0 rounded-full bg-bad-bg px-2 text-[10px] text-bad">came back</span>{/if}{#if i.fatal}<span class="shrink-0 rounded-full bg-ink px-2 text-[10px] text-white">crash</span>{/if}</p>
							<p class="truncate text-xs text-muted">{pfLabel[i.platform]}{i.versions.length ? ` · v${i.versions.join(', v')}` : ''} · {i.culprit || 'no stack'} · last {ago(i.lastSeen)}</p>
						</button>
						<span class="hidden sm:block"><Sparkline data={i.daily} width={90} height={28} color={i.fatal ? '#D6453D' : '#111214'} /></span>
						<span class="w-16 shrink-0 text-right text-sm"><b>{i.count}</b><span class="block text-[11px] text-muted">{i.users} user{i.users > 1 ? 's' : ''}</span></span>
					</div>
					{#if openId === i.id}
						<div class="mx-2 mb-3 rounded-[18px] bg-tile p-4 text-sm">
							<p class="text-xs text-muted">First seen {ago(i.firstSeen)} · {i.count} times · {i.users} people{i.url ? ` · ${i.url}` : ''}</p>
							{#if i.stack}<pre class="mt-3 max-h-64 overflow-auto rounded-[12px] bg-ink p-3 text-[12px] leading-relaxed text-white/85">{i.stack}</pre>{/if}
							<div class="mt-3 flex flex-wrap gap-2">
								{#each i.status === 'open' || i.status === 'regressed' ? [['resolved', '✓ Mark resolved'], ['ignored', 'Ignore']] : [['open', 'Reopen']] as [s, l] (s)}
									<form method="POST" action={act('status')} use:enhance={() => async ({ update }) => update({ reset: false, invalidateAll: true })}>
										<input type="hidden" name="id" value={i.id} /><input type="hidden" name="status" value={s} />
										<button class="btn {s === 'resolved' ? 'btn-primary' : 'btn-ghost'} py-1.5 text-sm">{l}</button>
									</form>
								{/each}
								<button class="pill" onclick={() => navigator.clipboard?.writeText(`${i.title}\n${i.culprit}\nVersions: ${i.versions.join(', ')}\n${i.count}× · ${i.users} users\n\n${i.stack}`)}>Copy for the developer</button>
							</div>
							<p class="mt-2 text-xs text-muted">Resolved issues reopen automatically (“came back”) if the error happens again.</p>
						</div>
					{/if}
				</li>
			{:else}
				<li class="px-2 py-8 text-center"><p class="text-2xl">✓</p><p class="mt-1 text-sm text-muted">{tab === 'open' ? 'Nothing to fix.' : 'Nothing here.'}</p></li>
			{/each}
		</ul>
	</section>

	{#if data.isApp}
		<details class="mt-4">
			<summary class="cursor-pointer text-sm text-muted">App SDK code</summary>
			<div class="mt-3"><SdkSetup api={data.api} site={data.client.id} focus="errors" /></div>
		</details>
	{/if}
{/if}
