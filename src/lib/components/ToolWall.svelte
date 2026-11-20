<script lang="ts">
	// "Plugs into your tools": a wall of real logos around the Undercut tile.
	// Tiles light up in a ripple from the centre when scrolled into view; a diagonal sheen (the logo's cut angle) sweeps across.
	import { siGoogleanalytics, siGooglesearchconsole, siGoogle, siGoogletagmanager, siStripe, siAppstore, siGoogleplay, siWhatsapp, siGmail, siGooglecalendar, siInstagram, siMeta, siNotion, siClaude } from 'simple-icons';
	import { inview } from '#lib/motion.ts';
	import Logo from '#lib/components/Logo.svelte';
	type T = { n: string; i: { path: string; hex: string }; soon?: boolean };
	const left: T[] = [
		{ n: 'Google Analytics', i: siGoogleanalytics },
		{ n: 'Search Console', i: siGooglesearchconsole },
		{ n: 'Business Profile', i: siGoogle },
		{ n: 'Tag Manager', i: siGoogletagmanager },
		{ n: 'Stripe', i: siStripe },
		{ n: 'App Store', i: siAppstore },
		{ n: 'Google Play', i: siGoogleplay }
	];
	const right: T[] = [
		{ n: 'WhatsApp', i: siWhatsapp },
		{ n: 'Gmail', i: siGmail, soon: true },
		{ n: 'Google Calendar', i: siGooglecalendar, soon: true },
		{ n: 'Instagram', i: siInstagram, soon: true },
		{ n: 'Meta Ads', i: siMeta, soon: true },
		{ n: 'Notion', i: siNotion, soon: true },
		{ n: 'Claude', i: siClaude, soon: true }
	];
</script>

{#snippet tile(t: T, d: number)}
	<li class="tool group/t flex flex-col items-center gap-2.5" style="--dd:{d}">
		<span class="card relative grid size-[68px] place-items-center rounded-[20px]! transition-transform duration-300 group-hover/t:-translate-y-1 sm:size-[76px] {t.soon ? 'opacity-60 grayscale group-hover/t:opacity-100 group-hover/t:grayscale-0' : ''}">
			<svg viewBox="0 0 24 24" class="size-8" fill="#{t.i.hex}" aria-hidden="true"><path d={t.i.path} /></svg>
			{#if t.soon}<span class="absolute -top-2 -right-2 rounded-full bg-ink px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-white uppercase">Soon</span>{/if}
		</span>
		<span class="text-center text-[12px] leading-tight text-ink-2">{t.n}</span>
	</li>
{/snippet}

<div class="wall relative" use:inview>
	<div class="grid items-center gap-8 lg:grid-cols-[1fr_auto_1fr] lg:gap-12">
		<ul class="grid grid-cols-4 gap-x-4 gap-y-7 sm:grid-cols-7 lg:grid-cols-4">
			{#each left as t, i (t.n)}{@render tile(t, left.length - i)}{/each}
		</ul>
		<div class="hub relative mx-auto grid size-[132px] place-items-center rounded-[34px] bg-ink text-white shadow-[0_30px_60px_-24px_rgba(0,0,0,.55)] sm:size-[150px]">
			<span class="ring absolute inset-0 rounded-[34px]"></span>
			<span class="ring r2 absolute inset-0 rounded-[34px]"></span>
			<Logo size={64} wordmark={false} light />
		</div>
		<ul class="grid grid-cols-4 gap-x-4 gap-y-7 sm:grid-cols-7 lg:grid-cols-4">
			{#each right as t, i (t.n)}{@render tile(t, i + 1)}{/each}
		</ul>
	</div>
	<span class="sheen pointer-events-none absolute inset-0" aria-hidden="true"></span>
</div>

<style>
	:global(.js) .wall .tool {
		opacity: 0;
		transform: translateY(14px) scale(0.92);
		transition:
			opacity 0.6s cubic-bezier(0.2, 0.75, 0.15, 1),
			transform 0.7s cubic-bezier(0.2, 0.75, 0.15, 1);
		transition-delay: calc(var(--dd) * 70ms + 200ms);
	}
	:global(.js) .wall:global(.in) .tool {
		opacity: 1;
		transform: none;
	}
	.ring {
		box-shadow: 0 0 0 1px rgb(13 13 13 / 0.18);
		animation: ring 3.2s cubic-bezier(0.2, 0.75, 0.15, 1) infinite;
	}
	.r2 {
		animation-delay: 1.6s;
	}
	@keyframes ring {
		from {
			transform: scale(1);
			opacity: 0.9;
		}
		to {
			transform: scale(1.7);
			opacity: 0;
		}
	}
	/* a light sweep at the logo's cut angle */
	.sheen {
		background: linear-gradient(105deg, transparent 40%, rgb(255 255 255 / 0.55) 50%, transparent 60%) no-repeat;
		background-size: 200% 100%;
		animation: sheen 7s ease-in-out infinite;
		mix-blend-mode: soft-light;
	}
	@keyframes sheen {
		0%,
		60% {
			background-position: 150% 0;
		}
		100% {
			background-position: -50% 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.ring,
		.sheen {
			animation: none;
		}
	}
</style>
