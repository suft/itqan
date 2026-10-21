<script lang="ts">
	import { getQuran } from '#lib/context.ts';
	import { strings } from '#lib/settings.svelte.ts';
	import type { Progress, RoundRecord } from '#lib/progress/progress.ts';
	import { answersToday, currentDayStreak } from '#lib/progress/progress.ts';
	import { isEndless, modeByKey, type GameMode } from '#lib/domain/game-mode.ts';
	import { levelById, levelName, masteryFor, type Level } from '#lib/domain/levels.ts';
	import LegendEntry from './LegendEntry.svelte';

	let { progress, today }: { progress: Progress; today: number } = $props();

	interface Resolved {
		record: RoundRecord;
		level: Level;
		mode: GameMode;
	}

	const quran = getQuran();
	const s = $derived(strings());
	const rtl = $derived(s.language === 'ar');

	const rounds = $derived(
		progress.recentRounds.flatMap((record): Resolved[] => {
			const mode = modeByKey(record.mode);
			const level = levelById(record.levelId, quran);
			return mode && level ? [{ record, level, mode }] : [];
		})
	);
	// The percentage chart is meaningless for endless games, and practice rounds have their own length.
	const regular = $derived(rounds.filter((r) => r.mode.key === 'regular' && !r.level.practice));
	// Oldest first.
	const trend = $derived([...regular].reverse());
	const isMastered = (r: Resolved) =>
		r.record.score >= masteryFor(r.level.style, r.record.total);
	const pct = (r: RoundRecord) => Math.floor((r.score * 100) / Math.max(r.total, 1));
	const ago = (day: number) => s.daysAgo(Math.max(today - day, 0));

	// Score trend chart geometry (ActivityTab.kt ScoreTrendChart).
	const HEIGHT = 140;
	const INSET = 8;
	const LABEL_W = 34;
	const GUIDES = [0, 50, 100];
	let width = $state(0);
	const plotH = HEIGHT - 2 * INSET;
	const plotStart = INSET + LABEL_W + 6;
	const plotEnd = $derived(width - INSET);
	// x is measured from the start edge and mirrored in RTL.
	const at = (x: number) => (rtl ? width - x : x);
	const step = $derived(trend.length > 1 ? (plotEnd - plotStart) / (trend.length - 1) : 0);
	const yOf = (frac: number) => INSET + plotH * (1 - frac);
	const points = $derived(
		trend.map((r, i) => ({
			x: at(plotStart + step * i),
			y: yOf(r.record.score / Math.max(r.record.total, 1)),
			ok: isMastered(r)
		}))
	);
</script>

{#snippet tile(value: number, label: string)}
	<div class="card tile">
		<span class="value">{s.number(value)}</span>
		<span class="small">{label}</span>
	</div>
{/snippet}

<div class="tiles">
	{@render tile(currentDayStreak(progress, today), s.currentStreak)}
	{@render tile(progress.bestDayStreak, s.bestStreak)}
	{@render tile(answersToday(progress, today), s.questionsToday)}
	{@render tile(progress.roundsCompleted, s.roundsCompleted)}
	{@render tile(progress.correctRun, s.currentRun)}
	{@render tile(progress.bestCorrectRun, s.bestRun)}
</div>

{#if rounds.length === 0}
	<p class="empty">{s.noRoundsYet}</p>
{:else}
	{#if trend.length >= 2}
		<h3 class="section">{s.scoreTrend}</h3>
		<div class="card chart-card">
			<div class="chart" bind:clientWidth={width}>
				{#if width > 0}
					<svg
						{width}
						height={HEIGHT}
						role="img"
						aria-label={s.scoreTrendDescription(pct(trend[0].record), pct(trend[trend.length - 1].record))}
					>
						{#each GUIDES as g (g)}
							<line
								x1={at(plotStart)}
								x2={at(plotEnd)}
								y1={yOf(g / 100)}
								y2={yOf(g / 100)}
								stroke="var(--outline-variant)"
								stroke-width="1"
							/>
							<text
								x={rtl ? width - INSET : INSET}
								y={yOf(g / 100)}
								text-anchor={rtl ? 'end' : 'start'}
								dominant-baseline="central"
								fill="var(--on-surface-variant)"
								font-size="11">{s.percent(g)}</text
							>
						{/each}
						{#each points.slice(1) as p, i (i)}
							<line
								x1={points[i].x}
								y1={points[i].y}
								x2={p.x}
								y2={p.y}
								stroke="var(--primary)"
								stroke-width="2"
								stroke-linecap="round"
							/>
						{/each}
						{#each points as p, i (i)}
							<circle cx={p.x} cy={p.y} r="4" fill={p.ok ? 'var(--correct)' : 'var(--secondary)'} />
						{/each}
					</svg>
				{/if}
			</div>
			<div class="legend">
				<LegendEntry color="var(--correct)" label={s.mastered} />
				<LegendEntry color="var(--secondary)" label={s.notMastered} />
			</div>
		</div>
	{/if}

	<h3 class="section">{s.recentRounds}</h3>
	{#each rounds as round, i (i)}
		<div class="card round">
			<div class="grow">
				<h4>{levelName(round.level, s.language)}</h4>
				<p class="small muted">
					{#if isEndless(round.mode)}
						{s.gameModeTitle(round.mode.key)} · {s.styleTitle(round.level.style.key)} · {ago(round.record.day)}
					{:else}
						{s.styleTitle(round.level.style.key)} · {ago(round.record.day)}
					{/if}
				</p>
			</div>
			{#if isEndless(round.mode)}
				<span class="score primary">{s.number(round.record.score)}</span>
			{:else}
				<span class="score" class:ok={isMastered(round)}>
					{s.number(round.record.score)} / {s.number(round.record.total)}
				</span>
			{/if}
		</div>
	{/each}
{/if}

<style>
	.tiles {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.tile {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 12px 14px;
		min-width: 0;
		background: var(--primary-container);
		color: var(--on-primary-container);
	}
	.value {
		font-size: 1.5rem;
		line-height: 1.3;
	}
	.chart-card {
		padding: 0 0 10px;
	}
	.chart {
		width: 100%;
		height: 140px;
	}
	.chart svg {
		display: block;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 12px;
		padding-inline: 16px;
	}
	.round {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 16px;
	}
	.grow {
		flex: 1;
		min-width: 0;
	}
	.score {
		font-weight: 500;
		color: var(--wrong);
		white-space: nowrap;
	}
	.score.ok {
		color: var(--correct);
	}
	.score.primary {
		color: var(--primary);
	}
</style>
