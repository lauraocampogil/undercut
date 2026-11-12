<script lang="ts">
	// One button for any problem: "Fix" when Undercut can do it, otherwise "How to fix" (steps + code for the developer).
	import { invalidateAll } from '$app/navigation';
	import { canAutoFix } from '#lib/fixable.ts';
	let {
		clientId,
		issueId,
		problem,
		detail = '',
		dark = false,
		size = 'md'
	}: { clientId: string; issueId?: string; problem: string; detail?: string; dark?: boolean; size?: 'sm' | 'md' } = $props();

	const auto = $derived(canAutoFix(issueId));
	let phase = $state<'idle' | 'busy' | 'done'>('idle');
	let published = $state(0);
	let open = $state(false);
	let how = $state<{ steps: string[]; code?: string; ai: boolean } | null>(null);
	let copied = $state(false);

	async function go() {
		phase = 'busy';
		const res = await fetch('/api/fix', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(auto ? { clientId, action: 'issue', issueId } : { clientId, action: 'howto', problem, detail })
		});
		const j = await res.json().catch(() => ({}));
		if (auto) {
			published = j.published ?? 0;
			phase = 'done';
			await invalidateAll();
		} else {
			how = j.howto ?? null;
			phase = 'idle';
			open = true;
		}
	}
	function copyAll() {
		if (!how) return;
		navigator.clipboard?.writeText(`${problem}\n\n${how.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}${how.code ? `\n\n${how.code}` : ''}`);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
	function askAi() {
		open = false;
		window.dispatchEvent(new CustomEvent('undercut:ask', { detail: { q: `How do I fix "${problem}"? ${detail}`.trim() } }));
	}
	const cls = $derived(size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm');
</script>

{#if phase === 'done'}
	<span class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent font-medium text-accent-ink {cls}">✓ Live{published > 1 ? ` · ${published}` : ''}</span>
{:else if auto}
	<button class="btn btn-accent shrink-0 {cls}" onclick={go} disabled={phase === 'busy'}>
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m13 2-9 12h8l-1 8 9-12h-8z" /></svg>
		{phase === 'busy' ? 'Fixing…' : 'Fix'}
	</button>
{:else}
	<button class="btn shrink-0 {dark ? 'border border-white/25 text-white hover:bg-white hover:text-ink' : 'btn-ghost'} {cls}" onclick={go} disabled={phase === 'busy'}>
		{phase === 'busy' ? 'Thinking…' : 'How to fix'}
	</button>
{/if}

{#if open && how}
	<div class="fixed inset-0 z-50 grid place-items-end bg-black/40 p-3 sm:place-items-center" role="presentation" onclick={(e) => e.target === e.currentTarget && (open = false)}>
		<div class="w-full max-w-lg rounded-[28px] bg-white p-6 text-ink shadow-2xl" role="dialog" aria-modal="true" aria-label="How to fix">
			<div class="flex items-start justify-between gap-3">
				<div>
					<p class="label">{how.ai ? 'Written by Undercut AI' : 'How to fix'}</p>
					<h3 class="display mt-1 text-[30px] leading-tight">{problem}</h3>
				</div>
				<button class="icon-btn shrink-0" onclick={() => (open = false)} aria-label="Close">✕</button>
			</div>
			<ol class="mt-5 space-y-2.5">
				{#each how.steps as s, i (i)}
					<li class="flex gap-3 text-sm"><span class="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-xs text-white">{i + 1}</span><span class="pt-0.5">{s}</span></li>
				{/each}
			</ol>
			{#if how.code}<pre class="mt-4 max-h-48 overflow-auto rounded-[16px] bg-ink p-4 text-xs text-accent">{how.code}</pre>{/if}
			<div class="mt-5 flex flex-wrap gap-2">
				<button class="btn btn-primary" onclick={copyAll}>{copied ? 'Copied ✓' : 'Copy for the developer'}</button>
				<button class="btn btn-ghost" onclick={askAi}>Ask the AI</button>
			</div>
		</div>
	</div>
{/if}
