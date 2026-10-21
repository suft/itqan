import { describe, expect, test } from 'bun:test';
import {
	MAX_RECENT_ROUNDS,
	NO_DAY,
	answersToday,
	currentDayStreak,
	emptyProgress,
	localEpochDay,
	msUntilNextLocalDay,
	normalizeProgress,
	runBest,
	runStats,
	styleScore,
	withAnswer,
	withCompletedRound,
	withFinishedRun,
	withRunBest,
	type RoundRecord
} from '../src/lib/progress/progress.ts';
import { runAverage } from '../src/lib/domain/stats.ts';

const rec = (levelId: string, score: number, total: number, day: number): RoundRecord => ({
	levelId,
	score,
	total,
	day,
	mode: 'regular'
});

describe('progress', () => {
	test('dayStreaks', () => {
		let p = emptyProgress();
		const expected: [number, number][] = [
			[10, 1],
			[10, 1],
			[11, 2],
			[14, 1],
			[13, 1]
		];
		for (const [day, streak] of expected) {
			p = withCompletedRound(p, rec('ayah:1-114', 5, 10, day));
			expect(p.dayStreak).toBe(streak);
		}
		expect(p.bestDayStreak).toBe(2);
		expect(p.lastStreakDay).toBe(13);
	});

	test('answersDoNotMoveStreak', () => {
		let p = withAnswer(withAnswer(emptyProgress(), 'surah', 0, true, 10), 'surah', 0, true, 10);
		expect(answersToday(p, 10)).toBe(2);
		expect(p.dayStreak).toBe(0);

		p = withAnswer(p, 'surah', 0, true, 11);
		expect(answersToday(p, 11)).toBe(1);
		expect(answersToday(p, 10)).toBe(0);

		p = withAnswer(p, 'surah', 0, true, 9);
		expect(p.lastActiveDay).toBe(9);
		expect(answersToday(p, 9)).toBe(1);
		expect(answersToday(p, 11)).toBe(0);
	});

	test('currentDayStreakExpires', () => {
		const p = { ...emptyProgress(), lastStreakDay: 11, dayStreak: 2 };
		expect(currentDayStreak(p, 12)).toBe(2);
		expect(currentDayStreak(p, 13)).toBe(0);
		expect(currentDayStreak(emptyProgress(), 5)).toBe(0);
	});

	test('correctRuns', () => {
		let p = emptyProgress();
		for (const correct of [true, true, false, true]) p = withAnswer(p, 'surah', 0, correct, 1);
		expect(p.correctRun).toBe(1);
		expect(p.bestCorrectRun).toBe(2);
	});

	test('styleCountersFeedOverall', () => {
		const p = withAnswer(withAnswer(emptyProgress(), 'surah', 0, true, 1), 'ayah', 1, false, 1);
		expect(styleScore(p, 'surah')).toEqual({ correct: 1, wrong: 0 });
		expect(styleScore(p, 'ayah')).toEqual({ correct: 0, wrong: 1 });
		expect([p.totalCorrect, p.totalWrong]).toEqual([1, 1]);
	});

	test('recentRoundsAreCapped', () => {
		let p = emptyProgress();
		for (let score = 0; score < 25; score++) {
			p = withCompletedRound(p, rec('surah:1-114', score, 20, 1));
		}
		expect(p.recentRounds.length).toBe(MAX_RECENT_ROUNDS);
		expect(p.recentRounds[0].score).toBe(24);
		expect(p.roundsCompleted).toBe(25);
	});

	test('oldProgressFilesStillLoad', () => {
		const p = normalizeProgress({ totalCorrect: 3, surahCorrect: { '0': 3 }, bogus: 1 });
		expect(p).toEqual({ ...emptyProgress(), totalCorrect: 3, surahCorrect: { '0': 3 } });
		expect(p.lastActiveDay).toBe(NO_DAY);
		expect(normalizeProgress('junk')).toEqual(emptyProgress());
		expect(normalizeProgress({ totalCorrect: 'x' }).totalCorrect).toBe(0);
	});

	test('oldRoundRecordsAreRegular', () => {
		const p = normalizeProgress({
			recentRounds: [{ levelId: 'ayah:1-114', score: 5, total: 10, day: 3 }]
		});
		expect(p.recentRounds[0].mode).toBe('regular');
	});

	test('runBestKeepsHigherPerModeAndLevel', () => {
		const id = 'surah:1-114';
		const p = withRunBest(withRunBest(emptyProgress(), 'survival', id, 5, 5), 'survival', id, 3, 3);
		expect(runBest(p, 'survival', id)).toBe(5);
		expect(runStats(p, 'survival').bestStreak).toBe(5);
		expect(runBest(p, 'lives', id)).toBe(0);
	});

	test('finishedRunsFeedStatsAndActivity', () => {
		const id = 'surah:1-114';
		const p = withFinishedRun(
			withFinishedRun(emptyProgress(), { levelId: id, score: 6, total: 9, day: 10, mode: 'lives' }),
			{ levelId: id, score: 3, total: 5, day: 11, mode: 'lives' }
		);
		const stats = runStats(p, 'lives');
		expect(stats.played).toBe(2);
		expect(runAverage(stats.played, stats.totalScore)).toBe(5);
		expect(p.roundsCompleted).toBe(2);
		expect(p.dayStreak).toBe(2);
		expect(p.recentRounds[0].score).toBe(3);
	});

	test('localEpochDayUsesTimeZone', () => {
		const plus3 = 3 * 3_600_000;
		expect(localEpochDay(0, 0)).toBe(0);
		expect(localEpochDay(86_399_999, plus3)).toBe(1);
		expect(msUntilNextLocalDay(0, 0)).toBe(86_400_000);
		expect(msUntilNextLocalDay(86_399_000, 0)).toBe(1_000);
		expect(msUntilNextLocalDay(0, plus3)).toBe(75_600_000);
	});

	test('forwardSkewedClockRecovers', () => {
		let p = withAnswer(
			withCompletedRound(emptyProgress(), rec('ayah:1-114', 5, 10, 1000)),
			'surah',
			0,
			true,
			1000
		);
		p = withAnswer(p, 'surah', 0, true, 10);
		expect(answersToday(p, 10)).toBe(1);

		p = withCompletedRound(p, rec('ayah:1-114', 5, 10, 10));
		p = withCompletedRound(p, rec('ayah:1-114', 5, 10, 11));
		expect(p.dayStreak).toBe(2);
		expect(currentDayStreak(p, 11)).toBe(2);
	});
});
