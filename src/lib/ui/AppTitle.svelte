<script lang="ts">
	import { strings } from '#lib/settings.svelte.ts';
</script>

<h1 class="title">{strings().appName}</h1>

<style>
	.title {
		font-family: 'Rakkas', serif;
		font-weight: 400;
		font-size: 52px;
		line-height: 1.2;
		color: var(--primary);
		text-align: center;
	}
</style>
