<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';
	import { strings } from '#lib/settings.svelte.ts';

	let {
		title,
		onback,
		actions
	}: { title: string; onback?: () => void; actions?: Snippet } = $props();
</script>

<header class="bar">
	<div class="nav">
		{#if onback}
			<button class="icon-btn" onclick={onback} aria-label={strings().back}>
				<Icon name="arrow_back" />
			</button>
		{/if}
	</div>
	<h2 class="title">{title}</h2>
	<div class="actions">{@render actions?.()}</div>
</header>

<style>
	.bar {
		display: flex;
		align-items: center;
		gap: 4px;
		min-height: 56px;
	}
	.nav {
		flex: none;
		min-width: 4px;
	}
	.title {
		flex: 1;
		min-width: 0;
		font-size: 1.4rem;
		font-weight: 700;
		line-height: 1.4;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.actions {
		flex: none;
		display: flex;
		align-items: center;
	}
</style>
