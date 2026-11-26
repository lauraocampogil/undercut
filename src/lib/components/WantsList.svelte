<script lang="ts">
	// What users want, ranked (the 3 numbers, the kind filter, the list), then bugs and reliability in their own section,
	// grouped by what breaks: product decisions first, the developer's fix list right after. Used by reports and database products.
	import { kindOf, KINDS, ORDER } from '#lib/kinds.ts';
	import type { AppDict } from '#lib/app-i18n.ts';
	type Item = { id: string; label: string; kind: string; n: number; share: number; delta: number | null; isNew: boolean; quote: string | null };
	let { w, base, t, kpis = true }: { w: { list: Item[]; followed: boolean; newCount: number; rising: number; falling: number }; base: string; t: AppDict; kpis?: boolean } = $props();
	const p = $derived(t.product);
	const B = $derived(t.bugs);
	let kind = $state('');
	let group = $state('');
	const main = $derived(w.list.filter((x) => x.kind !== 'reliability'));
	const bugs = $derived(w.list.filter((x) => x.kind === 'reliability'));
	const shown = $derived(kind ? main.filter((x) => x.kind === kind) : main);
	const kinds = $derived(ORDER.filter((k) => k !== 'other' && k !== 'reliability').map((k) => ({ k, n: main.filter((x) => x.kind === k).length })).filter((x) => x.n));
	const maxN = $derived(Math.max(1, ...main.map((x) => x.n)));
	const maxB = $derived(Math.max(1, ...bugs.map((x) => x.n)));
	const first = $derived(main[0] ?? w.list[0]);

	// what breaks, read from the label (in English, French or Spanish)
	const GROUPS: [string, RegExp][] = [
		['login', /log ?in|sign.?in|sign.?up|password|account|captcha|2fa|verif|sesi[oó]n|contrase|cuenta|connexion|mot de passe|compte/i],
		['crash', /crash|freez|hang|cierr|(?<!des)bloque|cuelg|plant|ferme|fige|gel/i],
		['data', /sync|lost|lose|data|backup|delet|disappear|sincron|perd|datos|borr|desaparec|synchro|donn[ée]es|supprim|dispar/i],
		['speed', /slow|lag|load|battery|buffer|b[uú]fer|stream|playback|performance|lent|carga|bater|reproducc|rendimiento|charg|batterie|lecture/i],
		['notif', /notif|alert|alerta/i],
		['pay', /refund|billing|payment|cobr|reembols|pago|factur|rembours|paiement/i]
	];
	const groupOf = (label: string) => GROUPS.find(([, re]) => re.test(label))?.[0] ?? 'other';
	const groups = $derived([...GROUPS.map(([g]) => g), 'other'].map((g) => ({ g, items: bugs.filter((x) => groupOf(x.label) === g) })).filter((x) => x.items.length));
	const bugShown = $derived(group ? bugs.filter((x) => groupOf(x.label) === group) : bugs);
	const bugTotal = $derived(bugs.reduce((s, x) => s + x.n, 0));
</script>

{#if kpis && first}
	<section class="grid gap-3 md:grid-cols-4">
		<div class="card p-5 md:col-span-2">
			<p class="text-[13px] text-muted">{p.top}</p>
			<p class="mt-1.5 text-xl leading-snug font-medium tracking-tight">{first.label}</p>
			<p class="mt-2 flex items-baseline gap-2 text-[13px] text-ink-2"><b class="text-ink">{p.reviewsN(first.n)}</b>{#if first.delta}<span class={first.delta > 0 ? 'text-bad' : 'text-good'}>{first.delta > 0 ? '▲ +' : '▼ '}{first.delta} {p.sinceLast}</span>{/if}</p>
		</div>
		<div class="card p-5">
			<p class="text-[13px] text-muted">{w.followed ? p.sinceYour : p.inReport}</p>
			{#if w.followed}
				<p class="mt-2 text-[15px]">{@html p.newRising(w.newCount, w.rising, w.falling)}</p>
			{:else}
				<p class="mt-2 text-[15px]">{@html p.things(main.length, 0)}</p>
			{/if}
		</div>
		<a href="#bugs" class="card p-5 hover:border-black/25">
			<p class="text-[13px] text-muted">{B.title}</p>
			<p class="mt-1.5 flex items-baseline gap-2"><span class="big text-[34px] leading-none">{bugs.length}</span><span class="text-[13px] text-ink-2">{B.kpi(bugTotal)}</span></p>
		</a>
	</section>
{/if}

<div class="flex flex-wrap gap-2" role="group" aria-label="Kind">
	<button class="rounded-full border px-4 py-2 text-sm {kind === '' ? 'border-ink bg-ink text-white' : 'border-line bg-white'}" onclick={() => (kind = '')}>{p.all} <span class="opacity-60">{main.length}</span></button>
	{#each kinds as x (x.k)}
		<button class="inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm {kind === x.k ? 'border-ink bg-ink text-white' : 'border-line bg-white'}" onclick={() => (kind = kind === x.k ? '' : x.k)}><span class="size-2.5 rounded-[3px]" style="background:{KINDS[x.k].fg}"></span>{t.kinds[x.k]} <span class="opacity-60">{x.n}</span></button>
	{/each}
</div>

{#snippet row(x: Item, i: number, max: number, color: string, tag: string)}
	<a href="{base}/{x.id}" class="grid grid-cols-[36px_1fr] items-center gap-x-4 gap-y-3 border-b border-line px-5 py-4 last:border-0 hover:bg-[#fafaf8] md:grid-cols-[44px_1fr_220px_120px]">
		<span class="big text-2xl text-[#c4c4bf]">{i + 1}</span>
		<span class="flex min-w-0 flex-col gap-1.5">
			<span class="flex flex-wrap items-center gap-2">
				{#if tag}<span class="rounded-full px-2.5 py-0.5 text-xs font-medium" style="background:{kindOf(x.kind).bg};color:{kindOf(x.kind).fg}">{tag}</span>{/if}
				{#if x.isNew}<span class="text-xs text-[#1a56db]">{p.isNew}</span>{:else if x.delta}<span class="text-xs {x.delta > 0 ? 'text-bad' : 'text-good'}">{x.delta > 0 ? `▲ +${x.delta}` : `▼ ${x.delta}`} {p.sinceLast}</span>{/if}
			</span>
			<span class="text-[17px] leading-snug font-medium tracking-tight">{x.label}</span>
			{#if x.quote}<span class="truncate text-[13px] text-muted">“{x.quote}”</span>{/if}
		</span>
		<span class="col-span-2 flex flex-col gap-1.5 md:col-span-1">
			<span class="h-2.5 overflow-hidden rounded-full bg-[#f1f1ee]"><span class="block h-full rounded-full" style="width:{(x.n / max) * 100}%;background:{color}"></span></span>
			<span class="text-[13px] text-ink-2"><b class="text-ink">{p.reviewsN(x.n)}</b> · {x.share}% {p.ofComplaints}</span>
		</span>
		<span class="hidden text-right text-[13px] font-medium md:block">{p.proof}</span>
	</a>
{/snippet}

<section class="card overflow-hidden">
	{#each shown as x, i (x.id)}
		{@const k = kindOf(x.kind)}
		{@render row(x, i, maxN, k.fg, x.kind && x.kind !== 'other' ? (t.kinds[x.kind] ?? k.label) : '')}
	{/each}
</section>

{#if bugs.length}
	<section id="bugs" class="flex scroll-mt-6 flex-col gap-3.5 pt-4">
		<div>
			<h2 class="text-xl font-medium tracking-tight">{B.title} <span class="text-muted">{bugs.length}</span></h2>
			<p class="mt-1 text-[13px] text-muted">{B.intro}</p>
		</div>
		<div class="flex flex-wrap gap-2" role="group" aria-label={B.title}>
			<button class="rounded-full border px-4 py-2 text-sm {group === '' ? 'border-ink bg-ink text-white' : 'border-line bg-white'}" onclick={() => (group = '')}>{p.all} <span class="opacity-60">{bugs.length}</span></button>
			{#each groups as x (x.g)}
				<button class="rounded-full border px-3.5 py-2 text-sm {group === x.g ? 'border-ink bg-ink text-white' : 'border-line bg-white'}" onclick={() => (group = group === x.g ? '' : x.g)}>{B.groups[x.g]} <span class="opacity-60">{x.items.length}</span></button>
			{/each}
		</div>
		<div class="card overflow-hidden">
			{#each bugShown as x, i (x.id)}
				{@render row(x, i, maxB, '#d14343', B.groups[groupOf(x.label)])}
			{/each}
		</div>
	</section>
{/if}
