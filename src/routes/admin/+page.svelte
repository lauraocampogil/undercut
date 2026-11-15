<script lang="ts">
	import { enhance } from '$app/forms';
	import Logo from '#lib/components/Logo.svelte';
	let { data, form } = $props();
	let copied = $state('');
	const copy = (t: string) => {
		navigator.clipboard?.writeText(t);
		copied = t;
		setTimeout(() => (copied = ''), 1500);
	};
	const kindLabel: Record<string, string> = { web: 'Web', app: 'App', comms: 'Comms', other: 'Other' };
	const counts = $derived({ waiting: data.rows.filter((r) => r.status === 'waiting').length, invited: data.rows.filter((r) => r.status === 'invited').length });
</script>

<svelte:head><title>Beta · Undercut admin</title></svelte:head>

<div class="min-h-dvh bg-paper px-4 py-6 sm:px-8">
	<div class="mx-auto max-w-6xl">
		<header class="flex items-center justify-between"><a href="/app"><Logo /></a><a href="/app" class="text-sm text-muted hover:text-ink">← Back to the app</a></header>
		<h1 class="display mt-8 text-[56px] leading-none">Beta <em>agencies</em></h1>
		<section class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
			<div class="card-dark p-5"><p class="text-xs text-white/50">Joined</p><p class="big mt-2 text-[44px] leading-none text-accent">{data.joined}<span class="text-xl text-white/40">/{data.seats}</span></p></div>
			<div class="card p-5"><p class="text-xs text-muted">Invited, not joined yet</p><p class="big mt-2 text-[44px] leading-none">{counts.invited}</p></div>
			<div class="card p-5"><p class="text-xs text-muted">Waiting</p><p class="big mt-2 text-[44px] leading-none">{counts.waiting}</p></div>
			<div class="rounded-[28px] bg-[#E4F5B8] p-5"><p class="text-xs text-accent-ink/70">Seats left</p><p class="big mt-2 text-[44px] leading-none">{Math.max(0, data.seats - data.joined - counts.invited)}</p></div>
		</section>
		{#if form?.invited}
			<div class="mt-4 rounded-[20px] bg-accent p-4 text-sm text-accent-ink">
				{form.sent ? `Invitation emailed to ${form.invited} ✓` : `Invitation ready for ${form.invited} — email not configured (RESEND_API_KEY), send this link:`}
				{#if !form.sent}<button class="mt-2 block w-full truncate rounded-full bg-ink px-3 py-2 text-left text-xs text-accent" onclick={() => copy(form.link!)}>{copied === form.link ? 'Copied ✓' : form.link}</button>{/if}
			</div>
		{/if}
		<div class="card mt-4 overflow-x-auto p-2 sm:p-4">
			<table class="w-full min-w-[760px] text-sm">
				<thead><tr class="text-left text-xs text-muted"><th class="p-3 font-medium">Agency</th><th class="p-3 font-medium">Type</th><th class="p-3 font-medium">Pain</th><th class="p-3 font-medium">Signed up</th><th class="p-3 font-medium"></th></tr></thead>
				<tbody>
					{#each data.rows as r (r.id)}
						<tr class="border-t border-line align-top">
							<td class="p-3"><p class="font-medium">{r.agency}</p><p class="text-xs text-muted">{r.name} · {r.email}</p>{#if r.website}<a class="text-xs underline" href={/^https?:/.test(r.website) ? r.website : `https://${r.website}`} target="_blank" rel="noreferrer">{r.website}</a>{/if}</td>
							<td class="p-3"><span class="rounded-full bg-tile px-2.5 py-1 text-xs">{kindLabel[r.kind] ?? r.kind}</span></td>
							<td class="max-w-xs p-3 text-xs text-ink-2">{r.note || '—'}</td>
							<td class="p-3 text-xs text-muted">{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
							<td class="p-3 text-right">
								{#if r.status === 'joined'}<span class="rounded-full bg-good-bg px-3 py-1 text-xs text-good">Joined ✓</span>
								{:else if r.status === 'invited'}<button class="pill py-1 text-xs" onclick={() => copy(r.link!)}>{copied === r.link ? 'Copied ✓' : 'Invited · copy link'}</button>
								{:else}<form method="POST" action="?/invite" use:enhance><input type="hidden" name="id" value={r.id} /><button class="btn btn-primary py-1.5 text-xs">Invite →</button></form>{/if}
							</td>
						</tr>
					{:else}
						<tr><td colspan="5" class="p-10 text-center text-muted">No requests yet. Share {data.seats ? 'the landing page' : ''} — the “Join the beta” button sends people here.</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
