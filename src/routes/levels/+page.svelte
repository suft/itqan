<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getQuran } from '#lib/context.ts';
	import { isEndless, modeByKey } from '#lib/domain/game-mode.ts';
	import { levelId, levelMastery, levelName, levelsForStyle, STYLES } from '#lib/domain/levels.ts';
	import { goBack, href } from '#lib/nav.ts';
	import { best as bestOf, mastered, points, runBest } from '#lib/progress/progress.ts';
	import { progress } from '#lib/progress/store.svelte.ts';
	import { strings } from '#lib/settings.svelte.ts';
	import AppTopBar from '#lib/ui/AppTopBar.svelte';
	import Icon from '#lib/ui/Icon.svelte';

	const quran = getQuran();
	const mode = modeByKey(page.url.searchParams.get('mode') ?? '');
	const style = STYLES.find((x) => x.key === page.url.searchParams.get('style'));
	if (!mode || !style) void goto(href('/'), { replaceState: true });

	const levels = style ? levelsForStyle(style, quran) : [];
	const endless = mode ? isEndless(mode) : false;

	const s = $derived(strings());
	const p = $derived(progress.current);
	const scoreOf = (id: string) => (mode && endless ? runBest(p, mode.key, id) : bestOf(p, id));
	const bestAll = $derived(Math.max(0, ...levels.map((l) => scoreOf(levelId(l)))));
	const total = $derived(points(p, levels));
	const maxPoints = $derived(style ? levels.length * style.questionsPerRound : 0);
</script>

<svelte:head><title>{s.styleTitle(style!.key)} · {s.appName}</title></svelte:head>

{#if mode && style}
	<div class="page">
		<AppTopBar
			title={endless
				? `${s.styleTitle(style.key)} · ${s.gameModeTitle(mode.key)}`
				: s.styleTitle(style.key)}
			onback={() => goBack(href('/styles', { mode: mode.key }))}
		/>

		<div class="summary">
			{#if endless}
				<p class="sm">{s.gameModeSubtitle(mode.key)}</p>
				<p class="big">{s.bestScore(bestAll)}</p>
			{:else}
				<p class="sm">{s.styleSubtitle(style.key)}</p>
				<div class="row">
					<span class="big grow">{s.totalPoints(total)}</span>
					<span class="lbl">{s.masteredCount(mastered(p, levels), levels.length)}</span>
				</div>
				<progress class="bar" max={maxPoints} value={total}></progress>
			{/if}
		</div>

		{#each levels as level (levelId(level))}
			{@const id = levelId(level)}
			{@const best = scoreOf(id)}
			{@const done = !endless && best >= levelMastery(level)}
			<a class="card level" href={href('/quiz', { mode: mode.key, level: id })}>
				<span class="num" class:done>
					{#if done}
						<Icon name="check_circle" />
						<span class="visually-hidden">{s.mastered}</span>
					{:else}
						{s.number(level.index + 1)}
					{/if}
				</span>
				<span class="mid">
					<span class="name">{levelName(level, s.language)}</span>
					{#if !endless}
						<progress class="bar" class:done max={level.questionsPerRound} value={best}></progress>
					{/if}
				</span>
				<span class="score">
					{#if !endless}
						{s.number(best)}/{s.number(level.questionsPerRound)}
					{:else if best > 0}
						{s.number(best)}
					{:else}
						—
					{/if}
				</span>
				<span class="go"><Icon name="play_arrow" /><span class="visually-hidden">{s.start}</span></span>
			</a>
		{/each}
	</div>
{/if}

<style>
	.page {
		gap: 10px;
	}
	.summary {
		background: var(--primary-container);
		color: var(--on-primary-container);
		border-radius: 12px;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.sm {
		font-size: 0.95rem;
	}
	.big {
		font-size: 1.3rem;
		font-weight: 500;
	}
	.row {
		display: flex;
		align-items: flex-end;
		gap: 8px;
	}
	.grow {
		flex: 1;
		min-width: 0;
	}
	.lbl {
		font-size: 0.9rem;
		font-weight: 500;
	}
	.bar {
		appearance: none;
		-webkit-appearance: none;
		width: 100%;
		height: 4px;
		border: none;
		border-radius: 2px;
		overflow: hidden;
		background: var(--surface-variant);
		color: var(--primary);
	}
	.bar::-webkit-progress-bar {
		background: var(--surface-variant);
	}
	.bar::-webkit-progress-value {
		background: var(--primary);
	}
	.bar::-moz-progress-bar {
		background: var(--primary);
	}
	.level .bar::-webkit-progress-value {
		background: var(--secondary);
	}
	.level .bar::-moz-progress-bar {
		background: var(--secondary);
	}
	.level .bar.done::-webkit-progress-value {
		background: var(--correct);
	}
	.level .bar.done::-moz-progress-bar {
		background: var(--correct);
	}
	.level {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 12px 14px;
		min-height: 64px;
		text-decoration: none;
		color: inherit;
	}
	.num {
		flex: none;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 500;
		background: var(--secondary-container);
		color: var(--on-secondary-container);
	}
	.num.done {
		background: var(--correct-container);
		color: var(--correct);
	}
	.mid {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.name {
		font-size: 1.05rem;
		font-weight: 500;
	}
	.score {
		flex: none;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--on-surface-variant);
	}
	.go {
		flex: none;
		display: flex;
		color: var(--primary);
	}
</style>
