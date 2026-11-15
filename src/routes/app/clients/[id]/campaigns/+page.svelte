<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import SourceBadge from '#lib/components/SourceBadge.svelte';
	let { data, form } = $props();

	type C = (typeof data.campaigns)[number];
	let openId = $state<string | null>(page.url.searchParams.get('c'));
	let editing = $state<C | null>(null);
	let copied = $state<string | null>(null);
	let channel = $state('instagram');

	const totals = $derived.by(() => {
		const t = { visits: 0, leads: 0, spend: 0 };
		for (const c of data.campaigns) {
			t.visits += c.stats.visits;
			t.leads += c.stats.leads;
			t.spend += c.budget ?? 0;
		}
		return { ...t, cpl: t.spend && t.leads ? t.spend / t.leads : null };
	});
	const icon = (id: string) => data.channels.find((c) => c.id === id)?.icon ?? '✦';
	const label = (id: string) => data.channels.find((c) => c.id === id)?.label ?? id;
	const netIcon: Record<string, string> = { instagram: '📸', facebook: '👥', linkedin: '💼', tiktok: '🎵', youtube: '▶️', pinterest: '📌', x: '𝕏' };
	const eur = (n: number) => `€${n.toLocaleString('en-US', { maximumFractionDigits: n < 100 ? 2 : 0 })}`;
	const src = (s: string) => (s === 'tracking' || s === 'ga4' ? 'google' : s === 'demo' ? 'demo' : 'off') as 'google' | 'demo' | 'off';
	const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');

	function copy(text: string) {
		navigator.clipboard?.writeText(text);
		copied = text;
		setTimeout(() => (copied = null), 1400);
	}
	function spark(daily: { visits: number; leads: number }[], key: 'visits' | 'leads', w = 220, h = 44) {
		if (daily.length < 2) return '';
		const max = Math.max(...daily.map((d) => d[key]), 1);
		return daily.map((d, i) => `${i ? 'L' : 'M'}${((i / (daily.length - 1)) * w).toFixed(1)} ${(h - (d[key] / max) * (h - 4) - 2).toFixed(1)}`).join(' ');
	}
	function edit(c: C) {
		editing = c;
		channel = c.channel;
		document.getElementById('campaign-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
	const maxNet = $derived(Math.max(1, ...data.social.nets.map((n) => n.visits)));
</script>

<svelte:head><title>Campaigns · {data.client.name} · Undercut</title></svelte:head>

<!-- KPIs -->
<section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
	<div class="card-dark p-5"><p class="text-xs text-white/50">Leads from campaigns</p><p class="big mt-2 text-[44px] leading-none text-accent">{totals.leads}</p></div>
	<div class="card p-5"><p class="text-xs text-muted">Visits from campaigns</p><p class="big mt-2 text-[44px] leading-none">{totals.visits.toLocaleString('en-US')}</p></div>
	<div class="card p-5"><p class="text-xs text-muted">Budget</p><p class="big mt-2 text-[44px] leading-none">{totals.spend ? eur(totals.spend) : '—'}</p></div>
	<div class="rounded-[28px] bg-[#E4F5B8] p-5"><p class="text-xs text-accent-ink/70">Cost per lead</p><p class="big mt-2 text-[44px] leading-none">{totals.cpl ? eur(totals.cpl) : '—'}</p></div>
</section>

<!-- How it works -->
<section class="mt-4 grid gap-3 md:grid-cols-3">
	{#each [['1', 'Create the campaign', 'Name it and choose where the link will be shared (Instagram, an ad, the newsletter, a flyer QR code…).'], ['2', 'Use the tracked link', 'Undercut gives you a link to the site. Put it in the post, the ad, the email or behind the QR code.'], ['3', 'See what it brings', 'Every visit and every call, form or WhatsApp coming from that link is counted here — per campaign, per post.']] as [n, t, d] (n)}
		<div class="flex gap-4 rounded-[24px] bg-white p-5">
			<span class="grid size-10 shrink-0 place-items-center rounded-full bg-accent font-semibold text-accent-ink">{n}</span>
			<div><p class="font-medium">{t}</p><p class="mt-1 text-sm text-muted">{d}</p></div>
		</div>
	{/each}
</section>

<!-- New / edit campaign: full width -->
<form id="campaign-form" method="POST" action="?/save" class="card-dark mt-4 scroll-mt-6 p-6 sm:p-8" use:enhance={() => async ({ result, update }) => { await update({ reset: result.type === 'success' }); if (result.type === 'success') editing = null; }}>
	{#key editing?.id ?? 'new'}
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h2 class="display text-[36px] leading-none">{editing ? 'Edit campaign' : 'New campaign'}</h2>
			{#if editing}<button type="button" class="text-xs text-white/60 underline" onclick={() => (editing = null)}>Cancel</button>{/if}
		</div>
		{#if editing}<input type="hidden" name="id" value={editing.id} />{/if}
		{#if form?.error}<p class="mt-4 rounded-[14px] bg-bad/20 p-3 text-sm text-[#ffb4ae]">{form.error}</p>{/if}
		<div class="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr_1fr]">
			<div class="flex flex-col gap-4">
				<label class="block"><span class="label text-white/50!">Name</span><input class="input mt-1.5 text-ink" name="name" value={editing?.name ?? ''} placeholder="Talent Day — December" required /></label>
				<label class="block"><span class="label text-white/50!">Page the link opens</span><input class="input mt-1.5 text-ink" name="url" value={editing?.url ?? data.client.domain} placeholder="https://…" /></label>
				<label class="block"><span class="label text-white/50!">Posts or visuals to compare (optional)</span><input class="input mt-1.5 text-ink" name="posts" value={editing?.posts?.join(', ') ?? ''} placeholder="reel-1, story, carousel" /><span class="mt-1 block text-[11px] text-white/40">One link per post — see which one brings the most.</span></label>
			</div>
			<div>
				<p class="label text-white/50!">Where will the link be shared?</p>
				<div class="mt-2 grid grid-cols-5 gap-2">
					{#each data.channels as ch (ch.id)}
						<label class="cursor-pointer" title={ch.label}>
							<input type="radio" name="channel" value={ch.id} bind:group={channel} class="peer sr-only" />
							<span class="flex flex-col items-center gap-1 rounded-[16px] bg-white/[.07] px-1 py-3 text-center text-[11px] text-white/70 peer-checked:bg-accent peer-checked:text-accent-ink"><span class="text-xl">{ch.icon}</span>{ch.label.split(' ')[0]}</span>
						</label>
					{/each}
				</div>
			</div>
			<div class="flex flex-col gap-4">
				<div class="grid grid-cols-2 gap-2">
					<label class="block"><span class="label text-white/50!">Start</span><input type="date" class="input mt-1.5 text-ink" name="start" value={editing?.start ?? new Date().toISOString().slice(0, 10)} /></label>
					<label class="block"><span class="label text-white/50!">End (optional)</span><input type="date" class="input mt-1.5 text-ink" name="end" value={editing?.end ?? ''} /></label>
					<label class="block"><span class="label text-white/50!">Budget €</span><input class="input mt-1.5 text-ink" name="budget" inputmode="decimal" value={editing?.budget ?? ''} placeholder="optional" /></label>
					<label class="block"><span class="label text-white/50!">Goal (leads)</span><input class="input mt-1.5 text-ink" name="goal" inputmode="numeric" value={editing?.goal ?? ''} placeholder="optional" /></label>
				</div>
				<button class="btn btn-accent mt-auto w-full py-3">{editing ? 'Save changes' : 'Create & get the link'}</button>
			</div>
		</div>
		{#if form?.link && !editing}
			<div class="mt-6 flex flex-wrap items-center gap-3 rounded-[18px] bg-white/[.07] p-4">
				<div class="min-w-0 flex-1"><p class="text-xs text-white/50">Your tracked link — paste it in the post, ad, email or QR code</p><p class="mt-1 font-mono text-xs break-all text-accent">{form.link}</p></div>
				<button type="button" class="btn btn-accent px-4 py-2 text-sm" onclick={() => copy(form.link)}>{copied === form.link ? 'Copied ✓' : 'Copy link'}</button>
			</div>
		{/if}
	{/key}
</form>

<div class="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
	<section class="flex flex-col gap-3">
		{#each data.campaigns as c (c.id)}
			{@const s = c.stats}
			<article class="card p-5 sm:p-6">
				<div class="flex flex-wrap items-start gap-4">
					<span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-tile text-2xl" title={label(c.channel)}>{icon(c.channel)}</span>
					<div class="min-w-0 flex-1">
						<p class="flex flex-wrap items-center gap-2">
							<span class="text-lg font-medium">{c.name}</span>
							<span class="rounded-full px-2 py-0.5 text-[11px] font-medium {s.status === 'live' ? 'bg-accent text-accent-ink' : s.status === 'scheduled' ? 'bg-tile' : 'bg-ink text-white'}">{s.status === 'live' ? '● Live' : s.status === 'scheduled' ? 'Scheduled' : 'Ended'}</span>
							<SourceBadge state={src(s.source)} />
						</p>
						<p class="text-xs text-muted">{label(c.channel)} · {fmtDate(c.start)}{c.end ? ` → ${fmtDate(c.end)}` : ' → ongoing'}{c.budget ? ` · ${eur(c.budget)}` : ''}</p>
					</div>
					<svg viewBox="0 0 220 44" class="hidden h-11 w-[160px] sm:block" preserveAspectRatio="none" aria-hidden="true">
						<path d={spark(s.daily, 'visits')} fill="none" stroke="#0D0D0D" stroke-width="2" />
						<path d={spark(s.daily, 'leads')} fill="none" stroke="#9bb93a" stroke-width="2" stroke-dasharray="3 3" />
					</svg>
				</div>

				<div class="mt-4 grid grid-cols-4 gap-2 text-center">
					<div class="rounded-[16px] bg-tile p-3"><p class="text-[11px] text-muted">Visits</p><p class="text-xl font-semibold">{s.visits.toLocaleString('en-US')}</p></div>
					<div class="rounded-[16px] bg-ink p-3 text-white"><p class="text-[11px] text-white/50">Leads</p><p class="text-xl font-semibold text-accent">{s.leads}</p></div>
					<div class="rounded-[16px] bg-tile p-3"><p class="text-[11px] text-muted">Conversion</p><p class="text-xl font-semibold">{s.conversion}%</p></div>
					<div class="rounded-[16px] bg-tile p-3"><p class="text-[11px] text-muted">Cost / lead</p><p class="text-xl font-semibold">{s.cpl ? eur(s.cpl) : '—'}</p></div>
				</div>
				{#if c.goal}
					{@const pct = Math.min(100, Math.round((s.leads / c.goal) * 100))}
					<div class="mt-3"><p class="mb-1 flex justify-between text-[11px] text-muted"><span>Goal: {c.goal} leads</span><span>{pct}%</span></p><div class="h-2 overflow-hidden rounded-full bg-tile"><div class="h-full rounded-full {pct >= 100 ? 'bg-good' : 'bg-accent'}" style="width:{pct}%"></div></div></div>
				{/if}
				{#if s.source === 'waiting'}<p class="mt-3 rounded-[14px] bg-warn-bg px-3 py-2 text-xs text-warn">No visits yet. Use the tracked link below in the post / ad — and make sure the Undercut snippet is on the site.</p>{/if}

				<div class="mt-4 flex flex-wrap items-center gap-2">
					<button class="btn btn-accent px-4 py-2 text-sm" onclick={() => copy(c.link)}>{copied === c.link ? 'Copied ✓' : '🔗 Copy tracked link'}</button>
					<button class="pill" onclick={() => (openId = openId === c.id ? null : c.id)} aria-expanded={openId === c.id}>{openId === c.id ? 'Hide details' : 'Details'}</button>
					<button class="pill" onclick={() => edit(c)}>Edit</button>
					<a class="pill" href="/r/{data.client.id}?campaign={c.id}" target="_blank" rel="noreferrer">Report ↗</a>
					<form method="POST" action="?/remove" use:enhance={({ cancel }) => { if (!confirm(`Delete “${c.name}”? Its tracked link keeps working but stats are no longer shown.`)) cancel(); }} class="ml-auto">
						<input type="hidden" name="id" value={c.id} /><button class="icon-btn size-8 text-xs" aria-label="Delete {c.name}">🗑</button>
					</form>
				</div>

				{#if openId === c.id}
					<div class="mt-5 grid gap-3 border-t border-line pt-5 md:grid-cols-2">
						<div>
							<p class="label">Leads by type</p>
							<div class="mt-2 grid grid-cols-4 gap-1.5 text-center">
								{#each [['form', '📝', 'Forms'], ['whatsapp', '💬', 'WhatsApp'], ['phone', '📞', 'Calls'], ['email', '✉️', 'Emails']] as [k, ico, l] (k)}
									<div class="rounded-[14px] bg-tile p-2"><p>{ico}</p><p class="text-lg font-semibold">{s.byKind[k as 'form']}</p><p class="text-[10px] text-muted">{l}</p></div>
								{/each}
							</div>
							<p class="label mt-4">Landing pages</p>
							<ul class="mt-2 space-y-1 text-sm">{#each s.pages as p (p.key)}<li class="flex justify-between rounded-xl bg-tile px-3 py-1.5"><span class="truncate">{p.key}</span><span class="text-muted">{p.visits} · <b class="text-ink">{p.leads}</b></span></li>{:else}<li class="text-xs text-muted">—</li>{/each}</ul>
						</div>
						<div>
							<p class="label">Best posts / visuals</p>
							<ul class="mt-2 space-y-1.5">
								{#each s.posts as p, i (p.key)}
									{@const pl = c.postLinks.find((x) => x.post === p.key)}
									<li class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm {i === 0 && p.leads ? 'bg-[#E4F5B8]' : 'bg-tile'}">
										<span class="min-w-0 flex-1 truncate">{i === 0 && p.leads ? '🏆 ' : ''}{p.key}</span><span class="text-xs text-muted">{p.visits} visits · <b class="text-ink">{p.leads} leads</b></span>
										{#if pl}<button class="text-xs underline" onclick={() => copy(pl.link)}>{copied === pl.link ? '✓' : 'link'}</button>{/if}
									</li>
								{:else}<li class="text-xs text-muted">Add post names when editing to compare visuals.</li>{/each}
							</ul>
							<p class="label mt-4">Tracked link</p>
							<p class="mt-1 rounded-xl bg-ink p-3 font-mono text-[11px] break-all text-accent">{c.link}</p>
						</div>
					</div>
				{/if}
			</article>
		{:else}
			<div class="card flex flex-col items-center gap-3 p-10 text-center">
				<p class="text-4xl">📣</p>
				<p class="display text-[32px] leading-none">No campaigns yet</p>
				<p class="max-w-sm text-sm text-muted">Create one → put the tracked link in the post, ad, newsletter or QR → see the calls, forms and WhatsApps it brings.</p>
			</div>
		{/each}

		{#if data.detected.length}
			<div class="card p-5">
				<p class="font-medium">Campaigns found on the site</p>
				<p class="text-sm text-muted">Links with a utm_campaign that aren’t tracked here yet.</p>
				<ul class="mt-3 space-y-1.5">
					{#each data.detected as d (d.slug)}
						<li class="flex items-center gap-3 rounded-xl bg-tile px-3 py-2 text-sm">
							<span class="min-w-0 flex-1 truncate font-medium">{d.slug}</span><span class="text-xs text-muted">{d.source || '—'} / {d.medium || '—'} · {d.visits} visits · {d.leads} leads</span>
							<form method="POST" action="?/adopt" use:enhance><input type="hidden" name="slug" value={d.slug} /><input type="hidden" name="source" value={d.source} /><input type="hidden" name="medium" value={d.medium} /><button class="pill py-1 text-xs">Track</button></form>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</section>

	<aside class="flex flex-col gap-4">
		<div class="card p-6">
			<div class="flex items-center justify-between gap-3"><div><h2 class="text-lg font-medium">Social networks</h2><p class="text-sm text-muted">All visits from social, last {data.days} days.</p></div><SourceBadge state={src(data.social.source)} /></div>
			<ul class="mt-4 space-y-3">
				{#each data.social.nets as n (n.net)}
					<li>
						<p class="mb-1 flex items-center justify-between text-sm"><span>{netIcon[n.net] ?? '•'} <span class="capitalize">{n.net}</span></span><span class="text-muted">{n.visits} visits · <b class="text-ink">{n.leads} leads</b></span></p>
						<div class="h-2 overflow-hidden rounded-full bg-tile"><div class="h-full rounded-full bg-ink" style="width:{(n.visits / maxNet) * 100}%"></div></div>
					</li>
				{:else}
					<li class="text-sm text-muted">No visits from social networks yet.</li>
				{/each}
			</ul>
		</div>
	</aside>
</div>

