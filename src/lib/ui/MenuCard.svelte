<script lang="ts">
	import Icon, { type IconName } from './Icon.svelte';

	let {
		icon,
		title,
		subtitle,
		badge = null,
		badgeLabel = null,
		href
	}: {
		icon: IconName;
		title: string;
		subtitle: string;
		badge?: string | null;
		badgeLabel?: string | null;
		href: string;
	} = $props();
</script>

<a class="card menu" {href}>
	<span class="disc"><Icon name={icon} /></span>
	<span class="text">
		<span class="t">{title}</span>
		<span class="s">{subtitle}</span>
	</span>
	{#if badge !== null}
		<span class="badge">
			<span class="b">{badge}</span>
			{#if badgeLabel !== null}<span class="bl">{badgeLabel}</span>{/if}
		</span>
	{/if}
</a>

<style>
	.menu {
		display: flex;
		align-items: center;
		gap: 16px;
		min-height: 48px;
		text-decoration: none;
		color: inherit;
	}
	.disc {
		flex: none;
		width: 52px;
		height: 52px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--primary-container);
		color: var(--on-primary-container);
	}
	.text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.t {
		font-size: 1.4rem;
		font-weight: 700;
		line-height: 1.4;
		color: var(--primary);
	}
	.s {
		font-size: 0.9rem;
		color: var(--on-surface-variant);
	}
	.badge {
		flex: none;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.b {
		font-weight: 700;
		color: var(--secondary);
	}
	.bl {
		font-size: 0.75rem;
		color: var(--on-surface-variant);
	}
	@media (max-width: 360px) {
		.badge {
			flex-direction: row;
			gap: 4px;
		}
	}
</style>
