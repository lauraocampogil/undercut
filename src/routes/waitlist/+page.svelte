<script lang="ts">
	import { enhance } from '$app/forms';
	import SiteNav from '#lib/components/SiteNav.svelte';
	import { WAIT } from '#lib/waitlist-i18n.ts';
	import { fill } from '#lib/site-i18n.ts';
	import { PRICE } from '#lib/pricing.ts';
	let { data, form } = $props();

	const t = $derived(WAIT[data.lang]);
	const me = $derived(form?.done ? form.me : data.me);
	const link = $derived(me ? `${data.base}/waitlist?ref=${me.refCode}` : '');

	let step = $state(0);
	let busy = $state(false);
	let copied = $state(false);
	let jobs = $state<string[]>([]);
	let sets: HTMLFieldSetElement[] = $state([]);

	function next() {
		const fs = sets[step];
		for (const el of fs.querySelectorAll<HTMLInputElement>('input,select,textarea')) {
			if (!el.checkValidity()) {
				el.reportValidity();
				return;
			}
		}
		step = Math.min(step + 1, 3);
	}
	function copy() {
		navigator.clipboard.writeText(link);
		copied = true;
		setTimeout(() => (copied = false), 1800);
	}
	const shareText = $derived(encodeURIComponent('I just joined the Undercut waitlist: the database of what users hate about apps and SaaS.'));
</script>

<svelte:head>
	<title>{t.title} · Undercut</title>
	<meta name="description" content={t.sub} />
	<meta property="og:title" content="{t.title} · Undercut" />
	<meta property="og:description" content={t.sub} />
	<meta property="og:url" content="https://getundercut.app/waitlist" />
	<meta name="twitter:title" content="{t.title} · Undercut" />
	<meta name="twitter:description" content={t.sub} />
</svelte:head>

{#snippet chip(type: 'radio' | 'checkbox', name: string, value: string, label: string, required = false)}
	<label class="flex cursor-pointer items-center gap-2 rounded-xl border border-line px-3.5 py-2.5 text-sm transition-colors has-[:checked]:border-ink has-[:checked]:bg-[#f4f4f2]">
		{#if name === 'jobs'}
			<input type="checkbox" name="jobs" {value} class="accent-black" bind:group={jobs} disabled={!jobs.includes(value) && jobs.length >= 3} />
		{:else}
			<input {type} {name} {value} class="accent-black" {required} />
		{/if}
		{label}
	</label>
{/snippet}

<SiteNav lang={data.lang} cta="#top" ctaLabel={t.send} />

<main class="mx-auto grid max-w-[1200px] gap-12 px-5 pt-14 pb-28 sm:px-8 lg:grid-cols-[1fr_1.15fr] lg:pt-20">
	<section class="lg:sticky lg:top-28 lg:self-start">
		<span class="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-ink-2">Early access{data.total > 0 ? ` · ${data.total}` : ''}</span>
		<h1 class="display mt-7 text-4xl sm:text-[56px]">{t.title}</h1>
		<p class="mt-6 max-w-lg text-lg leading-relaxed text-ink-2">{t.sub}</p>
		<ul class="mt-8 flex flex-col gap-3">
			{#each t.perks as p}<li class="flex items-center gap-3 text-[15px]"><span class="grid size-6 place-items-center rounded-full bg-ink text-xs text-white">✓</span>{p}</li>{/each}
		</ul>
		<div class="mt-10 max-w-md">
			<div class="h-2 overflow-hidden rounded-full bg-tile"><div class="h-full rounded-full bg-ink transition-all duration-700" style="width:{Math.min(100, ((me?.total ?? data.total) / PRICE.openAt) * 100)}%"></div></div>
			<p class="mt-2 text-sm text-ink-2">{fill(t.progress, { n: Math.min(me?.total ?? data.total, PRICE.openAt), max: PRICE.openAt })}</p>
		</div>
		{#if data.inviter && !me}<p class="mt-8 text-sm text-ink-2">{data.inviter} invited you.</p>{/if}
	</section>

	<section class="card p-6 sm:p-9">
		{#if me}
			<div class="flex flex-col gap-6">
				<h2 class="text-3xl font-medium tracking-tight">{t.doneTitle}</h2>
				{#if form?.confirmSent}<p class="rounded-2xl bg-ink px-4 py-3 text-[15px] text-white">{t.beta}</p>{/if}
				<div>
					<p class="tag">{t.place}</p>
					<p class="big mt-1 text-7xl">#{me.place}</p>
					<p class="mt-1 text-sm text-muted">{t.of} {me.total}{me.friends ? ` · ${me.friends} ${t.friends}` : ''}</p>
				</div>
				<p class="rounded-2xl px-4 py-3 text-sm {me.place <= PRICE.freeSeats + PRICE.founderSeats ? 'bg-good-bg text-good' : 'bg-tile text-ink-2'}">{me.place <= PRICE.freeSeats + PRICE.founderSeats ? t.founder : t.regular}</p>
				<p class="text-[15px] text-ink-2">{t.moveUp}</p>
				<div class="flex flex-col gap-2 sm:flex-row">
					<input class="input flex-1 text-sm" readonly value={link} onfocus={(e) => e.currentTarget.select()} />
					<button class="btn btn-primary shrink-0" onclick={copy}>{copied ? t.copied : t.copy}</button>
				</div>
				<div class="flex flex-wrap gap-2 text-sm">
					<a class="btn btn-ghost" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text={shareText}&url={encodeURIComponent(link)}">X</a>
					<a class="btn btn-ghost" target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url={encodeURIComponent(link)}">LinkedIn</a>
					<a class="btn btn-ghost" target="_blank" rel="noopener" href="https://wa.me/?text={shareText}%20{encodeURIComponent(link)}">WhatsApp</a>
				</div>
				<a href="/app/analyses" class="text-sm underline">{t.tryNow} →</a>
			</div>
		{:else}
			<ol class="flex gap-2" aria-label="Progress">
				{#each t.steps as s, i}
					<li class="flex-1">
						<span class="block h-1 rounded-full transition-colors duration-500 {i <= step ? 'bg-ink' : 'bg-line'}"></span>
						<span class="mt-2 hidden text-xs sm:block {i === step ? 'text-ink' : 'text-muted'}">{s}</span>
					</li>
				{/each}
			</ol>

			<form method="POST" class="mt-8" use:enhance={() => { busy = true; return async ({ update }) => { await update({ reset: false }); busy = false; }; }}>
				<input type="hidden" name="ref" value={data.ref} />

				<fieldset bind:this={sets[0]} class="flex flex-col gap-5" class:hidden={step !== 0}>
					<label class="block"><span class="label">{t.email}</span><input class="input mt-1.5" type="email" name="email" autocomplete="email" value={data.email} required={step === 0} /></label>
					<label class="block"><span class="label">{t.name}</span><input class="input mt-1.5" name="name" autocomplete="given-name" /></label>
					<div>
						<p class="label">{t.role}</p>
						<div class="mt-2 flex flex-wrap gap-2">{#each t.roles as [k, l]}{@render chip('radio', 'role', k, l, step === 0)}{/each}</div>
					</div>
				</fieldset>

				<fieldset bind:this={sets[1]} class="flex flex-col gap-5" class:hidden={step !== 1}>
					<label class="block"><span class="label">{t.building}</span><input class="input mt-1.5" name="building" placeholder={t.buildingPh} /></label>
					<div>
						<p class="label">{t.stage}</p>
						<div class="mt-2 flex flex-wrap gap-2">{#each t.stages as [k, l]}{@render chip('radio', 'stage', k, l, step === 1)}{/each}</div>
					</div>
					<div>
						<p class="label">{t.type}</p>
						<div class="mt-2 flex flex-wrap gap-2">{#each t.types as [k, l]}{@render chip('radio', 'type', k, l)}{/each}</div>
					</div>
				</fieldset>

				<fieldset bind:this={sets[2]} class="flex flex-col gap-5" class:hidden={step !== 2}>
					<div>
						<p class="label">{t.today}</p>
						<div class="mt-2 flex flex-wrap gap-2">{#each t.todays as [k, l]}{@render chip('checkbox', 'today', k, l)}{/each}</div>
					</div>
					<label class="block"><span class="label">{t.todayOther}</span><input class="input mt-1.5" name="todayOther" /></label>
					<label class="block"><span class="label">{t.paid}</span><input class="input mt-1.5" name="paid" placeholder={t.paidPh} /></label>
					<label class="block"><span class="label">{t.pain}</span><textarea class="input mt-1.5 min-h-24" name="pain" placeholder={t.painPh}></textarea></label>
				</fieldset>

				<fieldset bind:this={sets[3]} class="flex flex-col gap-5" class:hidden={step !== 3}>
					<div>
						<p class="label">{t.jobs} <span class="text-muted">· {t.jobsHint}</span></p>
						<div class="mt-2 flex flex-wrap gap-2">{#each t.jobList as [k, l]}{@render chip('checkbox', 'jobs', k, l)}{/each}</div>
					</div>
					<div>
						<p class="label">{t.sources}</p>
						<div class="mt-2 flex flex-wrap gap-2">{#each t.sourceList as [k, l]}{@render chip('checkbox', 'sources', k, l)}{/each}</div>
					</div>
					<label class="block"><span class="label">{t.feature}</span><textarea class="input mt-1.5 min-h-20" name="feature" placeholder={t.featurePh}></textarea></label>
					<div>
						<p class="label">{t.pay}</p>
						<div class="mt-2 flex flex-wrap gap-2">{#each t.pays as [k, l]}{@render chip('radio', 'pay', k, l, step === 3)}{/each}</div>
					</div>
					<label class="block"><span class="label">{t.price}</span><input class="input mt-1.5" name="price" placeholder={t.pricePh} /></label>
					<label class="block"><span class="label">{t.other}</span><input class="input mt-1.5" name="other" placeholder={t.otherPh} /></label>
				</fieldset>

				{#if form?.error}<p class="mt-5 rounded-2xl bg-bad-bg px-4 py-3 text-sm text-bad">{form.error}</p>{/if}

				<div class="mt-8 flex items-center justify-between gap-3">
					{#if step > 0}<button type="button" class="btn btn-ghost" onclick={() => (step -= 1)}>{t.back}</button>{:else}<span></span>{/if}
					{#if step < 3}
						<button type="button" class="btn btn-primary px-6" onclick={next}>{t.next}</button>
					{:else}
						<button class="btn btn-primary px-6" disabled={busy}>{busy ? t.sending : t.send}</button>
					{/if}
				</div>
				<p class="mt-6 text-xs text-muted">{t.privacy}</p>
			</form>
		{/if}
	</section>
</main>
