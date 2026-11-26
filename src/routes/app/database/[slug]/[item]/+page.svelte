<script lang="ts">
	import ItemDetail from '#lib/components/ItemDetail.svelte';
	import { appT } from '#lib/app-i18n.ts';
	let { data, form } = $props();
	const t = $derived(appT(data.lang));
</script>

<svelte:head><title>{data.item.label} · {data.app.name} · Undercut</title></svelte:head>

<ItemDetail {data} {form} {t} back="/app/database/{data.slug}" backLabel="← {t.product.wantsFrom} {data.app.name}" />
