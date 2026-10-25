<script lang="ts">
	import AppIcon from '../AppIcon.svelte';
	let {
		title,
		body = '',
		when = 'now',
		mood = 'shock',
		class: klass = ''
	}: { title: string; body?: string; when?: string; mood?: 'spy' | 'shock' | 'happy'; class?: string } = $props();
</script>

<div class="flex items-start gap-3.5 rounded-3xl bg-card p-4 shadow-[0_0_0_2px_var(--color-ink),8px_8px_0_var(--color-ink)] {klass}">
	<AppIcon size={44} {mood} />
	<div class="min-w-0 flex-1">
		<div class="flex justify-between gap-2"><strong class="text-[15px]">Undercut</strong><span class="text-[13px] text-muted">{when}</span></div>
		<p class="text-[15px] font-semibold">{title}</p>
		{#if body}<p class="text-sm text-muted">{body}</p>{/if}
	</div>
</div>
