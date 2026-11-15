<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();
</script>

<svelte:head><title>My account · Undercut</title></svelte:head>

<div class="grid gap-4 lg:grid-cols-2">
	<form method="POST" action="?/profile" use:enhance={() => async ({ update }) => update({ reset: false })} class="card space-y-5 p-6 sm:p-7">
		<h2 class="display text-[34px] leading-none">My account</h2>
		<label class="block"><span class="label">Name</span><input class="input mt-1.5" name="name" value={data.me.name} /></label>
		<label class="block"><span class="label">Email {data.role === 'owner' ? '· your login' : ''}</span><input class="input mt-1.5" type="email" name="email" value={data.me.email} placeholder="you@agency.be" disabled={data.role !== 'owner' || data.emailLocked} /></label>
		{#if data.role === 'owner'}
			<label class="block">
				<span class="label">Language of AI summaries & reports</span>
				<select class="input mt-1.5" name="language">
					{#each [['en', 'English'], ['fr', 'Français'], ['nl', 'Nederlands'], ['es', 'Español']] as [v, l] (v)}<option value={v} selected={data.me.language === v}>{l}</option>{/each}
				</select>
			</label>
		{/if}
		{#if form?.error}<p class="rounded-[16px] bg-bad-bg p-3 text-sm text-bad">{form.error}</p>{/if}
		{#if form?.saved}<p class="rounded-[16px] bg-good-bg p-3 text-sm text-good">Saved.</p>{/if}
		<button class="btn btn-primary">Save</button>
	</form>

	<div class="flex flex-col gap-4">
		<form method="POST" action="?/password" use:enhance class="card space-y-4 p-6 sm:p-7">
			<h2 class="display text-[34px] leading-none">{data.hasPassword ? 'Password' : 'Protect this workspace'}</h2>
			{#if !data.hasPassword}<p class="text-sm text-muted">Right now anyone who opens this address sees the dashboard. Set a password and Undercut asks for it on every new device.</p>{/if}
			{#if data.hasPassword}<label class="block"><span class="label">Current password</span><input class="input mt-1.5" type="password" name="current" autocomplete="current-password" required /></label>{/if}
			<label class="block"><span class="label">New password</span><input class="input mt-1.5" type="password" name="password" minlength="8" autocomplete="new-password" placeholder="At least 8 characters" required /></label>
			{#if form?.pwError}<p class="rounded-[16px] bg-bad-bg p-3 text-sm text-bad">{form.pwError}</p>{/if}
			{#if form?.pwSaved}<p class="rounded-[16px] bg-good-bg p-3 text-sm text-good">Password saved. Login is now required.</p>{/if}
			<button class="btn btn-primary">{data.hasPassword ? 'Change password' : 'Set password'}</button>
		</form>

		<form id="logout" method="POST" action="/logout" class="card-dark flex scroll-mt-6 items-center justify-between gap-4 p-6 sm:p-7">
			<div><h2 class="display text-[30px] leading-none">Log out</h2><p class="mt-1 text-sm text-white/60">{data.locked ? 'You will need your password to come back.' : 'Set a password first — without it there is nothing to log out of.'}</p></div>
			<button class="btn btn-accent shrink-0" disabled={!data.locked}>Log out</button>
		</form>
	</div>
</div>
