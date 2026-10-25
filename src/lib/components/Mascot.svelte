<!--
  The Undercut mascot: a price tag that peeks over edges.
  Its body ends flat at y=200 of the 240×210 viewBox and the hands hang below,
  so a negative bottom margin of ~4% of its width makes it "grip" an edge.

  animated: breathing body, blinking, pupils that follow the pointer.
-->
<script lang="ts">
	import { onMount } from 'svelte';

	type Mood = 'spy' | 'shock' | 'happy';
	let {
		mood = 'spy',
		color = 'tangerine',
		size = 240,
		hole = '#FFF1D6',
		label,
		animated = false,
		class: klass = ''
	}: {
		mood?: Mood;
		color?: 'tangerine' | 'ink';
		size?: number;
		hole?: string;
		label?: string;
		animated?: boolean;
		class?: string;
	} = $props();

	const uid = $props.id();
	const ink = $derived(color === 'ink');
	const body = $derived(ink ? '#111111' : '#FF6A3D');
	const face = $derived(ink ? '#FFF1D6' : '#111111');
	const cheek = $derived(ink ? '#FF6A3D' : '#FFB59E');

	let svg: SVGSVGElement | undefined = $state();
	let look = $state({ x: 0, y: 0 });

	onMount(() => {
		if (!animated || mood === 'happy') return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		let frame = 0;
		const onMove = (e: PointerEvent) => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				if (!svg) return;
				const r = svg.getBoundingClientRect();
				const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
				const dy = (e.clientY - (r.top + r.height * 0.6)) / window.innerHeight;
				look = { x: Math.max(-1, Math.min(1, dx * 2.2)), y: Math.max(-1, Math.min(1, dy * 2.2)) };
			});
		};
		window.addEventListener('pointermove', onMove, { passive: true });
		return () => window.removeEventListener('pointermove', onMove);
	});

	// Spy pupils rest at the right of the eye; shock pupils rest in the centre.
	const pupil = $derived(
		mood === 'spy' ? `translate(${-4 + look.x * 8} ${look.y * 4})` : `translate(${look.x * 7} ${look.y * 6})`
	);
</script>

<svg
	bind:this={svg}
	width={size}
	height={Math.round((size * 210) / 240)}
	viewBox="0 0 240 210"
	class="mascot block shrink-0 overflow-visible {animated ? 'is-animated' : ''} {klass}"
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
>
	<defs>
		<clipPath id="{uid}-l"><path d="M66 140 A24 24 0 0 1 114 140 Z" /></clipPath>
		<clipPath id="{uid}-r"><path d="M126 140 A24 24 0 0 1 174 140 Z" /></clipPath>
		<clipPath id="{uid}-lc"><circle cx="90" cy="130" r="22" /></clipPath>
		<clipPath id="{uid}-rc"><circle cx="150" cy="130" r="22" /></clipPath>
	</defs>

	<g class="m-body">
		<path class="m-string" d="M120 58 C 120 30, 150 12, 182 20" fill="none" stroke="#111111" stroke-width="5" stroke-linecap="round" />
		<path d="M44 200 V98 L120 36 L196 98 V200 Z" fill={body} stroke={body} stroke-width="20" stroke-linejoin="round" />
		<circle cx="120" cy="72" r="11" fill={hole} stroke="#111111" stroke-width="4" />
		<g class="m-eyes">
			{#if mood === 'spy'}
				<path d="M66 140 A24 24 0 0 1 114 140 Z" fill="#FFFFFF" />
				<path d="M126 140 A24 24 0 0 1 174 140 Z" fill="#FFFFFF" />
				<g clip-path="url(#{uid}-l)"><g class="m-pupil" transform={pupil}><circle cx="104" cy="142" r="15" fill="#111111" /><circle cx="109" cy="133" r="3" fill="#FFFFFF" /></g></g>
				<g clip-path="url(#{uid}-r)"><g class="m-pupil" transform={pupil}><circle cx="164" cy="142" r="15" fill="#111111" /><circle cx="169" cy="133" r="3" fill="#FFFFFF" /></g></g>
			{:else if mood === 'shock'}
				<circle cx="90" cy="130" r="22" fill="#FFFFFF" />
				<circle cx="150" cy="130" r="22" fill="#FFFFFF" />
				<g clip-path="url(#{uid}-lc)"><g class="m-pupil" transform={pupil}><circle cx="90" cy="132" r="10" fill="#111111" /><circle cx="94" cy="127" r="3" fill="#FFFFFF" /></g></g>
				<g clip-path="url(#{uid}-rc)"><g class="m-pupil" transform={pupil}><circle cx="150" cy="132" r="10" fill="#111111" /><circle cx="154" cy="127" r="3" fill="#FFFFFF" /></g></g>
			{:else}
				<path d="M70 138 Q90 120 110 138" fill="none" stroke={face} stroke-width="7" stroke-linecap="round" />
				<path d="M130 138 Q150 120 170 138" fill="none" stroke={face} stroke-width="7" stroke-linecap="round" />
			{/if}
		</g>
		{#if mood === 'spy'}
			<path d="M110 162 Q120 170 130 162" fill="none" stroke={face} stroke-width="5" stroke-linecap="round" />
		{:else if mood === 'shock'}
			<ellipse class="m-mouth" cx="120" cy="170" rx="7" ry="9" fill={face} />
		{:else}
			<path d="M108 160 Q120 172 132 160" fill="none" stroke={face} stroke-width="5" stroke-linecap="round" />
		{/if}
		<ellipse cx="66" cy="160" rx="11" ry="6.5" fill={cheek} />
		<ellipse cx="174" cy="160" rx="11" ry="6.5" fill={cheek} />
	</g>
	<rect x="38" y="188" width="38" height="22" rx="11" fill={body} stroke={ink ? '#FFF1D6' : '#111111'} stroke-width="4" />
	<rect x="164" y="188" width="38" height="22" rx="11" fill={body} stroke={ink ? '#FFF1D6' : '#111111'} stroke-width="4" />
</svg>

<style>
	.m-pupil {
		transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	@media (prefers-reduced-motion: no-preference) {
		.is-animated .m-body {
			transform-origin: 120px 200px;
			animation: m-breathe 3.2s ease-in-out infinite;
		}
		.is-animated .m-eyes {
			transform-origin: 120px 132px;
			animation: m-blink 4.6s infinite;
		}
		.is-animated .m-string {
			transform-origin: 120px 58px;
			animation: m-swing 2.6s ease-in-out infinite;
		}
		.is-animated .m-mouth {
			transform-origin: 120px 170px;
			animation: m-gasp 1.8s ease-in-out infinite;
		}
		.is-animated:hover .m-body {
			animation: m-hop 0.5s cubic-bezier(0.3, 1.6, 0.5, 1);
		}
	}
	@keyframes m-breathe {
		0%, 100% { transform: translateY(0) scaleY(1); }
		50% { transform: translateY(-5px) scaleY(1.02); }
	}
	@keyframes m-blink {
		0%, 90%, 100% { transform: scaleY(1); }
		93% { transform: scaleY(0.08); }
		96% { transform: scaleY(1); }
	}
	@keyframes m-swing {
		0%, 100% { transform: rotate(-6deg); }
		50% { transform: rotate(8deg); }
	}
	@keyframes m-gasp {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.25, 1.15); }
	}
	@keyframes m-hop {
		0% { transform: translateY(0); }
		40% { transform: translateY(-18px) rotate(-3deg); }
		100% { transform: translateY(0); }
	}
</style>
