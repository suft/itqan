<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getQuran } from '#lib/context.ts';
	import { ayahMarker } from '#lib/domain/arabic-text.ts';
	import { AYAH_COUNT } from '#lib/domain/quran.ts';
	import { goBack, href } from '#lib/nav.ts';
	import { settings, strings } from '#lib/settings.svelte.ts';
	import { FONTS, FRAMES, renderCard } from '#lib/share/card.ts';
	import AppTopBar from '#lib/ui/AppTopBar.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import Snackbar from '#lib/ui/Snackbar.svelte';

	const quran = getQuran();

	function parseIndex(raw: string | null): number | null {
		return raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;
	}

	/** `from`/`to`: integers with 0 <= from <= to < ayahCount, inside one surah. */
	const range = $derived.by(() => {
		const first = parseIndex(page.url.searchParams.get('from'));
		const last = parseIndex(page.url.searchParams.get('to'));
		if (first === null || last === null || first > last || last >= AYAH_COUNT) return null;
		if (quran.surahOf(first) !== quran.surahOf(last)) return null;
		return { first, last };
	});

	$effect(() => {
		if (range === null) void goto(href('/'), { replaceState: true });
	});

	const body = $derived.by(() => {
		if (range === null) return '';
		const parts: string[] = [];
		for (let a = range.first; a <= range.last; a++) {
			parts.push(`${quran.text(a)} ${ayahMarker(quran.ayahNumberInSurah(a))}`);
		}
		return parts.join(' ');
	});
	const reference = $derived(range === null ? '' : quran.reference(range, settings.language));

	// Not persisted, as on Android.
	let frameIndex = $state(0);
	let fontIndex = $state(0);
	let sharing = $state(false);
	let snack: string | null = $state(null);
	let canvas: HTMLCanvasElement | undefined = $state();

	let renderId = 0;
	let pending: Promise<void> = Promise.resolve();

	// Re-render on any change; only the latest render may touch the canvas.
	$effect(() => {
		const el = canvas;
		if (!el || range === null) return;
		const frame = FRAMES[frameIndex];
		const font = FONTS[fontIndex];
		const text = body;
		const ref = reference;
		const id = ++renderId;
		pending = renderCard(el, { frame, font, body: text, reference: ref, isStale: () => id !== renderId }).catch(
			(e) => {
				if (id !== renderId) return;
				console.error('itqan: share card render failed', e);
				snack = strings().shareFailed;
			}
		);
	});

	function download(blob: Blob, name: string) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = name;
		document.body.append(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 10_000);
	}

	async function shareImage() {
		if (sharing || !canvas) return;
		sharing = true;
		try {
			const el = canvas;
			await pending;
			const blob = await new Promise<Blob>((resolve, reject) =>
				el.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
			);
			const name = `itqan-${Date.now()}.png`;
			const file = new File([blob], name, { type: 'image/png' });
			if (navigator.canShare?.({ files: [file] })) {
				await navigator.share({ files: [file], text: reference });
			} else {
				download(blob, name);
			}
		} catch (e) {
			if (!(e instanceof DOMException && e.name === 'AbortError')) {
				console.error('itqan: could not share the image', e);
				snack = strings().shareFailed;
			}
		} finally {
			sharing = false;
		}
	}
</script>

{#if range !== null}
	<main class="page">
		<AppTopBar title={strings().shareAyah} onback={() => goBack(href('/'))} />

		<div class="preview">
			<canvas bind:this={canvas} aria-label={reference}></canvas>
		</div>

		<h3 class="label">{strings().frame}</h3>
		<div class="frames" role="radiogroup" aria-label={strings().frame}>
			{#each FRAMES as frame, i (frame.src)}
				<button
					class="frame"
					class:selected={i === frameIndex}
					role="radio"
					aria-checked={i === frameIndex}
					aria-label={strings().frameNumber(i + 1)}
					onclick={() => (frameIndex = i)}
				>
					<img src={frame.src} alt="" />
				</button>
			{/each}
		</div>

		<h3 class="label">{strings().font}</h3>
		<div class="fonts" role="radiogroup" aria-label={strings().font}>
			{#each FONTS as font, i (font.family)}
				<button
					class="chip"
					class:selected={i === fontIndex}
					role="radio"
					aria-checked={i === fontIndex}
					onclick={() => (fontIndex = i)}
				>
					{strings()[font.label]}
				</button>
			{/each}
		</div>
	</main>

	<div class="bottom">
		<button class="btn" onclick={shareImage} disabled={sharing}>
			<Icon name="share" />
			{strings().shareImage}
		</button>
	</div>

	<div class="lift">
		<Snackbar message={snack} ondismiss={() => (snack = null)} />
	</div>
{/if}

<style>
	.page {
		/* Room for the pinned bottom bar. */
		padding-block-end: calc(80px + env(safe-area-inset-bottom));
	}
	.preview {
		display: flex;
		justify-content: center;
		margin-block-start: 4px;
	}
	canvas {
		display: block;
		width: 100%;
		max-width: 420px;
		height: auto;
		background: #fff;
	}
	.label {
		font-size: 1.1rem;
		font-weight: 700;
		margin-block-start: 4px;
	}
	.frames {
		display: flex;
		gap: 8px;
	}
	.frame {
		flex: 1;
		min-width: 0;
		aspect-ratio: 0.75;
		padding: 0;
		overflow: hidden;
		border: 1px solid var(--outline-variant);
		border-radius: 8px;
		background: transparent;
	}
	.frame.selected {
		border: 3px solid var(--primary);
	}
	.frame img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.fonts {
		display: flex;
		gap: 8px;
	}
	.chip {
		min-height: 48px;
		padding: 0 16px;
		border: 1px solid var(--outline);
		border-radius: 8px;
		background: transparent;
		color: inherit;
	}
	.chip.selected {
		background: var(--secondary-container);
		color: var(--on-secondary-container);
		border-color: transparent;
		font-weight: 700;
	}
	.bottom {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		z-index: 10;
		display: flex;
		justify-content: center;
		padding: 8px max(16px, env(safe-area-inset-right)) calc(8px + env(safe-area-inset-bottom))
			max(16px, env(safe-area-inset-left));
		background: color-mix(in srgb, var(--background) 92%, transparent);
	}
	.bottom .btn {
		width: 100%;
		max-width: 560px;
	}
	/* Keep the snackbar above the pinned bar. */
	.lift :global(div.slot) {
		bottom: calc(64px + env(safe-area-inset-bottom));
	}
</style>
