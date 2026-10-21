import { createStore, get, set } from 'idb-keyval';
import type { ModeKey } from '#lib/domain/game-mode.ts';
import type { StyleKey } from '#lib/domain/levels.ts';
import {
	afterStatisticsReset,
	emptyProgress,
	localEpochDay,
	normalizeProgress,
	withAnswer,
	withCompletedRound,
	withFinishedRun,
	withLevelScore,
	withRunBest,
	type Progress
} from '#lib/progress/progress.ts';

const db = createStore('itqan', 'kv');
const KEY = 'progress';

/** Serialises writes so they land in order. */
let queue: Promise<void> = Promise.resolve();

export class ProgressStore {
	current = $state<Progress>(emptyProgress());

	async load(): Promise<void> {
		try {
			this.current = normalizeProgress(await get(KEY, db));
		} catch (e) {
			console.warn('itqan: progress storage unavailable', e);
		}
	}

	update(fn: (p: Progress) => Progress): Promise<void> {
		this.current = fn(this.current);
		const snapshot = $state.snapshot(this.current);
		queue = queue
			.then(() => set(KEY, snapshot, db))
			.catch((e) => console.warn('itqan: progress not saved', e));
		return queue;
	}

	recordAnswer(styleKey: StyleKey, surahIndex: number, correct: boolean): Promise<void> {
		return this.update((p) => withAnswer(p, styleKey, surahIndex, correct, localEpochDay()));
	}

	recordCompletedRound(levelId: string, score: number, total: number): Promise<void> {
		return this.update((p) =>
			withCompletedRound(p, { levelId, score, total, day: localEpochDay(), mode: 'regular' })
		);
	}

	recordLevelScore(levelId: string, score: number): Promise<void> {
		return this.update((p) => withLevelScore(p, levelId, score));
	}

	recordRunBest(modeKey: ModeKey, levelId: string, score: number, streak: number): Promise<void> {
		return this.update((p) => withRunBest(p, modeKey, levelId, score, streak));
	}

	/** `answered` is stored as the record's total. */
	recordFinishedRun(modeKey: ModeKey, levelId: string, score: number, answered: number): Promise<void> {
		return this.update((p) =>
			withFinishedRun(p, { levelId, score, total: answered, day: localEpochDay(), mode: modeKey })
		);
	}

	resetStatistics(): Promise<void> {
		return this.update(afterStatisticsReset);
	}
}

export const progress = new ProgressStore();
