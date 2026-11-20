<script lang="ts">
	import { enhance } from '$app/forms';
	import { act } from '#lib/act.ts';
	import AgencySetup from '#lib/components/AgencySetup.svelte';
	let { data, form } = $props();

	type Stage = 'new' | 'contacted' | 'talking' | 'won' | 'lost';
	const STAGES: { id: Stage; label: string; help: string }[] = [
		{ id: 'new', label: 'To contact', help: 'Found for you, not contacted yet' },
		{ id: 'contacted', label: 'Contacted', help: 'Message sent, waiting for an answer' },
		{ id: 'talking', label: 'Talking', help: 'They answered: call, quote, meeting' },
		{ id: 'won', label: 'Won', help: 'Signed 🎉' },
		{ id: 'lost', label: 'Not now', help: 'Said no or never answered' }
	];
	let tab = $state<Stage>('new');
	let open = $state<string | null>(null);
	let editing = $state(false);
	let finding = $state(false);
	let copied = $state('');
	const keep = () => async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => update({ reset: false });
	const list = $derived(data.pipeline.filter((p) => p.stage === tab));
	const left = $derived(Math.max(0, data.quota - data.used));
	const today = new Date().toISOString().slice(0, 10);
	const copy = async (id: string, t: string) => {
		await navigator.clipboard.writeText(t);
		copied = id;
		setTimeout(() => (copied = ''), 1600);
	};
	const mailto = (p: (typeof data.pipeline)[number]) => `mailto:${p.email}?subject=${encodeURIComponent(p.name)}&body=${encodeURIComponent(p.message)}`;
	const SERVICE: Record<string, string> = { web: 'websites', app: 'apps', social: 'social media', seo: 'SEO', branding: 'branding', ads: 'ads' };
</script>

<svelte:head><title>Prospects · Undercut</title></svelte:head>

{#if !data.profile || editing}
	<section class="card-dark relative overflow-hidden p-6 sm:p-10">
		<div class="pointer-events-none absolute -right-24 -bottom-24 size-80 rounded-full bg-accent/30 blur-3xl"></div>
		<p class="relative text-sm text-accent">{data.profile ? 'Your agency' : 'Step 1'}</p>
		<h1 class="relative mt-2 max-w-2xl text-[32px] leading-tight font-medium sm:text-[44px]">{data.profile ? 'What we understood about your agency' : 'Paste your agency’s URL. We find the businesses that need you.'}</h1>
		<div class="relative mt-6 max-w-2xl"><AgencySetup profile={data.profile} error={form?.setupError ?? ''} onsaved={() => (editing = false)} /></div>
		{#if editing}<button class="relative mt-4 text-sm text-white/60 underline" onclick={() => (editing = false)}>Cancel</button>{/if}
	</section>
{:else}
	<section class="flex flex-wrap items-end justify-between gap-6">
		<div>
			<p class="label">{data.profile.name} · {data.profile.services.map((s) => SERVICE[s] ?? s).join(', ')} · {data.profile.city} <button class="ml-1 underline" onclick={() => (editing = true)}>change</button></p>
			<h1 class="display mt-2 text-[48px] sm:text-[72px]">Your <em>prospects</em></h1>
		</div>
		<form method="POST" action={act('find')} use:enhance={() => { finding = true; return async ({ update, result }) => { await update({ reset: false }); finding = false; tab = 'new'; }; }} class="flex flex-col items-start gap-1 sm:items-end">
			<button class="btn btn-primary" disabled={finding || !left}>{finding ? 'Looking around ' + data.profile.city + '…' : '+ Find 5 new prospects'}</button>
			<span class="text-xs text-muted">{left} of {data.quota} left this month</span>
		</form>
	</section>
	{#if form?.findError}<p class="mt-4 rounded-[18px] bg-warn-bg p-4 text-sm text-warn">{form.findError}</p>{/if}
	{#if form?.found}<p class="mt-4 rounded-[18px] bg-good-bg p-4 text-sm text-good">{form.found} new prospects added to “To contact”.</p>{/if}

	<div class="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
		{#each STAGES as s (s.id)}
			<button class="rounded-[22px] p-4 text-left transition-colors {tab === s.id ? 'bg-ink text-white' : 'bg-white hover:bg-tile'}" onclick={() => (tab = s.id)} title={s.help}>
				<span class="big block text-3xl">{data.stats.counts[s.id]}</span>
				<span class="mt-1 block text-xs {tab === s.id ? 'text-white/60' : 'text-muted'}">{s.label}</span>
			</button>
		{/each}
	</div>
	{#if data.stats.replyRate != null}<p class="mt-3 text-sm text-muted">Reply rate: <b class="text-ink">{data.stats.replyRate}%</b> of contacted businesses answered.{#if data.stats.wonValue} Won this month: <b class="text-ink">€{data.stats.wonValue}/month</b>.{/if}</p>{/if}

	<section class="mt-5 grid gap-3">
		{#each list as p (p.id)}
			{@const late = p.next && p.next <= today}
			<article class="card overflow-hidden">
				<button class="flex w-full items-center gap-4 p-4 text-left sm:p-5" onclick={() => (open = open === p.id ? null : p.id)} aria-expanded={open === p.id}>
					<span class="grid size-12 shrink-0 place-items-center rounded-full text-sm font-semibold {p.score >= 60 ? 'bg-accent text-accent-ink' : 'bg-tile'}">{p.score}</span>
					<span class="min-w-0 flex-1">
						<b class="block truncate font-medium">{p.name}</b>
						<span class="block truncate text-sm text-muted">{p.category} · {p.pitch}</span>
					</span>
					{#if p.next}<span class="hidden shrink-0 rounded-full px-3 py-1 text-xs sm:inline {late ? 'bg-bad-bg text-bad' : 'bg-tile text-ink-2'}">{late ? 'Follow up today' : `Follow up ${p.next}`}</span>{/if}
					<span class="text-muted">{open === p.id ? '−' : '+'}</span>
				</button>
				{#if open === p.id}
					<div class="grid gap-5 border-t border-line p-4 sm:p-5 lg:grid-cols-[1fr_1.2fr]">
						<div>
							<ul class="flex flex-wrap gap-1.5">{#each p.issues as x (x.key)}<li class="rounded-full bg-tile px-3 py-1 text-xs">{x.label}</li>{/each}</ul>
							<dl class="mt-4 grid gap-1.5 text-sm">
								{#if p.address}<div><dt class="inline text-muted">Address</dt> <dd class="inline">{p.address}</dd></div>{/if}
								{#if p.website}<div><dt class="inline text-muted">Website</dt> <dd class="inline"><a class="underline" href={p.website.startsWith('http') ? p.website : `https://${p.website}`} target="_blank" rel="noopener nofollow">{p.website.replace(/^https?:\/\//, '')}</a>{#if (p.checked.ms ?? 0) > 50} · {((p.checked.ms ?? 0) / 1000).toFixed(1)} s{/if}</dd></div>{/if}
								{#if p.phone}<div><dt class="inline text-muted">Phone</dt> <dd class="inline"><a class="underline" href="tel:{p.phone}">{p.phone}</a></dd></div>{/if}
								{#if p.email}<div><dt class="inline text-muted">Email</dt> <dd class="inline">{p.email}</dd></div>{/if}
								{#if p.instagram}<div><dt class="inline text-muted">Instagram</dt> <dd class="inline">{p.instagram}</dd></div>{/if}
								<div><a class="text-xs text-muted underline" href={p.osmUrl} target="_blank" rel="noopener">See on the map</a></div>
							</dl>
							<div class="mt-4 flex flex-wrap gap-2">
								{#if data.clients[p.id]}<a href="/app/crm/{data.clients[p.id]}" class="btn btn-primary text-xs">Open client →</a>
								{:else if p.stage === 'won' || p.stage === 'talking'}<form method="POST" action="?/makeClient"><input type="hidden" name="id" value={p.id} /><button class="btn btn-primary text-xs">{p.stage === 'won' ? 'Make client' : 'Signed! Make client'}</button></form>{/if}
								{#each STAGES.filter((s) => s.id !== p.stage) as s (s.id)}
									<form method="POST" action={act('stage')} use:enhance={keep}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="stage" value={s.id} /><button class="pill text-xs">→ {s.label}</button></form>
								{/each}
							</div>
						</div>
						<div class="grid gap-3">
							<div class="rounded-[20px] bg-tile p-4">
								<p class="text-xs text-muted">First message — review it, then send it yourself</p>
								<p class="mt-2 text-sm whitespace-pre-line">{p.message}</p>
								<div class="mt-3 flex flex-wrap gap-2">
									<button class="btn btn-primary text-sm" onclick={() => copy(p.id, p.message)}>{copied === p.id ? 'Copied ✓' : 'Copy'}</button>
									{#if p.email}<a class="pill text-sm" href={mailto(p)}>Open in my email</a>{/if}
								</div>
							</div>
							<form method="POST" action={act('item')} use:enhance={keep} class="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
								<input type="hidden" name="id" value={p.id} />
								<label class="text-xs text-muted">Follow up on<input type="date" name="next" value={p.next ?? ''} class="input mt-1 text-sm" /></label>
								<label class="text-xs text-muted">Worth (€/month)<input name="value" inputmode="decimal" value={p.value ?? ''} placeholder="e.g. 150" class="input mt-1 text-sm" /></label>
								<button class="pill text-sm">{form?.saved === p.id ? 'Saved ✓' : 'Save'}</button>
								<label class="text-xs text-muted sm:col-span-3">Notes<textarea name="note" rows="2" class="input mt-1 text-sm" placeholder="Called on Tuesday, wants a quote…">{p.note ?? ''}</textarea></label>
							</form>
							<form method="POST" action={act('remove')} use:enhance={keep}><input type="hidden" name="id" value={p.id} /><button class="text-xs text-muted underline">Remove from my list</button></form>
						</div>
					</div>
				{/if}
			</article>
		{:else}
			<p class="card p-6 text-sm text-muted">{tab === 'new' ? 'Nobody to contact right now — find 5 new prospects above.' : 'Nobody here yet.'}</p>
		{/each}
	</section>
	<p class="mt-6 text-xs text-muted">Business data © <a href="https://www.openstreetmap.org/copyright" class="underline" target="_blank" rel="noopener">OpenStreetMap contributors</a>, via <a href="https://www.geoapify.com/" class="underline" target="_blank" rel="noopener">Geoapify</a>. Websites checked live by Undercut. You review and send every message yourself.</p>
{/if}
