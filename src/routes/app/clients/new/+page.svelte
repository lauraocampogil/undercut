<script lang="ts">
	let { form } = $props();
	const COLORS = ['#E0A458', '#3E8E63', '#4C7DD9', '#D9534C', '#8B5CF6', '#0EA5A4', '#F97316'];
	let color = $state(COLORS[2]);
	let type = $state('web');
</script>

<svelte:head><title>Add client · Undercut</title></svelte:head>

<div class="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1fr_1.2fr]">
	<div class="card-dark flex flex-col justify-between gap-8 p-7">
		<div>
			<a href="/app" class="label text-white/50! hover:text-white!">← Overview</a>
			<h1 class="display mt-4 text-[52px] leading-none">Add a <em>client</em></h1>
			<p class="mt-3 text-white/60">Two fields. The SEO audit starts on its own; Google, heatmaps and app data come in the next step.</p>
		</div>
		<ul class="space-y-2 text-sm text-white/70">
			<li>1 · Name and website</li>
			<li>2 · Connect Google (optional)</li>
			<li>3 · Paste the heatmap snippet (optional)</li>
		</ul>
	</div>

	<form method="POST" class="card space-y-5 p-7">
		{#if form?.error}<p class="rounded-[16px] bg-bad-bg p-3 text-sm text-bad">{form.error}</p>{/if}
		<label class="block"><span class="label">Client name</span><input class="input mt-1.5" name="name" placeholder="Boulangerie Ixelles" value={form?.name ?? ''} required /></label>
		<fieldset>
			<legend class="label">What do you manage for them?</legend>
			<div class="mt-2 grid grid-cols-3 gap-2">
				{#each [['web', 'Website'], ['app', 'App'], ['both', 'Both']] as [val, l] (val)}
					<label class="cursor-pointer">
						<input type="radio" name="type" value={val} bind:group={type} class="peer sr-only" />
						<span class="block rounded-full border border-[#d6d6d0] py-2.5 text-center text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white">{l}</span>
					</label>
				{/each}
			</div>
		</fieldset>
		<label class="block">
			<span class="label">Website {type === 'app' ? '(optional)' : ''}</span>
			<input class="input mt-1.5" name="domain" placeholder="boulangerie-ixelles.be" value={form?.domain ?? ''} required={type !== 'app'} />
		</label>
		<fieldset>
			<legend class="label">Colour on reports</legend>
			<div class="mt-2 flex gap-2">
				{#each COLORS as col (col)}
					<label class="cursor-pointer">
						<input type="radio" name="color" value={col} bind:group={color} class="peer sr-only" />
						<span class="block size-9 rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2" style="background:{col}"></span>
					</label>
				{/each}
			</div>
		</fieldset>
		<button class="btn btn-primary w-full">Add client →</button>
	</form>
</div>
