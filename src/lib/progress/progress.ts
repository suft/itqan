import type { ModeKey } from '../domain/game-mode.ts';
import { levelId, levelMastery, type Level, type StyleKey } from '../domain/levels.ts';
import type { Score } from '../domain/stats.ts';

export const NO_DAY = -1;
export const MAX_RECENT_ROUNDS = 20;

const DAY_MS = 86_400_000;

export interface RoundRecord {
	levelId: string;
	score: number;
	total: number;
	/** Local epoch day. */
	day: number;
	mode: ModeKey;
}

export interface RunStats {
	played: number;
	totalScore: number;
	best: number;
	bestStreak: number;
}

type Counts = Record<string, number>;

export interface Progress {
	/** Best round score per level id. */
	bestScores: Counts;
	totalCorrect: number;
	totalWrong: number;
	/** Keyed by String(0-based surah index). */
	surahCorrect: Counts;
	surahWrong: Counts;
	styleCorrect: Counts;
	styleWrong: Counts;
	lastActiveDay: number;
	lastStreakDay: number;
	dayStreak: number;
	bestDayStreak: number;
	answersOnLastActiveDay: number;
	correctRun: number;
	bestCorrectRun: number;
	roundsCompleted: number;
	/** Newest first, at most MAX_RECENT_ROUNDS. */
	recentRounds: RoundRecord[];
	/** mode key → level id → score. */
	runBestScores: Record<string, Counts>;
	runsPlayed: Counts;
	runPoints: Counts;
	runBestStreak: Counts;
}

/** Days since 1970-01-01 in the local time zone. */
export function localEpochDay(
	nowMs: number = Date.now(),
	offsetMs: number = -new Date(nowMs).getTimezoneOffset() * 60_000
): number {
	return Math.floor((nowMs + offsetMs) / DAY_MS);
}

/** Milliseconds until the next local midnight, in 1..86_400_000. */
export function msUntilNextLocalDay(
	nowMs: number = Date.now(),
	offsetMs: number = -new Date(nowMs).getTimezoneOffset() * 60_000
): number {
	return DAY_MS - ((((nowMs + offsetMs) % DAY_MS) + DAY_MS) % DAY_MS);
}

export function emptyProgress(): Progress {
	return {
		bestScores: {},
		totalCorrect: 0,
		totalWrong: 0,
		surahCorrect: {},
		surahWrong: {},
		styleCorrect: {},
		styleWrong: {},
		lastActiveDay: NO_DAY,
		lastStreakDay: NO_DAY,
		dayStreak: 0,
		bestDayStreak: 0,
		answersOnLastActiveDay: 0,
		correctRun: 0,
		bestCorrectRun: 0,
		roundsCompleted: 0,
		recentRounds: [],
		runBestScores: {},
		runsPlayed: {},
		runPoints: {},
		runBestStreak: {}
	};
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function counts(v: unknown): Counts {
	const out: Counts = {};
	if (isRecord(v)) for (const [k, n] of Object.entries(v)) if (isNum(n)) out[k] = n;
	return out;
}

function round(v: unknown): RoundRecord | null {
	if (!isRecord(v)) return null;
	if (typeof v.levelId !== 'string' || !isNum(v.score) || !isNum(v.total) || !isNum(v.day)) {
		return null;
	}
	const mode: ModeKey =
		v.mode === 'survival' || v.mode === 'lives' || v.mode === 'hafiz' ? v.mode : 'regular';
	return { levelId: v.levelId, score: v.score, total: v.total, day: v.day, mode };
}

/** Takes each known field from `raw` only when its type matches, else the default. */
export function normalizeProgress(raw: unknown): Progress {
	const p = emptyProgress();
	if (!isRecord(raw)) return p;
	const num = (k: keyof Progress & string, dflt: number): number => {
		const v = raw[k];
		return isNum(v) ? v : dflt;
	};
	const nested: Record<string, Counts> = {};
	if (isRecord(raw.runBestScores)) {
		for (const [k, v] of Object.entries(raw.runBestScores)) nested[k] = counts(v);
	}
	return {
		bestScores: counts(raw.bestScores),
		totalCorrect: num('totalCorrect', 0),
		totalWrong: num('totalWrong', 0),
		surahCorrect: counts(raw.surahCorrect),
		surahWrong: counts(raw.surahWrong),
		styleCorrect: counts(raw.styleCorrect),
		styleWrong: counts(raw.styleWrong),
		lastActiveDay: num('lastActiveDay', NO_DAY),
		lastStreakDay: num('lastStreakDay', NO_DAY),
		dayStreak: num('dayStreak', 0),
		bestDayStreak: num('bestDayStreak', 0),
		answersOnLastActiveDay: num('answersOnLastActiveDay', 0),
		correctRun: num('correctRun', 0),
		bestCorrectRun: num('bestCorrectRun', 0),
		roundsCompleted: num('roundsCompleted', 0),
		recentRounds: Array.isArray(raw.recentRounds)
			? raw.recentRounds
					.map(round)
					.filter((r): r is RoundRecord => r !== null)
					.slice(0, MAX_RECENT_ROUNDS)
			: [],
		runBestScores: nested,
		runsPlayed: counts(raw.runsPlayed),
		runPoints: counts(raw.runPoints),
		runBestStreak: counts(raw.runBestStreak)
	};
}

const bump = (m: Counts, key: string): Counts => ({ ...m, [key]: (m[key] ?? 0) + 1 });

export function best(p: Progress, id: string): number {
	return p.bestScores[id] ?? 0;
}

export function runBest(p: Progress, modeKey: ModeKey, id: string): number {
	return p.runBestScores[modeKey]?.[id] ?? 0;
}

export function runStats(p: Progress, modeKey: ModeKey): RunStats {
	const scores = Object.values(p.runBestScores[modeKey] ?? {});
	return {
		played: p.runsPlayed[modeKey] ?? 0,
		totalScore: p.runPoints[modeKey] ?? 0,
		best: scores.length === 0 ? 0 : Math.max(...scores),
		bestStreak: p.runBestStreak[modeKey] ?? 0
	};
}

export function styleScore(p: Progress, styleKey: StyleKey): Score {
	return { correct: p.styleCorrect[styleKey] ?? 0, wrong: p.styleWrong[styleKey] ?? 0 };
}

/** Per-surah scores keyed by 0-based surah index. */
export function surahScores(p: Progress): Map<number, Score> {
	const out = new Map<number, Score>();
	for (const k of new Set([...Object.keys(p.surahCorrect), ...Object.keys(p.surahWrong)])) {
		out.set(Number(k), { correct: p.surahCorrect[k] ?? 0, wrong: p.surahWrong[k] ?? 0 });
	}
	return out;
}

export function mastered(p: Progress, levels: readonly Level[]): number {
	return levels.filter((l) => best(p, levelId(l)) >= levelMastery(l)).length;
}

export function points(p: Progress, levels: readonly Level[]): number {
	return levels.reduce((sum, l) => sum + best(p, levelId(l)), 0);
}

/** The streak still counts if the user played today or yesterday. */
export function currentDayStreak(p: Progress, today: number): number {
	return p.lastStreakDay !== NO_DAY && today - p.lastStreakDay <= 1 ? p.dayStreak : 0;
}

export function answersToday(p: Progress, today: number): number {
	return p.lastActiveDay === today ? p.answersOnLastActiveDay : 0;
}

export function withAnswer(
	p: Progress,
	styleKey: StyleKey,
	surahIndex: number,
	correct: boolean,
	day: number
): Progress {
	const sameDay = p.lastActiveDay !== NO_DAY && day === p.lastActiveDay;
	const run = correct ? p.correctRun + 1 : 0;
	const base: Progress = {
		...p,
		// A clock that went backwards moves the "today" counters back with it.
		lastActiveDay: day,
		answersOnLastActiveDay: sameDay ? p.answersOnLastActiveDay + 1 : 1,
		correctRun: run,
		bestCorrectRun: Math.max(p.bestCorrectRun, run)
	};
	const s = String(surahIndex);
	return correct
		? {
				...base,
				totalCorrect: p.totalCorrect + 1,
				surahCorrect: bump(p.surahCorrect, s),
				styleCorrect: bump(p.styleCorrect, styleKey)
			}
		: {
				...base,
				totalWrong: p.totalWrong + 1,
				surahWrong: bump(p.surahWrong, s),
				styleWrong: bump(p.styleWrong, styleKey)
			};
}

export function withCompletedRound(p: Progress, record: RoundRecord): Progress {
	let streak: number;
	if (p.lastStreakDay === NO_DAY) streak = 1;
	else if (record.day === p.lastStreakDay) streak = p.dayStreak;
	else if (record.day === p.lastStreakDay + 1) streak = p.dayStreak + 1;
	// The clock moved back, or a day in the future was stored: keep the streak and continue from today.
	else if (record.day < p.lastStreakDay) streak = p.dayStreak;
	else streak = 1;
	return {
		...p,
		lastStreakDay: record.day,
		dayStreak: streak,
		bestDayStreak: Math.max(p.bestDayStreak, streak),
		roundsCompleted: p.roundsCompleted + 1,
		recentRounds: [record, ...p.recentRounds].slice(0, MAX_RECENT_ROUNDS)
	};
}

/** An endless game is over: counts toward streak, rounds completed and activity as well. */
export function withFinishedRun(p: Progress, record: RoundRecord): Progress {
	const done = withCompletedRound(p, record);
	return {
		...done,
		runsPlayed: bump(done.runsPlayed, record.mode),
		runPoints: { ...done.runPoints, [record.mode]: (done.runPoints[record.mode] ?? 0) + record.score }
	};
}

/** Keeps the higher of the stored and the new value, per level score and per mode streak. */
export function withRunBest(
	p: Progress,
	modeKey: ModeKey,
	id: string,
	score: number,
	streak: number
): Progress {
	const levels = p.runBestScores[modeKey] ?? {};
	const runBestScores =
		score > (levels[id] ?? 0)
			? { ...p.runBestScores, [modeKey]: { ...levels, [id]: score } }
			: p.runBestScores;
	const runBestStreak =
		streak > (p.runBestStreak[modeKey] ?? 0)
			? { ...p.runBestStreak, [modeKey]: streak }
			: p.runBestStreak;
	return { ...p, runBestScores, runBestStreak };
}

/** No-op unless strictly higher. */
export function withLevelScore(p: Progress, id: string, score: number): Progress {
	return score <= best(p, id) ? p : { ...p, bestScores: { ...p.bestScores, [id]: score } };
}

/** What "Clear statistics" leaves: the best score of every level, nothing else. */
export function afterStatisticsReset(p: Progress): Progress {
	return { ...emptyProgress(), bestScores: p.bestScores, runBestScores: p.runBestScores };
}
