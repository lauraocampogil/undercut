<!-- Unix Studio logo (white horizontal version, from UnixStudio/Brand Identity/Logo). -->
<script lang="ts">
	let { height = 28, class: klass = '' }: { height?: number; class?: string } = $props();
</script>

<img
	src="/brand/unix-studio-white.svg"
	alt="Unix Studio"
	{height}
	width={Math.round((height * 1348) / 529)}
	class="unix-logo inline-block {klass}"
	style="height:{height}px;width:auto"
/>

<style>
	.unix-logo {
		transition: transform 0.4s cubic-bezier(0.3, 1.6, 0.5, 1);
	}
	:global(a:hover) > .unix-logo {
		transform: rotate(-4deg) scale(1.08);
	}
</style>
