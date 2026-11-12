<script lang="ts">
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import { tick } from 'svelte';

	type Action = { type: string; label: string; href?: string; [k: string]: unknown };
	type M = { role: 'user' | 'assistant'; content: string; actions?: Action[]; done?: Record<number, string> };
	let { clients }: { clients: { id: string; name: string }[] } = $props();

	let open = $state(false);
	let input = $state('');
	let busy = $state(false);
	let threads = $state<Record<string, M[]>>({});
	let list = $state<HTMLDivElement>();
	let field = $state<HTMLTextAreaElement>();

	const clientId = $derived(page.params.id ?? null);
	const client = $derived(clients.find((c) => c.id === clientId) ?? null);
	const key = $derived(clientId ?? '_all');
	const messages = $derived(threads[key] ?? []);
	const suggestions = $derived(
		client
			? ['What should I fix first?', 'Why did leads change?', 'Fix everything you can automatically', `Keywords for "${client.name.split(' ')[0].toLowerCase()} bruxelles"`, 'How do I make the site faster?']
			: ['Which client needs me most?', 'Keywords for "site web restaurant"']
	);

	async function send(text = input) {
		const q = text.trim();
		if (!q || busy) return;
		open = true;
		input = '';
		const next: M[] = [...messages, { role: 'user', content: q }];
		threads[key] = next;
		busy = true;
		await scroll();
		try {
			const res = await fetch('/api/assistant', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ clientId, messages: next.map((m) => ({ role: m.role, content: m.content })) })
			});
			const j = await res.json();
			threads[key] = [...next, { role: 'assistant', content: j.reply || '…', actions: j.actions ?? [] }];
		} catch {
			threads[key] = [...next, { role: 'assistant', content: 'Something went wrong — try again.' }];
		}
		busy = false;
		await scroll();
	}

	async function run(mi: number, ai: number, a: Action) {
		if (a.type === 'open' && a.href) {
			open = false;
			return goto(a.href);
		}
		const m = threads[key][mi];
		m.done = { ...(m.done ?? {}), [ai]: '…' };
		const res = await fetch('/api/assistant/action', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clientId, action: a }) });
		const j = await res.json().catch(() => ({ message: 'Failed' }));
		m.done = { ...(m.done ?? {}), [ai]: j.message ?? 'Done' };
		threads[key] = [...threads[key]];
		await invalidateAll();
	}

	async function scroll() {
		await tick();
		list?.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
	}

	$effect(() => {
		const onAsk = (e: Event) => send((e as CustomEvent).detail?.q ?? '');
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
				e.preventDefault();
				open = !open;
			}
			if (e.key === 'Escape') open = false;
		};
		const onOpen = () => (open = true);
		window.addEventListener('undercut:open', onOpen);
		window.addEventListener('undercut:ask', onAsk);
		window.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('undercut:open', onOpen);
			window.removeEventListener('undercut:ask', onAsk);
			window.removeEventListener('keydown', onKey);
		};
	});
	$effect(() => {
		if (open) tick().then(() => field?.focus());
	});
</script>

{#if !open}
	<button class="group no-print fixed right-4 bottom-4 z-40 grid size-14 place-items-center rounded-full bg-ink text-accent shadow-[0_12px_40px_-12px_rgba(0,0,0,.6)] transition-transform hover:-translate-y-0.5 sm:right-6 sm:bottom-6" onclick={() => (open = true)} aria-label="Ask Undercut AI (⌘J)" title="Ask Undercut AI (⌘J)">
		<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9zM19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9z" /></svg>
		<span class="pointer-events-none absolute right-full mr-3 hidden rounded-full bg-ink px-3 py-1.5 text-xs whitespace-nowrap text-white group-hover:block">Ask Undercut AI · ⌘J</span>
	</button>
{:else}
	<aside class="no-print fixed inset-0 z-50 flex flex-col bg-paper sm:inset-auto sm:top-3 sm:right-3 sm:bottom-3 sm:w-[420px] sm:rounded-[28px] sm:shadow-[0_30px_80px_-20px_rgba(0,0,0,.45)]" aria-label="Undercut AI">
		<header class="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
			<div class="flex items-center gap-2.5">
				<span class="grid size-9 place-items-center rounded-full bg-ink text-accent">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9zM19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9z" /></svg>
				</span>
				<div>
					<p class="font-medium leading-tight">Undercut AI</p>
					<p class="text-xs text-muted">{client ? `Working on ${client.name}` : 'All clients'}</p>
				</div>
			</div>
			<button class="icon-btn" onclick={() => (open = false)} aria-label="Close">✕</button>
		</header>

		<div bind:this={list} class="flex-1 space-y-4 overflow-y-auto px-5 py-5">
			{#if !messages.length}
				<div class="pt-6 text-center">
					<p class="display text-[34px] leading-tight">What do you want<br />to <em>do</em> today?</p>
					<p class="mt-2 text-sm text-muted">Ask about {client ? client.name : 'your clients'} — or tell me what to fix.</p>
				</div>
				<div class="flex flex-col gap-2 pt-2">
					{#each suggestions as s (s)}
						<button class="rounded-[18px] bg-white px-4 py-3 text-left text-sm hover:bg-tile" onclick={() => send(s)}>{s}</button>
					{/each}
				</div>
			{/if}
			{#each messages as m, mi (mi)}
				{#if m.role === 'user'}
					<div class="ml-auto max-w-[85%] rounded-[20px] rounded-br-md bg-ink px-4 py-2.5 text-sm text-white">{m.content}</div>
				{:else}
					<div class="max-w-[92%]">
						<div class="rounded-[20px] rounded-bl-md bg-white px-4 py-3 text-sm whitespace-pre-line">{m.content}</div>
						{#if m.actions?.length}
							<div class="mt-2 flex flex-col gap-1.5">
								{#each m.actions as a, ai (ai)}
									{#if m.done?.[ai]}
										<p class="rounded-full bg-[#E4F5B8] px-4 py-2 text-xs text-accent-ink">{m.done[ai]}</p>
									{:else}
										<button class="flex items-center gap-2 rounded-full px-4 py-2 text-left text-sm font-medium {a.type === 'open' || a.type === 'mark_done' ? 'border border-line bg-white hover:border-ink' : 'bg-accent text-accent-ink hover:bg-[#b8e81f]'}" onclick={() => run(mi, ai, a)}>
											<span>{a.type === 'open' ? '→' : a.type === 'mark_done' ? '✓' : '⚡'}</span>{a.label}
										</button>
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			{/each}
			{#if busy}
				<div class="flex w-16 items-center justify-center gap-1 rounded-[20px] bg-white py-3">
					{#each [0, 1, 2] as d (d)}<span class="size-1.5 animate-bounce rounded-full bg-muted" style="animation-delay:{d * 120}ms"></span>{/each}
				</div>
			{/if}
		</div>

		<form class="border-t border-line p-3" onsubmit={(e) => { e.preventDefault(); send(); }}>
			<div class="flex items-end gap-2 rounded-[22px] bg-white p-2">
				<textarea
					bind:this={field}
					bind:value={input}
					rows="1"
					placeholder={client ? `Ask or tell me what to do for ${client.name}…` : 'Ask anything about your clients…'}
					class="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
					onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
				></textarea>
				<button class="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-white disabled:opacity-40" disabled={!input.trim() || busy} aria-label="Send">→</button>
			</div>
			<p class="mt-1.5 px-2 text-[11px] text-muted">The AI proposes; nothing changes on a site until you click.</p>
		</form>
	</aside>
{/if}
