<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open = true,
		oncancel,
		fullscreen = false,
		children
	}: { open?: boolean; oncancel: () => void; fullscreen?: boolean; children: Snippet } = $props();

	let dialog: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});
</script>

<dialog
	bind:this={dialog}
	class:fullscreen
	oncancel={(e) => {
		e.preventDefault();
		oncancel();
	}}
>
	{@render children()}
</dialog>

<style>
	dialog {
		width: calc(100% - 32px);
		max-width: 480px;
		max-height: calc(100dvh - 32px);
		overflow-y: auto;
		padding: 24px;
		border: none;
		border-radius: 24px;
		background: var(--surface-high);
		color: var(--on-surface);
		box-shadow: 0 8px 32px rgb(0 0 0 / 0.35);
	}
	dialog::backdrop {
		background: rgb(0 0 0 / 0.5);
	}
	dialog.fullscreen {
		width: 100%;
		max-width: none;
		height: 100dvh;
		max-height: none;
		border-radius: 0;
		background: var(--background);
		padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
			max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
	}
</style>
