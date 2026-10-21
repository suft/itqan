<script lang="ts">
	import { goto } from '$app/navigation';
	import { getQuran } from '#lib/context.ts';
	import { href } from '#lib/nav.ts';
	import { strings } from '#lib/settings.svelte.ts';
	import type { Progress } from '#lib/progress/progress.ts';
	import { surahScores } from '#lib/progress/progress.ts';
	import { levelId, surahPractice } from '#lib/domain/levels.ts';
	import { SURAH_COUNT, surahName } from '#lib/domain/quran.ts';
	import {
		FAIR_PERCENT,
		accuracy,
		percent,
		scoreTotal,
		strongestFirst,
		tier,
		weakestFirst,
		type Score,
		type SurahTier
	} from '#lib/domain/stats.ts';
	import LegendEntry from './LegendEntry.svelte';

	let {
		progress,
		selected,
		onselect
	}: { progress: Progress; selected: number | null; onselect: (i: number) => void } = $props();

	const quran = getQuran();
	const s = $derived(strings());
	const scores = $derived(surahScores(progress));
	const practised = $derived([...scores.values()].filter((x) => scoreTotal(x) > 0).length);
	const ranked = $derived(weakestFirst(scores));
	const strong = $derived(strongestFirst(scores));
	const overallTotal = $derived(progress.totalCorrect + progress.totalWrong);
	const name = (i: number) => surahName(quran.surahs[i], s.language);

	const TIER_COLOR: Record<SurahTier, string> = {
		none: 'color-mix(in srgb, var(--surface-lowest) 55%, transparent)',
		weak: 'color-mix(in srgb, var(--wrong) 30%, transparent)',
		fair: 'color-mix(in srgb, var(--gold) 40%, transparent)',
		strong: 'color-mix(in srgb, var(--correct) 35%, transparent)'
	};
	const tierLabel = (t: SurahTier) =>
		t === 'none' ? s.tierNotPractised : t === 'weak' ? s.tierWeak : t === 'fair' ? s.tierFair : s.tierStrong;

	function practice(index: number) {
		void goto(href('/quiz', { mode: 'regular', level: levelId(surahPractice(index, quran)) }));
	}

	const selectedScore = $derived<Score | undefined>(selected === null ? undefined : scores.get(selected));
</script>

<h3 class="section">{s.surahMap}</h3>
<p class="muted">{s.surahsPractised(practised, SURAH_COUNT)}</p>

<div class="map">
	{#each { length: SURAH_COUNT } as _, i (i)}
		{@const sc = scores.get(i)}
		{@const t = tier(sc)}
		<button
			class="cell"
			class:selected={selected === i}
			class:unpractised={t === 'none'}
			style:background={TIER_COLOR[t]}
			aria-pressed={selected === i}
			aria-label={s.surahCell(name(i), tierLabel(t), sc && scoreTotal(sc) > 0 ? percent(sc) : null)}
			onclick={() => onselect(i)}
		>
			{s.number(i + 1)}
		</button>
	{/each}
</div>

<div class="legend">
	<LegendEntry color={TIER_COLOR.none} label={s.tierNotPractised} outlined />
	<LegendEntry color={TIER_COLOR.weak} label={s.tierWeak} />
	<LegendEntry color={TIER_COLOR.fair} label={s.tierFair} />
	<LegendEntry color={TIER_COLOR.strong} label={s.tierStrong} />
</div>

{#if selected !== null}
	<div class="card detail">
		<div class="grow">
			<h4>{s.rankedSurah(selected + 1, name(selected))}</h4>
			<p class="small muted">
				{selectedScore && scoreTotal(selectedScore) > 0
					? s.surahCounts(selectedScore.correct, selectedScore.wrong)
					: s.notPractisedYet}
			</p>
		</div>
		<button class="btn text" onclick={() => practice(selected)}>{s.practice}</button>
	</div>
{/if}

{#snippet row(rank: number, index: number, score: Score, highlight: boolean, canPractice: boolean)}
	<div class="card row" class:highlight>
		<div class="line">
			<h4 class="grow">{s.rankedSurah(rank, name(index))}</h4>
			<span class="pct" class:ok={percent(score) >= FAIR_PERCENT}>{s.percent(percent(score))}</span>
		</div>
		<div class="track"><div class="fill" style:width="{accuracy(score) * 100}%"></div></div>
		<div class="line">
			<p class="small muted grow">{s.surahCounts(score.correct, score.wrong)}</p>
			{#if canPractice}
				<button class="btn text" onclick={() => practice(index)}>{s.practice}</button>
			{/if}
		</div>
	</div>
{/snippet}

{#if overallTotal === 0}
	<p class="empty">{s.statisticsEmpty}</p>
{:else}
	{#if ranked.length === 0}
		<p class="empty title">{s.noMistakes}</p>
	{:else}
		<h3 class="section">{s.surahsToReview}</h3>
		{#each ranked as item, i (item.surahIndex)}
			{@render row(i + 1, item.surahIndex, item.score, tier(item.score) === 'weak', true)}
		{/each}
	{/if}
	{#if strong.length > 0}
		<h3 class="section">{s.strongestSurahs}</h3>
		{#each strong as item, i (item.surahIndex)}
			{@render row(i + 1, item.surahIndex, item.score, false, false)}
		{/each}
	{/if}
{/if}

<style>
	.map {
		display: grid;
		grid-template-columns: repeat(10, 1fr);
		gap: 4px;
	}
	.cell {
		aspect-ratio: 1;
		min-width: 0;
		padding: 0;
		border: none;
		border-radius: 6px;
		color: var(--on-surface);
		font-size: 0.6875rem;
		line-height: 1;
		overflow: hidden;
	}
	.cell.unpractised {
		border: 1px solid var(--outline-variant);
	}
	.cell.selected {
		border: 2px solid var(--primary);
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 12px;
	}
	.detail {
		display: flex;
		align-items: center;
		padding: 8px 8px 8px 16px;
		padding-inline: 16px 8px;
	}
	.grow {
		flex: 1;
		min-width: 0;
	}
	.row {
		padding: 12px 16px;
	}
	.row.highlight {
		background: color-mix(in srgb, var(--wrong-container) 90%, transparent);
	}
	.line {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.pct {
		font-weight: 500;
		color: var(--wrong);
	}
	.pct.ok {
		color: var(--correct);
	}
	.track {
		margin-block: 6px 4px;
		height: 4px;
		border-radius: 2px;
		overflow: hidden;
		background: color-mix(in srgb, var(--wrong) 35%, transparent);
	}
	.fill {
		height: 100%;
		background: var(--correct);
	}
</style>
