<script lang="ts">
	// Weekday × week grid (reference "Orders" heatmap): quiet greys, busiest cells black, top cell lime
	import { day, n } from '#lib/format.ts';
	type P = { date: string; value: number };
	let { data }: { data: P[] } = $props();
	const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const weeks = $derived.by(() => {
		const out: (P | null)[][] = [];
		let col: (P | null)[] = new Array(7).fill(null);
		for (const p of data) {
			const wd = (new Date(p.date + 'T00:00:00Z').getUTCDay() + 6) % 7;
			if (wd === 0 && col.some(Boolean)) {
				out.push(col);
				col = new Array(7).fill(null);
			}
			col[wd] = p;
		}
		if (col.some(Boolean)) out.push(col);
		return out.slice(-6);
	});
	const values = $derived(data.map((d) => d.value).sort((a, b) => a - b));
	const q = (f: number) => values[Math.floor(f * (values.length - 1))] ?? 0;
	const maxV = $derived(values.at(-1) ?? 0);
	function shade(v: number) {
		if (v === maxV) return 'bg-accent';
		if (v >= q(0.8)) return 'bg-ink';
		if (v >= q(0.6)) return 'bg-[#6b6c70]';
		if (v >= q(0.35)) return 'bg-[#c4c4bf]';
		return 'bg-[#e7e7e2]';
	}
</script>

<div class="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5">
	{#each DAYS as d, wd (d)}
		<span class="text-xs text-muted">{d}</span>
		<div class="grid gap-1.5" style="grid-template-columns: repeat({weeks.length}, minmax(0, 1fr))">
			{#each weeks as w, wi (wi)}
				{@const p = w[wd]}
				<div class="h-7 rounded-lg {p ? shade(p.value) : 'bg-transparent'}" title={p ? `${day(p.date)} · ${n(p.value)}` : ''}></div>
			{/each}
		</div>
	{/each}
</div>
