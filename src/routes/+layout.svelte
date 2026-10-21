<script lang="ts">
	import '../app.css';
	import { onMount, type Snippet } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { loadQuran } from '#lib/data/load.ts';
	import type { Quran } from '#lib/domain/quran.ts';
	import { progress } from '#lib/progress/store.svelte.ts';
	import { settings, strings } from '#lib/settings.svelte.ts';
	import { trackNavigation } from '#lib/nav.ts';
	import QuranProvider from '#lib/ui/QuranProvider.svelte';
	import AppTitle from '#lib/ui/AppTitle.svelte';
	import OrnamentDivider from '#lib/ui/OrnamentDivider.svelte';

	let { children }: { children: Snippet } = $props();

	let quran: Quran | null = $state(null);
	let failed = $state(false);

	$effect(() => {
		document.documentElement.lang = settings.language;
		document.documentElement.dir = settings.language === 'en' ? 'ltr' : 'rtl';
	});

	afterNavigate((nav) => trackNavigation(nav.type));

	async function load() {
		failed = false;
		try {
			const [q] = await Promise.all([loadQuran(), progress.load()]);
			quran = q;
		} catch (e) {
			console.error('itqan: load failed', e);
			failed = true;
		}
	}

	onMount(load);
</script>

{#if quran}
	<QuranProvider {quran}>
		{@render children()}
	</QuranProvider>
{:else}
	<main class="page loading">
		<AppTitle />
		<p class="tagline">{strings().tagline}</p>
		<OrnamentDivider />
		{#if failed}
			<p class="msg">{strings().loadFailed}</p>
			<button class="btn" onclick={load}>{strings().retry}</button>
		{:else}
			<div class="spinner" role="status" aria-label={strings().loadingQuran}></div>
			<p class="msg">{strings().loadingQuran}</p>
		{/if}
	</main>
{/if}

<style>
	.loading {
		align-items: center;
		justify-content: center;
		text-align: center;
		gap: 16px;
	}
	.tagline {
		color: var(--on-surface-variant);
	}
	.msg {
		color: var(--on-surface-variant);
	}
</style>
