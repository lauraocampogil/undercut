<script lang="ts">
	// Small table of contents under the hero: tells the reader what is on the page, in order.
	let { items }: { items: [string, string][] } = $props();
</script>

<nav class="mx-auto flex max-w-[1080px] flex-wrap justify-center gap-2 px-5 pb-20 sm:px-8" aria-label="On this page">
	{#each items as [id, label], i}
		<a href="#{id}" class="rounded-full border border-line bg-white px-4 py-2 text-sm text-ink-2 hover:border-black/25 hover:text-ink"><span class="num mr-2 text-muted">0{i + 1}</span>{label}</a>
	{/each}
</nav>
