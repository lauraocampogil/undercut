<script lang="ts">
	// "Why?" next to any number that moved: splits the change across channel, page, device and country.
	let { clientId, metric, days = 28, dark = false }: { clientId: string; metric: 'visits' | 'leads' | 'clicks'; days?: number; dark?: boolean } = $props();
	type Item = { key: string; cur: number; prev: number; delta: number; share: number };
	type R = { label: string; cur: number; prev: number; delta: number; pct: number; source: string; sentence: string; dims: { dim: string; label: string; items: Item[] }[] };
	let open = $state(false);
	let busy = $state(false);
	let r = $state<R | null>(null);
	async function go(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		busy = true;
		r = await fetch(`/api/why?client=${clientId}&metric=${metric}&days=${days}`).then((x) => x.json());
		busy = false;
		open = true;
	}
	const max = (items: Item[]) => Math.max(1, ...items.map((i) => Math.abs(i.delta)));
</script>

<button class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium {dark ? 'bg-white/10 text-white/80 hover:bg-white/20' : 'bg-tile text-ink-2 hover:bg-ink hover:text-white'}" onclick={go} title="Why did this change?">
	{busy ? '…' : 'Why?'}
</button>

{#if open && r}
	<div class="fixed inset-0 z-50 grid place-items-end bg-black/40 p-3 text-ink sm:place-items-center" role="presentation" onclick={(e) => e.target === e.currentTarget && (open = false)}>
		<div class="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl sm:p-7" role="dialog" aria-modal="true" aria-label="Why did this change">
			<div class="flex items-start justify-between gap-4">
				<div>
					<p class="label">Why did {r.label.toLowerCase()} change? · {r.source === 'demo' ? 'example data' : r.source === 'google' ? 'Google data' : 'Undercut tracking'}</p>
					<p class="display mt-2 text-[28px] leading-[1.15] sm:text-[32px]">{r.sentence}</p>
				</div>
				<button class="icon-btn shrink-0" onclick={() => (open = false)} aria-label="Close">✕</button>
			</div>
			<div class="mt-6 grid gap-4 sm:grid-cols-2">
				{#each r.dims as d (d.dim)}
					<div class="rounded-[20px] bg-tile p-4">
						<p class="text-sm font-medium">{d.label}</p>
						<ul class="mt-3 space-y-2">
							{#each d.items as it (it.key)}
								<li class="text-sm">
									<div class="flex items-center justify-between gap-2">
										<span class="truncate">{it.key}</span>
										<span class="shrink-0 text-xs {it.delta < 0 ? 'text-bad' : it.delta > 0 ? 'text-good' : 'text-muted'}">{it.delta > 0 ? '+' : ''}{it.delta}</span>
									</div>
									<div class="mt-1 h-1.5 rounded-full bg-white">
										<div class="h-full rounded-full {it.delta < 0 ? 'bg-bad' : 'bg-good'}" style="width:{(Math.abs(it.delta) / max(d.items)) * 100}%"></div>
									</div>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
			<p class="mt-4 text-xs text-muted">{r.prev.toLocaleString('en-US')} → {r.cur.toLocaleString('en-US')} compared with the previous {days} days.</p>
		</div>
	</div>
{/if}
