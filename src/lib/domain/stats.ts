/** Correct/wrong answer counts for one surah (or overall). */
export interface Score {
	correct: number;
	wrong: number;
}

export function scoreTotal(s: Score): number {
	return s.correct + s.wrong;
}

/** 0.0–1.0; never answered counts as 0. */
export function accuracy(s: Score): number {
	const t = scoreTotal(s);
	return t === 0 ? 0 : s.correct / t;
}

/** Whole percent, rounded down with integer arithmetic; no answers = 0 %. */
export function percent(s: Score): number {
	const t = scoreTotal(s);
	return t === 0 ? 0 : Math.floor((s.correct * 100) / t);
}

/** Average finished-run score, rounded half up; 0 when nothing was played. */
export function runAverage(played: number, totalScore: number): number {
	return played === 0 ? 0 : Math.floor((totalScore + Math.floor(played / 2)) / played);
}

export interface SurahScore {
	surahIndex: number;
	score: Score;
}

export type SurahTier = 'none' | 'weak' | 'fair' | 'strong';

export const FAIR_PERCENT = 60;
export const STRONG_PERCENT = 90;
export const STRONG_MIN_ANSWERS = 5;
export const STRONGEST_LIMIT = 10;
export const REVIEW_LIMIT = 10;

/** Colour bucket for the surah map. */
export function tier(score?: Score | null): SurahTier {
	if (!score || scoreTotal(score) === 0) return 'none';
	const p = percent(score);
	if (p < FAIR_PERCENT) return 'weak';
	if (p < STRONG_PERCENT) return 'fair';
	return 'strong';
}

function entries(scores: ReadonlyMap<number, Score> | Readonly<Record<number, Score>>): SurahScore[] {
	const pairs = scores instanceof Map ? [...scores] : Object.entries(scores).map(([k, v]) => [Number(k), v] as const);
	return pairs.map(([surahIndex, score]) => ({ surahIndex, score }));
}

/** At least minAnswers answers and STRONG_PERCENT correct; highest accuracy, then most answers, then mushaf order. */
export function strongestFirst(
	scores: ReadonlyMap<number, Score> | Readonly<Record<number, Score>>,
	minAnswers = STRONG_MIN_ANSWERS,
	limit = STRONGEST_LIMIT
): SurahScore[] {
	return entries(scores)
		.filter((e) => scoreTotal(e.score) >= minAnswers && percent(e.score) >= STRONG_PERCENT)
		.sort(
			(a, b) =>
				accuracy(b.score) - accuracy(a.score) ||
				scoreTotal(b.score) - scoreTotal(a.score) ||
				a.surahIndex - b.surahIndex
		)
		.slice(0, limit);
}

const smoothed = (s: Score) => (s.correct + 1) / (scoreTotal(s) + 2);

/** Surahs to review: at least one wrong and under STRONG_PERCENT; weakest (smoothed) first, then most mistakes. */
export function weakestFirst(
	scores: ReadonlyMap<number, Score> | Readonly<Record<number, Score>>,
	limit = REVIEW_LIMIT
): SurahScore[] {
	return entries(scores)
		.filter((e) => e.score.wrong > 0 && percent(e.score) < STRONG_PERCENT)
		.sort(
			(a, b) =>
				smoothed(a.score) - smoothed(b.score) ||
				b.score.wrong - a.score.wrong ||
				a.surahIndex - b.surahIndex
		)
		.slice(0, limit);
}
