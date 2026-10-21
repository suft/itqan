<script lang="ts">
	import { onMount } from 'svelte';
	import AppTopBar from '#lib/ui/AppTopBar.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import Modal from '#lib/ui/Modal.svelte';
	import { goBack, href } from '#lib/nav.ts';
	import { strings } from '#lib/settings.svelte.ts';
	import { progress } from '#lib/progress/store.svelte.ts';
	import {
		afterStatisticsReset,
		localEpochDay,
		msUntilNextLocalDay
	} from '#lib/progress/progress.ts';
	import OverviewTab from '#lib/stats/OverviewTab.svelte';
	import SurahsTab from '#lib/stats/SurahsTab.svelte';
	import ActivityTab from '#lib/stats/ActivityTab.svelte';

	const s = $derived(strings());
	let tab = $state(0);
	let selectedSurah = $state<number | null>(null);
	let confirmReset = $state(false);
	let today = $state(localEpochDay());

	const p = $derived(progress.current);
	const canReset = $derived(JSON.stringify(afterStatisticsReset(p)) !== JSON.stringify(p));
	const tabs = $derived([s.tabOverview, s.tabSurahs, s.tabActivity]);

	// Keep "today" current: at local midnight and whenever the page becomes visible again.
	onMount(() => {
		let timer: ReturnType<typeof setTimeout>;
		const schedule = () => {
			clearTimeout(timer);
			timer = setTimeout(() => {
				today = localEpochDay();
				schedule();
			}, msUntilNextLocalDay() + 1000);
		};
		const onVisible = () => {
			if (document.visibilityState === 'visible') {
				today = localEpochDay();
				schedule();
			}
		};
		schedule();
		document.addEventListener('visibilitychange', onVisible);
		return () => {
			clearTimeout(timer);
			document.removeEventListener('visibilitychange', onVisible);
		};
	});

	function reset() {
		confirmReset = false;
		void progress.resetStatistics();
	}
</script>

<svelte:head><title>{s.statistics} · {s.appName}</title></svelte:head>

<main class="page stats">
	<AppTopBar title={s.statistics} onback={() => goBack(href('/'))}>
		{#snippet actions()}
			{#if canReset}
				<button class="icon-btn" aria-label={s.clearStatistics} onclick={() => (confirmReset = true)}>
					<Icon name="delete_sweep" />
				</button>
			{/if}
		{/snippet}
	</AppTopBar>

	<div class="tabs" role="tablist">
		{#each tabs as label, i (i)}
			<button
				role="tab"
				id="tab-{i}"
				aria-selected={tab === i}
				aria-controls="panel"
				class:active={tab === i}
				onclick={() => (tab = i)}>{label}</button
			>
		{/each}
	</div>

	<div class="panel" role="tabpanel" id="panel" aria-labelledby="tab-{tab}">
		{#if tab === 0}
			<OverviewTab progress={p} />
		{:else if tab === 1}
			<SurahsTab progress={p} selected={selectedSurah} onselect={(i) => (selectedSurah = i)} />
		{:else}
			<ActivityTab progress={p} {today} />
		{/if}
	</div>
</main>

<Modal open={confirmReset} oncancel={() => (confirmReset = false)}>
	<h2 class="dlg-title">{s.clearStatisticsQuestion}</h2>
	<p>{s.clearStatisticsBody}</p>
	<div class="dlg-actions">
		<button class="btn text" onclick={() => (confirmReset = false)}>{s.cancel}</button>
		<button class="btn text" onclick={reset}>{s.clear}</button>
	</div>
</Modal>

<style>
	.tabs {
		display: flex;
		border-bottom: 1px solid var(--outline-variant);
	}
	.tabs button {
		flex: 1;
		min-width: 0;
		min-height: 48px;
		padding: 0 8px;
		border: none;
		border-bottom: 3px solid transparent;
		background: transparent;
		color: var(--on-surface-variant);
		font-weight: 500;
	}
	.tabs button.active {
		color: var(--primary);
		border-bottom-color: var(--primary);
	}
	.panel {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-block: 12px 16px;
	}
	.dlg-title {
		font-size: 1.4rem;
		margin-block-end: 12px;
	}
	.dlg-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-block-start: 16px;
	}

	/* Shared by the tab components, which render inside .panel. */
	.panel :global(h3),
	.panel :global(h4),
	.panel :global(p) {
		margin: 0;
	}
	.panel :global(h3) {
		font-size: 1.25rem;
	}
	.panel :global(h4) {
		font-size: 1rem;
		font-weight: 500;
	}
	.panel :global(section.card) {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.panel :global(.section) {
		color: var(--primary);
		padding-block-start: 8px;
	}
	.panel :global(.muted) {
		color: var(--on-surface-variant);
	}
	.panel :global(.small) {
		font-size: 0.8125rem;
	}
	.panel :global(.label) {
		font-weight: 500;
	}
	.panel :global(.empty) {
		text-align: center;
		padding: 24px;
	}
	.panel :global(.empty.title) {
		font-size: 1.1rem;
		font-weight: 500;
	}
</style>
