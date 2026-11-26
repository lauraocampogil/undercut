<script lang="ts">
	// Endless row of product icons across the full width of the page.
	let { items }: { items: { slug: string; name: string; icon: string }[] } = $props();
	// repeat the list so one half is always wider than the screen, then slide by exactly one half
	const half = $derived(items.length ? Array.from({ length: Math.max(3, Math.ceil(36 / items.length)) }, () => items).flat() : []);
</script>

{#if items.length}
	<div class="marquee relative w-full overflow-hidden py-3" aria-label="Some products in the database">
		<div class="marquee-track flex w-max">
			{#each [0, 1] as copy}
				<div class="flex shrink-0 gap-12 pr-12" aria-hidden={copy === 1}>
					{#each half as it, i (i)}
						<a href="/p/{it.slug}" class="flex items-center gap-2.5 text-sm whitespace-nowrap text-ink-2 hover:text-ink" tabindex={copy === 1 ? -1 : 0}>
							<img src={it.icon} alt="" class="size-7 rounded-lg border border-line" loading="lazy" onerror={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')} />{it.name}
						</a>
					{/each}
				</div>
			{/each}
		</div>
	</div>
{/if}
