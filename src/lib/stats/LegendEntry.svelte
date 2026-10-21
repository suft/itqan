<script lang="ts">
	let { color, label, outlined = false }: { color: string; label: string; outlined?: boolean } =
		$props();
</script>

<span class="entry">
	<span class="swatch" class:outlined style:background={color}></span>
	<span class="label">{label}</span>
</span>

<style>
	.entry {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.swatch {
		width: 12px;
		height: 12px;
		border-radius: 6px;
		flex: none;
	}
	.outlined {
		border: 1px solid var(--outline-variant);
	}
	.label {
		font-size: 0.75rem;
	}
</style>
