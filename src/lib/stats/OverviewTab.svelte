<script lang="ts">
	import { getQuran } from '#lib/context.ts';
	import { strings } from '#lib/settings.svelte.ts';
	import type { Progress } from '#lib/progress/progress.ts';
	import { mastered, points, runStats, styleScore } from '#lib/progress/progress.ts';
	import { MODES, isEndless, showsLongestStreak } from '#lib/domain/game-mode.ts';
	import { STYLES, levelsForStyle } from '#lib/domain/levels.ts';
	import { accuracy, percent, runAverage, scoreTotal } from '#lib/domain/stats.ts';

	let { progress }: { progress: Progress } = $props();

	const quran = getQuran();
	const s = $derived(strings());
	const overall = $derived({ correct: progress.totalCorrect, wrong: progress.totalWrong });
	const overallTotal = $derived(scoreTotal(overall));
	const styleAnswers = $derived(STYLES.reduce((n, st) => n + scoreTotal(styleScore(progress, st.key)), 0));

	// Circular gauge: r = 44, stroke 8 in a 96px box.
	const R = 44;
	const CIRC = 2 * Math.PI * R;
</script>

<div class="overall card">
	<div class="gauge">
		<svg viewBox="0 0 96 96" width="96" height="96" aria-hidden="true">
			<circle cx="48" cy="48" r={R} fill="none" stroke="var(--surface-lowest)" stroke-width="8" />
			{#if overallTotal > 0}
				<circle
					cx="48"
					cy="48"
					r={R}
					fill="none"
					stroke="var(--primary)"
					stroke-width="8"
					stroke-linecap="round"
					stroke-dasharray="{CIRC * accuracy(overall)} {CIRC}"
					transform="rotate(-90 48 48)"
				/>
			{/if}
		</svg>
		<span class="gauge-text">{overallTotal === 0 ? '—' : s.percent(percent(overall))}</span>
	</div>
	<div class="overall-text">
		<h3>{s.accuracy}</h3>
		<p class="correct">{s.correctAnswers(overall.correct)}</p>
		<p class="wrong">{s.wrongAnswers(overall.wrong)}</p>
	</div>
</div>

{#if overallTotal === 0}
	<p class="empty">{s.statisticsEmpty}</p>
{/if}

{#each STYLES as style (style.key)}
	{@const levels = levelsForStyle(style, quran)}
	{@const score = styleScore(progress, style.key)}
	{@const done = mastered(progress, levels)}
	<section class="card">
		<h3>{s.styleTitle(style.key)}</h3>
		<p class="muted">
			{scoreTotal(score) > 0 ? s.statisticsSummary(percent(score), scoreTotal(score)) : s.noAnswersYet}
		</p>
		<p class="label">{s.masteredCount(done, levels.length)}</p>
		<progress class="bar" max={levels.length} value={done}></progress>
		<p class="small muted">{s.totalPoints(points(progress, levels))}</p>
	</section>
{/each}

{#each MODES.filter(isEndless) as mode (mode.key)}
	{@const stats = runStats(progress, mode.key)}
	<section class="card">
		<h3>{s.gameModeTitle(mode.key)}</h3>
		{#if stats.played === 0 && stats.best === 0}
			<p class="muted">{s.noGamesYet}</p>
		{:else}
			<!-- A game left midway records the best score without counting as a finished game. -->
			{#if stats.best > 0}<p class="label">{s.bestScore(stats.best)}</p>{/if}
			{#if stats.played > 0}
				<p class="label">{s.gamesPlayed(stats.played)}</p>
				<p class="label">{s.averageScore(runAverage(stats.played, stats.totalScore))}</p>
				{#if showsLongestStreak(mode)}
					<p class="label">{s.longestStreak(stats.bestStreak)}</p>
				{/if}
			{/if}
		{/if}
	</section>
{/each}

{#if overallTotal > styleAnswers}
	<p class="small muted">{s.styleAccuracySinceUpdate}</p>
{/if}

<style>
	.overall {
		display: flex;
		align-items: center;
		gap: 20px;
		padding: 20px;
		background: var(--primary-container);
		color: var(--on-primary-container);
	}
	.gauge {
		position: relative;
		flex: none;
		width: 96px;
		height: 96px;
		display: grid;
		place-items: center;
	}
	.gauge svg {
		position: absolute;
		inset: 0;
	}
	.gauge-text {
		font-size: 1.5rem;
		line-height: 1.2;
	}
	.overall-text {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.correct {
		color: var(--correct);
	}
	.wrong {
		color: var(--wrong);
	}
	.bar {
		width: 100%;
		height: 4px;
		border-radius: 2px;
		appearance: none;
		border: none;
		overflow: hidden;
		background: var(--surface-variant);
		accent-color: var(--correct);
	}
	.bar::-webkit-progress-bar {
		background: var(--surface-variant);
	}
	.bar::-webkit-progress-value {
		background: var(--correct);
	}
	.bar::-moz-progress-bar {
		background: var(--correct);
	}
</style>
