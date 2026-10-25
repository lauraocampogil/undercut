<script lang="ts">
	import '../app.css';
	import CookieBanner from '$lib/components/CookieBanner.svelte';
	let { children } = $props();
</script>

{@render children()}
<CookieBanner />
