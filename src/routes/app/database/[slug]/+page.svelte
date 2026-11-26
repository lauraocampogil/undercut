<script lang="ts">
	import WantsList from '#lib/components/WantsList.svelte';
	import { kindOf } from '#lib/kinds.ts';
	import { appT } from '#lib/app-i18n.ts';
	let { data } = $props();
	const t = $derived(appT(data.lang));
	const D = $derived(t.db);
	const fmt = (d: string) => new Date(d).toLocaleDateString(t.locale, { day: 'numeric', month: 'short', year: 'numeric' });
	let following = $state(false);
</script>

<svelte:head><title>{data.locked ? 'Database' : `What ${data.app.name} users want`} · Undercut</title></svelte:head>

<section class="flex flex-col gap-7">
	<a href="/app/database" class="text-sm text-muted">{D.back}</a>

	{#if data.locked}
		<div class="card flex flex-wrap items-center justify-between gap-4 p-6">
			{#if data.rebuilding}
				<p class="font-medium">{D.rebuilding}</p>
				<a href="/app/analyses?url={encodeURIComponent(data.slug)}" class="btn btn-primary">{D.analyseNow}</a>
			{:else}
				<p class="font-medium">{D.locked}</p>
				<a href="/app/settings/billing" class="btn btn-primary">{D.lockedCta}</a>
			{/if}
		</div>
	{:else}
		<header class="flex flex-wrap items-center gap-4">
			{#if data.app.icon}<img src={data.app.icon} alt="" class="size-14 rounded-2xl border border-line" />{/if}
			<div class="min-w-[240px] flex-1">
				<p class="text-[13px] text-muted">{t.product.wantsFrom}</p>
				<h1 class="text-3xl font-medium tracking-tight sm:text-[34px]">{data.app.name}</h1>
				<p class="mt-1 text-[13px] text-muted">{data.app.genre} · {D.readN(data.compare.products[0].reviews)} · {D.updated(fmt(data.updatedAt))}</p>
			</div>
			<form method="POST" action="/app/analyses?/analyze" onsubmit={() => (following = true)}>
				<input type="hidden" name="url" value={data.app.url || data.app.name} />
				<input type="hidden" name="follow" value="1" />
				<button class="btn btn-primary" disabled={following}>{following ? t.product.updating : D.followIt}</button>
			</form>
		</header>

		<!-- 1. side by side -->
		<section class="flex flex-col gap-3.5">
			<div>
				<h2 class="text-xl font-medium tracking-tight">{D.compare}</h2>
				<p class="mt-1 max-w-3xl text-[13px] text-muted">{D.compareIntro}</p>
			</div>
			<div class="card overflow-x-auto">
				<table class="w-full min-w-[720px] text-sm">
					<thead>
						<tr class="border-b border-line">
							<th class="px-5 py-4"></th>
							{#each data.compare.products as p, i}
								<th class="w-36 px-3 py-4 text-left align-top font-normal">
									<span class="flex items-center gap-2">
										{#if p.icon}<img src={p.icon} alt="" class="size-7 rounded-lg border border-line" />{/if}
										<span class="truncate {i === 0 ? 'font-semibold' : 'font-medium'}">{p.name}</span>
									</span>
									<span class="mt-1.5 block text-xs text-muted">{p.bad != null ? `${p.bad}% ${D.badShare}` : D.readN(p.reviews)}</span>
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each data.compare.rows as r (r.id)}
							{@const k = kindOf(r.kind)}
							{@const low = Math.min(...r.counts)}
							{@const max = Math.max(1, ...r.counts)}
							<tr class="border-b border-line last:border-0 hover:bg-[#fafaf8]">
								<td class="px-5 py-3.5">
									<a href="/app/database/{data.slug}/{r.id}" class="flex flex-col gap-1">
										{#if r.kind && r.kind !== 'other'}<span class="self-start rounded-full px-2 py-0.5 text-[11px] font-medium" style="background:{k.bg};color:{k.fg}">{t.kinds[r.kind] ?? k.label}</span>{/if}
										<span class="font-medium hover:underline">{r.label}</span>
									</a>
								</td>
								{#each r.counts as n, i}
									<td class="px-3 py-3.5">
										<span class="flex flex-col gap-1">
											<span class="num font-medium {n === low && r.counts.some((c) => c > low) ? 'text-good' : i === 0 ? 'text-ink' : 'text-ink-2'}">{n}</span>
											<span class="h-1.5 w-full overflow-hidden rounded-full bg-[#f1f1ee]"><span class="block h-full rounded-full" style="width:{(n / max) * 100}%;background:{i === 0 ? '#111' : '#b8b8b2'}"></span></span>
										</span>
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<!-- 2. what its users ask for, with the reviews behind each -->
		<section class="flex flex-col gap-3.5">
			<h2 class="text-xl font-medium tracking-tight">{D.ask}</h2>
			<WantsList w={data.w} base="/app/database/{data.slug}" {t} kpis={false} />
		</section>
	{/if}
</section>
