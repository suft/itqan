<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import type { Quran } from '#lib/domain/quran.ts';

	// setContext must run during component init, so the root layout mounts this once the text is loaded.
	let { quran, children }: { quran: Quran; children: Snippet } = $props();
	// svelte-ignore state_referenced_locally
	setContext('quran', quran);
</script>

{@render children()}
