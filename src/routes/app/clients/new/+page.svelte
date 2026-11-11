<script lang="ts">
	let { form } = $props();
	const COLORS = ['#E0A458', '#3E8E63', '#4C7DD9', '#D9534C', '#8B5CF6', '#0EA5A4', '#F97316'];
	let color = $state(COLORS[2]);
</script>

<svelte:head><title>Add client · Undercut</title></svelte:head>

<div class="mx-auto max-w-lg">
	<a href="/app" class="text-sm text-muted hover:text-ink">← Overview</a>
	<h1 class="display mt-3 text-[48px] sm:text-[64px]">Add a client</h1>
	<p class="mt-2 text-ink-2">Two fields. We check the sitemap straight away; Google data comes in the next step.</p>

	<form method="POST" class="card mt-6 space-y-5 p-6">
		{#if form?.error}<p class="rounded-lg bg-bad-bg p-3 text-sm text-bad">{form.error}</p>{/if}
		<label class="block">
			<span class="text-sm font-medium">Client name</span>
			<input class="input mt-1.5" name="name" placeholder="Boulangerie Ixelles" value={form?.name ?? ''} required />
		</label>
		<label class="block">
			<span class="text-sm font-medium">Website</span>
			<input class="input mt-1.5" name="domain" placeholder="boulangerie-ixelles.be" value={form?.domain ?? ''} required />
		</label>
		<fieldset>
			<legend class="text-sm font-medium">Colour on reports</legend>
			<div class="mt-2 flex gap-2">
				{#each COLORS as col (col)}
					<label class="cursor-pointer">
						<input type="radio" name="color" value={col} bind:group={color} class="peer sr-only" />
						<span class="block size-8 rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2" style="background:{col}"></span>
					</label>
				{/each}
			</div>
		</fieldset>
		<button class="btn btn-primary w-full justify-center">Add client →</button>
	</form>
</div>
