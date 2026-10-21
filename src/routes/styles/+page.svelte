<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getQuran } from '#lib/context.ts';
	import { isEndless, modeByKey } from '#lib/domain/game-mode.ts';
	import { levelId, levelsForStyle, STYLES } from '#lib/domain/levels.ts';
	import { goBack, href } from '#lib/nav.ts';
	import { mastered, runBest } from '#lib/progress/progress.ts';
	import { progress } from '#lib/progress/store.svelte.ts';
	import { strings } from '#lib/settings.svelte.ts';
	import AppTopBar from '#lib/ui/AppTopBar.svelte';
	import MenuCard from '#lib/ui/MenuCard.svelte';

	const quran = getQuran();
	const mode = modeByKey(page.url.searchParams.get('mode') ?? '');
	if (!mode) void goto(href('/'), { replaceState: true });

	const s = $derived(strings());
	const p = $derived(progress.current);

	function badge(style: (typeof STYLES)[number]): { value: string | null; label: string } {
		const levels = levelsForStyle(style, quran);
		if (mode && isEndless(mode)) {
			const best = Math.max(0, ...levels.map((l) => runBest(p, mode.key, levelId(l))));
			return { value: best > 0 ? s.number(best) : null, label: s.best };
		}
		return { value: `${s.number(mastered(p, levels))}/${s.number(levels.length)}`, label: s.mastered };
	}
</script>

<svelte:head><title>{s.gameModeTitle(mode!.key)} · {s.appName}</title></svelte:head>

{#if mode}
	<div class="page">
		<AppTopBar title={s.gameModeTitle(mode.key)} onback={() => goBack(href('/'))} />
		<p class="sub">{s.gameModeSubtitle(mode.key)}</p>
		<h3 class="choose">{s.chooseStyle}</h3>
		{#each STYLES as style (style.key)}
			{@const b = badge(style)}
			<MenuCard
				icon={style.key === 'surah' ? 'quiz' : 'menu_book'}
				title={s.styleTitle(style.key)}
				subtitle={s.styleSubtitle(style.key)}
				badge={b.value}
				badgeLabel={b.label}
				href={href('/levels', { mode: mode.key, style: style.key })}
			/>
		{/each}
	</div>
{/if}

<style>
	.sub {
		font-size: 1.05rem;
	}
	.choose {
		font-size: 1.1rem;
		font-weight: 500;
	}
</style>
