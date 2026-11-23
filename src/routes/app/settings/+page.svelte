<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { act } from '#lib/act.ts';
	import StartSetup from '#lib/components/StartSetup.svelte';
	import { dict, UI_LANGS } from '#lib/i18n.ts';
	let { data, form } = $props();
	const t = $derived(dict(page.data.ui));
	const keep = () => async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => update({ reset: false });
	let provider = $state('gmail');
	let testing = $state(false);
	const HOW: Record<string, string> = { gmail: 'https://myaccount.google.com/apppasswords', icloud: 'https://account.apple.com/account/manage', yahoo: 'https://login.yahoo.com/account/security' };
</script>

<svelte:head><title>{t.settings} · Undercut</title></svelte:head>

<div class="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
	<section class="card-dark relative overflow-hidden p-6 sm:p-8">
		<h2 class="text-[28px] leading-tight font-medium tracking-[-0.03em]">{t.agencyTitle}</h2>
		<div class="mt-5"><StartSetup profile={data.profile} error={form?.setupError ?? ''} {t} mode="save" saved={Boolean(form?.setupOk)} /></div>
	</section>
	<div class="grid content-start gap-4">
		<section class="card p-6" id="mailbox">
			<h2 class="font-medium">{t.mailboxTitle}</h2>
			<p class="mt-1 text-sm text-muted">{t.mailboxHelp}</p>
			{#if data.mailbox}
				<div class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-good-bg p-3 text-sm text-good">
					<span>✓ {t.mailboxConnected(data.mailbox.email)}</span>
					<form method="POST" action={act('mailboxOff')} use:enhance={keep}><button class="text-ink underline">{t.mailboxOff}</button></form>
				</div>
				{#if data.mailbox.lastError}<p class="mt-2 text-xs text-bad">{t.mailboxProblem}</p>{/if}
			{:else}
				<form
					method="POST"
					action={act('mailbox')}
					class="mt-4 grid gap-3"
					use:enhance={() => {
						testing = true;
						return async ({ update }) => {
							await update();
							testing = false;
						};
					}}
				>
					<div class="flex flex-wrap gap-2">
						{#each ['gmail', 'icloud', 'yahoo', 'other'] as k (k)}
							<label class="cursor-pointer"><input type="radio" name="provider" value={k} bind:group={provider} class="peer sr-only" /><span class="pill text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white">{t.providers[k]}</span></label>
						{/each}
					</div>
					<label class="text-sm"><span class="label">{t.mailboxEmail}</span><input name="email" type="email" required autocomplete="email" class="input mt-1.5" /></label>
					<label class="text-sm"><span class="label">{t.mailboxPass}</span><input name="pass" type="password" required autocomplete="off" class="input mt-1.5" /></label>
					<p class="-mt-1 text-xs text-muted">{t.mailboxPassHelp}{#if HOW[provider]} <a href={HOW[provider]} target="_blank" rel="noopener noreferrer" class="ml-1 text-ink underline">{t.howPass} ↗</a>{/if}</p>
					{#if provider === 'other'}
						<div class="grid grid-cols-[1fr_90px] gap-2">
							<label class="text-sm"><span class="label">{t.smtpHost}</span><input name="smtpHost" placeholder="smtp.example.be" class="input mt-1.5" /></label>
							<label class="text-sm"><span class="label">{t.port}</span><input name="smtpPort" inputmode="numeric" placeholder="587" class="input mt-1.5" /></label>
							<label class="text-sm"><span class="label">{t.imapHost}</span><input name="imapHost" placeholder="imap.example.be" class="input mt-1.5" /></label>
							<label class="text-sm"><span class="label">{t.port}</span><input name="imapPort" inputmode="numeric" placeholder="993" class="input mt-1.5" /></label>
						</div>
					{/if}
					{#if form?.mailboxError}<p class="text-sm text-bad">{t.mailboxErr[form.mailboxError] ?? form.mailboxError}</p>{/if}
					<div class="flex flex-wrap items-center gap-3"><button class="btn btn-primary text-sm" disabled={testing}>{testing ? t.mailboxTesting : t.mailboxConnect}</button><span class="text-xs text-muted">{t.mailboxSafe}</span></div>
				</form>
			{/if}
		</section>
		<section class="card p-6">
			<h2 class="font-medium">{t.langTitle}</h2>
			<p class="mt-1 text-sm text-muted">{t.langHelp}</p>
			<div class="mt-4 flex flex-wrap gap-2">
				{#each UI_LANGS as [k, l] (k)}
					<form method="POST" action={act('ui')} use:enhance={keep}><input type="hidden" name="ui" value={k} /><button class="pill text-sm {page.data.ui === k ? 'pill-active' : ''}">{l}</button></form>
				{/each}
			</div>
		</section>
		<section class="card p-6">
			<h2 class="font-medium">{t.briefTitle}</h2>
			<p class="mt-1 text-sm text-muted">{t.briefHelp}</p>
			<form method="POST" action={act('brief')} use:enhance={keep} class="mt-4 flex flex-wrap items-center gap-3">
				<input type="hidden" name="on" value={data.brief.on ? '0' : '1'} />
				<button class="pill text-sm {data.brief.on ? 'pill-active' : ''}">{data.brief.on ? t.briefOn : t.briefOff}</button>
				{#if !data.brief.ready}<span class="text-xs text-muted">{t.briefNotReady}</span>{/if}
			</form>
		</section>
		<a href="/app/settings/advanced" class="px-2 text-xs text-muted underline">{t.advanced}</a>
	</div>
</div>
