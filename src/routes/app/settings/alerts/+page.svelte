<script lang="ts">
	let { data, form } = $props();
	const a = $derived(data.agency.alerts ?? {});
	const on = (id: string) => (a.rules as Record<string, boolean> | undefined)?.[id] !== false;
</script>

<svelte:head><title>Alerts · Settings · Undercut</title></svelte:head>

<form method="POST" action="?/save" class="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
	<section class="card-dark flex flex-col gap-4 p-6 sm:p-7">
		<h2 class="display text-[34px] leading-none">Where to send</h2>
		<p class="text-sm text-white/60">Alerts get read; dashboards don’t. Undercut checks every client every morning and writes only when something needs you.</p>
		<label class="block">
			<span class="label text-white/60!">Email(s)</span>
			<input class="input mt-1.5 text-ink" name="email" value={a.email ?? ''} placeholder="team@agency.be, me@agency.be" />
			{#if !data.emailReady}<span class="mt-1 block text-xs text-white/40">Add RESEND_API_KEY in .env to send emails.</span>{/if}
		</label>
		<label class="block">
			<span class="label text-white/60!">Slack webhook URL</span>
			<input class="input mt-1.5 text-ink" name="slack" value={a.slackWebhook ?? ''} placeholder="https://hooks.slack.com/services/…" />
			<span class="mt-1 block text-xs text-white/40">Slack → Apps → Incoming Webhooks → choose a channel → copy the URL.</span>
		</label>
		<label class="flex items-center gap-3 rounded-[18px] bg-white/[.07] p-4 text-sm">
			<input type="checkbox" name="digest" checked={a.digest !== false} class="size-5 accent-ink" />
			<span><b class="font-medium">Weekly summary</b> every Monday: one line per client, ready to forward.</span>
		</label>
		<div class="mt-auto flex flex-wrap gap-2">
			<button class="btn btn-accent">Save</button>
			<button formaction="?/test" class="btn border border-white/25 text-white hover:bg-white hover:text-ink">Send a test</button>
		</div>
		{#if form?.saved}<p class="text-sm text-accent">Saved.</p>{/if}
		{#if form && 'tested' in form}<p class="text-sm {form.tested?.length ? 'text-accent' : 'text-[#ff8a80]'}">{form.tested?.length ? `Test sent by ${form.tested.join(' + ')} ✓` : 'Nothing sent — add an email (with Resend) or a Slack webhook, then save.'}</p>{/if}
	</section>

	<section class="card p-6 sm:p-7">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h2 class="display text-[34px] leading-none">What to watch</h2>
			<div class="flex gap-2">
				<button formaction="?/run" class="pill">Check now</button>
				<button formaction="?/digest" class="pill">Preview weekly summary</button>
			</div>
		</div>
		<ul class="mt-5 divide-y divide-line">
			{#each data.rules as r (r.id)}
				<li>
					<label class="flex cursor-pointer items-center justify-between gap-4 py-3.5">
						<span><span class="block font-medium">{r.label}</span><span class="block text-sm text-muted">{r.help}</span></span>
						<input type="checkbox" name="rule_{r.id}" checked={on(r.id)} class="peer sr-only" />
						<span class="relative h-7 w-12 shrink-0 rounded-full bg-[#d6d6d0] transition-colors peer-checked:bg-ink after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5"></span>
					</label>
				</li>
			{/each}
		</ul>
		{#if form && 'found' in form}<p class="mt-3 rounded-[16px] bg-tile p-3 text-sm">{form.found ? `${form.found} new alert${form.found > 1 ? 's' : ''} — see the bell.` : 'All clients checked — nothing new.'}</p>{/if}
		{#if form && 'digest' in form}<pre class="mt-3 overflow-x-auto rounded-[16px] bg-tile p-4 text-xs whitespace-pre-wrap">{form.digest?.text}</pre>{/if}
	</section>
</form>
