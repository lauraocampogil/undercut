<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head><title>My account · Undercut</title></svelte:head>

<div class="grid gap-4 lg:grid-cols-2">
	<form method="POST" class="card space-y-5 p-6 sm:p-7">
		<h2 class="display text-[34px] leading-none">My account</h2>
		<label class="block"><span class="label">Name</span><input class="input mt-1.5" name="name" value={data.account.name} /></label>
		<label class="block"><span class="label">Email</span><input class="input mt-1.5" type="email" name="email" value={data.account.email} placeholder="you@agency.be" /></label>
		<label class="block">
			<span class="label">Language of AI summaries & reports</span>
			<select class="input mt-1.5" name="language">
				{#each [['en', 'English'], ['fr', 'Français'], ['nl', 'Nederlands'], ['es', 'Español']] as [v, l] (v)}<option value={v} selected={data.account.language === v}>{l}</option>{/each}
			</select>
		</label>
		{#if form?.saved}<p class="rounded-[16px] bg-good-bg p-3 text-sm text-good">Saved.</p>{/if}
		<button class="btn btn-primary">Save</button>
	</form>

	<div id="logout" class="card-dark flex scroll-mt-6 flex-col gap-4 p-6 sm:p-7">
		<h2 class="display text-[34px] leading-none">Log out</h2>
		<p class="text-sm text-white/60">This MVP runs as a single workspace on your computer, so there is no login yet. Accounts, log in / log out and client logins come with Supabase Auth — the next step before going online.</p>
		<button class="btn mt-auto self-start border border-white/20 text-white/50" disabled>Log out</button>
	</div>
</div>
