<script lang="ts">
	import { untrack } from 'svelte';
	let { data, form } = $props();
	let role = $state(untrack(() => (data.preselect ? 'client' : 'member')));
	const roleHelp = { admin: 'Everything, incl. billing', member: 'All clients, no billing', client: 'Sees only their own dashboard & report' };
	const clientName = (id?: string) => data.clientsList.find((c) => c.id === id)?.name;
</script>

<svelte:head><title>Team · Undercut</title></svelte:head>

<div class="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
	<section class="card p-6 sm:p-7">
		<h2 class="display text-[34px] leading-none">Team</h2>
		<p class="mt-2 text-sm text-muted">People of your agency — and clients who get read-only access to their own dashboard.</p>
		<ul class="mt-5 divide-y divide-line">
			<li class="flex items-center gap-3 py-3">
				<span class="grid size-9 place-items-center rounded-full bg-[#E4F5B8] text-sm font-semibold text-accent-ink">{data.owner.name.slice(0, 1)}</span>
				<div class="min-w-0 flex-1"><p class="truncate font-medium">{data.owner.name} <span class="text-xs font-normal text-muted">(you)</span></p><p class="truncate text-xs text-muted">{data.owner.email || 'no email yet'}</p></div>
				<span class="rounded-full bg-ink px-2.5 py-1 text-[11px] text-white">Owner</span>
			</li>
			{#each data.members as m (m.email)}
				<li class="flex items-center gap-3 py-3">
					<span class="grid size-9 place-items-center rounded-full bg-tile text-sm font-semibold">{m.email.slice(0, 1).toUpperCase()}</span>
					<div class="min-w-0 flex-1">
						<p class="truncate font-medium">{m.email}</p>
						<p class="truncate text-xs text-muted">{m.status === 'invited' ? 'Invitation pending' : 'Active'}{m.clientId ? ` · ${clientName(m.clientId)}` : ''}</p>
					</div>
					<span class="rounded-full bg-tile px-2.5 py-1 text-[11px] capitalize">{m.role}</span>
					<form method="POST" action="?/remove"><input type="hidden" name="email" value={m.email} /><button class="text-xs text-bad hover:underline">Remove</button></form>
				</li>
			{/each}
		</ul>
	</section>

	<form method="POST" action="?/invite" class="card-dark flex flex-col gap-4 p-6 sm:p-7">
		<h2 class="display text-[34px] leading-none">Invite</h2>
		<label class="block"><span class="label text-white/60!">Email</span><input class="input mt-1.5 text-ink" name="email" type="email" placeholder="name@agency.be" required /></label>
		<fieldset>
			<legend class="label text-white/60!">Role</legend>
			<div class="mt-2 grid grid-cols-3 gap-2">
				{#each ['admin', 'member', 'client'] as r (r)}
					<label class="cursor-pointer"><input type="radio" name="role" value={r} bind:group={role} class="peer sr-only" /><span class="block rounded-full border border-white/20 py-2 text-center text-sm capitalize peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-ink">{r}</span></label>
				{/each}
			</div>
			<p class="mt-2 text-xs text-white/50">{roleHelp[role as keyof typeof roleHelp]}</p>
		</fieldset>
		{#if role === 'client'}
			<label class="block"><span class="label text-white/60!">Which client?</span>
				<select class="input mt-1.5 text-ink" name="clientId">{#each data.clientsList as c (c.id)}<option value={c.id} selected={c.id === data.preselect}>{c.name}</option>{/each}</select>
			</label>
		{/if}
		{#if form?.error}<p class="text-sm text-[#ff8a80]">{form.error}</p>{/if}
		{#if form?.invited}<p class="rounded-[16px] bg-accent p-3 text-sm text-accent-ink">Invitation saved for {form.invited}. Emails are sent once accounts (Supabase Auth) are live.</p>{/if}
		<button class="btn btn-accent mt-auto self-start">Send invitation</button>
	</form>
</div>
