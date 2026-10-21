<script lang="ts">
	let { message, ondismiss }: { message: string | null; ondismiss: () => void } = $props();

	$effect(() => {
		if (message === null) return;
		const t = setTimeout(ondismiss, 4000);
		return () => clearTimeout(t);
	});
</script>

<div class="slot" role="status">
	{#if message !== null}
		<div class="snack">{message}</div>
	{/if}
</div>

<style>
	.slot {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		z-index: 100;
		display: flex;
		justify-content: center;
		padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
		pointer-events: none;
	}
	.snack {
		max-width: 560px;
		padding: 12px 16px;
		border-radius: 8px;
		background: var(--on-surface);
		color: var(--surface);
		box-shadow: var(--shadow);
		pointer-events: auto;
	}
</style>
