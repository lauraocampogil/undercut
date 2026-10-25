<script lang="ts">
	// Self-hosted fonts: faster, and no call to Google Fonts (GDPR).
	import '@fontsource-variable/bricolage-grotesque/wdth.css';
	import '@fontsource-variable/geist';
	import '../app.css';
	import CookieBanner from '$lib/components/CookieBanner.svelte';
	let { children } = $props();
</script>

{@render children()}
<CookieBanner />
