<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head><title>Agency & branding · Undercut</title></svelte:head>

<div class="mx-auto max-w-lg">
	<h1 class="display text-[48px] sm:text-[64px]">Agency & branding</h1>
	<p class="mt-2 text-ink-2">Your clients see your agency name on every report, not Undercut.</p>
	<form method="POST" class="card mt-6 space-y-5 p-6">
		{#if form?.saved}<p class="rounded-lg bg-good-bg p-3 text-sm text-good">Saved.</p>{/if}
		<label class="block">
			<span class="text-sm font-medium">Agency name</span>
			<input class="input mt-1.5" name="name" value={data.agency.name} />
		</label>
		<label class="block">
			<span class="text-sm font-medium">Brand colour</span>
			<input class="mt-1.5 block h-[42px] w-16 cursor-pointer rounded-lg border border-line bg-white p-1" type="color" name="color" value={data.agency.color} />
		</label>
		<label class="block">
			<span class="text-sm font-medium">Message at the bottom of reports</span>
			<textarea class="input mt-1.5" rows="3" name="reportFooter">{data.agency.reportFooter}</textarea>
		</label>
		<button class="btn btn-primary">Save</button>
	</form>
</div>
