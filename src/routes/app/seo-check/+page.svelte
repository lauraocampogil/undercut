<script lang="ts">
	import { enhance } from '$app/forms';
	let { form } = $props();
	let loading = $state(false);
	const r = $derived(form?.report);
	const checks = $derived(
		r
			? [
					{ ok: r.found, label: 'Sitemap found', detail: r.found ? `via ${r.via}` : 'Google cannot see the list of pages' },
					{ ok: r.via === 'robots.txt', label: 'Declared in robots.txt', detail: r.via === 'robots.txt' ? 'Good: crawlers find it on their own' : 'Add "Sitemap: <url>" to robots.txt' },
					{ ok: r.broken === 0 && r.found, label: 'Pages respond', detail: r.found ? `${r.checked.length - r.broken}/${r.checked.length} sampled pages OK` : '—' },
					{ ok: r.httpUrls === 0, label: 'All pages use https', detail: r.httpUrls ? `${r.httpUrls} URLs still use http://` : 'Secure' },
					{ ok: r.duplicates === 0, label: 'No duplicates', detail: r.duplicates ? `${r.duplicates} URLs listed twice` : 'Clean' },
					{ ok: r.urlCount === 0 || r.withLastmod / r.urlCount > 0.8, label: 'Update dates present', detail: r.newestLastmod ? `Last change ${r.newestLastmod}` : 'No <lastmod> dates: Google may revisit less often' }
				]
			: []
	);
	const score = $derived(checks.length ? Math.round((checks.filter((c) => c.ok).length / checks.length) * 100) : 0);
</script>

<svelte:head><title>SEO check · Undercut</title></svelte:head>

<div class="mx-auto max-w-2xl">
	<h1 class="display text-[48px] sm:text-[64px]">Free SEO check</h1>
	<p class="mt-2 text-ink-2">Test any website in 10 seconds — a prospect's site before a meeting, or a client's after a redesign. No login needed.</p>

	<form
		method="POST"
		class="mt-6 flex gap-2"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update({ reset: false });
				loading = false;
			};
		}}
	>
		<input class="input flex-1 text-base" name="site" placeholder="example.be" value={form?.site ?? ''} autocomplete="url" />
		<button class="btn btn-primary shrink-0" disabled={loading}>{loading ? 'Checking…' : 'Check'}</button>
	</form>
	{#if form?.error}<p class="mt-3 text-sm text-bad">{form.error}</p>{/if}

	{#if r}
		<div class="card mt-6 overflow-hidden">
			<div class="flex items-center justify-between gap-4 bg-ink p-5 text-white">
				<div>
					<p class="text-sm text-white/60">{r.url}</p>
					<p class="mt-1 text-lg font-semibold">{r.found ? `${r.urlCount} pages in the sitemap` : 'No sitemap found'}</p>
				</div>
				<p class="num text-4xl font-semibold {score >= 80 ? 'text-accent' : score >= 50 ? 'text-[#ffd166]' : 'text-[#ff8a8a]'}">{score}<span class="text-lg text-white/50">/100</span></p>
			</div>
			<ul class="divide-y divide-line">
				{#each checks as c (c.label)}
					<li class="flex items-center gap-3 px-5 py-3.5">
						<span class="grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold {c.ok ? 'bg-good-bg text-good' : 'bg-bad-bg text-bad'}">{c.ok ? '✓' : '!'}</span>
						<div class="min-w-0">
							<p class="text-sm font-medium">{c.label}</p>
							<p class="truncate text-xs text-muted">{c.detail}</p>
						</div>
					</li>
				{/each}
			</ul>
			{#if r.checked.length}
				<details class="border-t border-line px-5 py-4 text-sm">
					<summary class="cursor-pointer font-medium">Pages tested ({r.checked.length})</summary>
					<ul class="mt-3 space-y-1">
						{#each r.checked as p (p.url)}
							<li class="flex justify-between gap-3"><span class="truncate text-ink-2">{p.url}</span><span class="num {p.status >= 200 && p.status < 400 ? 'text-good' : 'text-bad'}">{p.status || 'timeout'}</span></li>
						{/each}
					</ul>
				</details>
			{/if}
		</div>
		<p class="mt-4 text-center text-sm text-muted">Want this every week, with Google data? <a href="/app/clients/new" class="font-medium text-ink underline underline-offset-4">Add it as a client</a></p>
	{/if}
</div>
