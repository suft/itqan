import { RecitationPlayer, type PlaybackStatus } from '#lib/audio/player.svelte.ts';
import { recitationUrl, reciterByFolder, type Reciter } from '#lib/audio/reciters.ts';
import { best, runBest } from '#lib/progress/progress.ts';
import { progress } from '#lib/progress/store.svelte.ts';
import { setAutoPlay as saveAutoPlay, setReciter as saveReciter, settings } from '#lib/settings.svelte.ts';
import { isEndless, isOver, type GameMode } from '#lib/domain/game-mode.ts';
import type { Language } from '#lib/domain/language.ts';
import { NEXT_AYAH, levelId, type Level } from '#lib/domain/levels.ts';
import type { Mutashabihat } from '#lib/domain/mutashabihat.ts';
import { QuestionGenerator, recitation, type Question } from '#lib/domain/question-generator.ts';
import type { Quran } from '#lib/domain/quran.ts';

/** Why a recitation could not be played; the page turns it into a message. */
export type PlaybackError = 'loadFailed' | 'loadFailedAutoPlayOff';

const CORRECT_DELAY_MS = 1200;
const WRONG_DELAY_MS = 2200;

export interface QuizOptions {
	quran: Quran;
	level: Level;
	mode: GameMode;
	language: Language;
	mutashabihat: Mutashabihat | null;
}

/** State and rules of one quiz game. Port of QuizViewModel. */
export class QuizController {
	/** 1-based number of the question on screen. */
	number = $state(0);
	score = $state(0);
	wrong = $state(0);
	streak = $state(0);
	bestStreak = $state(0);
	// Raw: Question.style is compared by identity with the style constants, which a $state proxy would break.
	question = $state.raw<Question | null>(null);
	/** Option the user tapped, or null while the question is open. */
	selected = $state<number | null>(null);
	finished = $state(false);
	/** Best score for this level in this mode before the current game. */
	previousBest = $state(0);
	reciter = $state<Reciter>(reciterByFolder(settings.reciter));
	autoPlay = $state(settings.autoPlay);
	playbackError = $state<PlaybackError | null>(null);

	readonly level: Level;
	readonly mode: GameMode;
	readonly player: RecitationPlayer;

	private readonly generator: QuestionGenerator;
	private upcoming: Question;
	private advanceTimer: ReturnType<typeof setTimeout> | null = null;
	private roundRecorded = false;
	private disposed = false;

	// Nothing plays and no feedback timer runs while the page is hidden; what was skipped is picked up
	// again by setForeground.
	private foreground: boolean;
	private pendingAutoPlay = false;
	private resumeOnForeground = false;
	private advancePending = false;
	private pendingAdvanceMs = 0;

	constructor(opts: QuizOptions) {
		this.level = opts.level;
		this.mode = opts.mode;
		this.foreground = typeof document === 'undefined' || document.visibilityState === 'visible';
		this.previousBest = isEndless(opts.mode)
			? runBest(progress.current, opts.mode.key, levelId(opts.level))
			: best(progress.current, levelId(opts.level));
		this.generator = new QuestionGenerator(
			opts.quran,
			opts.level,
			opts.language,
			undefined,
			opts.mutashabihat
		);
		this.upcoming = this.generator.next();
		this.player = new RecitationPlayer({
			trimEndMs: opts.level.style === NEXT_AYAH ? 300 : 0,
			onError: () => this.onPlaybackError()
		});
		this.showNextQuestion();
	}

	get total(): number {
		return this.level.questionsPerRound;
	}
	get livesLeft(): number {
		return (this.mode.lives ?? 0) - this.wrong;
	}
	get answered(): boolean {
		return this.selected !== null;
	}
	get isNewRecord(): boolean {
		return this.finished && this.score > this.previousBest;
	}
	get playback(): PlaybackStatus {
		return this.player.status;
	}

	// ---------------------------------------------------------------- answering

	select(option: number): void {
		const q = this.question;
		if (this.disposed || !q || this.answered || this.finished) return;

		const correct = option === q.correctOption;
		this.selected = option;
		this.streak = correct ? this.streak + 1 : 0;
		this.bestStreak = Math.max(this.bestStreak, this.streak);
		if (correct) this.score++;
		else this.wrong++;

		void progress.recordAnswer(q.style.key, q.surahIndex, correct);
		// The best score is kept as it grows, so a game that ends by the tab dying still counts.
		if (correct && !this.level.practice) this.persistBest();

		this.scheduleAdvance(correct ? CORRECT_DELAY_MS : WRONG_DELAY_MS);
	}

	/** Skip the remaining feedback delay. */
	advanceNow(): void {
		if (!this.answered) return;
		this.clearAdvanceTimer();
		this.advance();
	}

	private scheduleAdvance(ms: number): void {
		this.pendingAdvanceMs = ms;
		if (this.foreground) this.startAdvanceTimer(ms);
		else this.advancePending = true;
	}

	private startAdvanceTimer(ms: number): void {
		this.clearAdvanceTimer();
		this.advanceTimer = setTimeout(() => {
			this.advanceTimer = null;
			this.advance();
		}, ms);
	}

	private clearAdvanceTimer(): void {
		clearTimeout(this.advanceTimer ?? undefined);
		this.advanceTimer = null;
	}

	private advance(): void {
		if (this.disposed) return;
		this.advancePending = false;
		if (this.finished) return;
		if (isOver(this.mode, this.number, this.wrong, this.total)) this.finishRound();
		else this.showNextQuestion();
	}

	private showNextQuestion(): void {
		this.player.stop();
		const q = this.upcoming;
		this.upcoming = this.generator.next();
		this.number++;
		this.question = q;
		this.selected = null;

		if (this.autoPlay) this.startPlayback(q);
	}

	private finishRound(): void {
		this.player.stop();
		this.finished = true;
		this.recordRound();
		const id = levelId(this.level);
		if (isEndless(this.mode)) {
			void progress.recordFinishedRun(this.mode.key, id, this.score, this.number);
		} else {
			void progress.recordCompletedRound(id, this.score, this.total);
		}
	}

	restart(): void {
		// A second tap on "Retry" (or one after the game is already running) must not start another game.
		if (this.disposed || !this.finished) return;
		this.clearAdvanceTimer();
		this.advancePending = false;
		this.player.stop();
		this.previousBest = Math.max(this.previousBest, this.score);
		this.roundRecorded = false;
		this.number = 0;
		this.score = 0;
		this.wrong = 0;
		this.streak = 0;
		this.bestStreak = 0;
		this.selected = null;
		this.finished = false;
		this.question = null;
		this.showNextQuestion();
	}

	private recordRound(): void {
		if (this.roundRecorded) return;
		this.roundRecorded = true;
		this.persistBest();
	}

	/** Stores the best score (and the best streak of an endless game) reached so far. */
	private persistBest(): void {
		if (this.level.practice) return;
		const id = levelId(this.level);
		if (isEndless(this.mode)) {
			void progress.recordRunBest(this.mode.key, id, this.score, this.bestStreak);
		} else {
			void progress.recordLevelScore(id, this.score);
		}
	}

	// ---------------------------------------------------------------- audio

	/** Called as the page becomes visible or hidden. */
	setForeground(value: boolean): void {
		if (this.disposed || this.foreground === value) return;
		this.foreground = value;
		if (!value) {
			this.resumeOnForeground = this.player.status === 'playing' || this.player.status === 'buffering';
			this.player.pause();
			if (this.advanceTimer !== null) {
				this.clearAdvanceTimer();
				this.advancePending = true;
			}
		} else {
			if (this.advancePending) {
				this.advancePending = false;
				// The user gets the full feedback time again.
				this.startAdvanceTimer(this.pendingAdvanceMs);
			}
			const q = this.question;
			if ((this.pendingAutoPlay || this.resumeOnForeground) && q && !this.finished) {
				this.startPlayback(q);
			}
			this.pendingAutoPlay = false;
			this.resumeOnForeground = false;
		}
	}

	/** Plays q and warms the cache for the next question, or remembers to until the page is visible. */
	private startPlayback(q: Question): void {
		if (this.foreground) {
			this.player.play(this.urlsFor(q));
			this.player.prefetch(this.urlsFor(this.upcoming));
		} else {
			this.pendingAutoPlay = true;
		}
	}

	togglePlayback(): void {
		const q = this.question;
		if (q) this.player.toggle(this.urlsFor(q));
	}

	setReciter(reciter: Reciter): void {
		if (reciter.folder === this.reciter.folder) return;
		this.reciter = reciter;
		saveReciter(reciter.folder);
		this.player.stop();
		const q = this.question;
		if (q && this.autoPlay && !this.finished) this.startPlayback(q);
	}

	setAutoPlay(enabled: boolean): void {
		this.autoPlay = enabled;
		saveAutoPlay(enabled);
		const q = this.question;
		if (!q) return;
		if (enabled) {
			this.startPlayback(q);
		} else {
			this.pendingAutoPlay = false;
			this.player.pause();
		}
	}

	private onPlaybackError(): void {
		// Like the original: stop auto-playing for this round instead of failing on every question.
		this.playbackError = this.autoPlay ? 'loadFailedAutoPlayOff' : 'loadFailed';
		this.autoPlay = false;
	}

	playbackErrorShown(): void {
		this.playbackError = null;
	}

	private urlsFor(q: Question): string[] {
		const reciter = this.reciter;
		return recitation(q).map(([surah, ayah]) => recitationUrl(reciter, surah, ayah));
	}

	// ---------------------------------------------------------------- lifecycle

	/** Leaving mid-round keeps the points earned so far. Idempotent. */
	dispose(): void {
		if (this.disposed) return;
		// A round whose last answer was given during the feedback delay still counts as finished.
		if (!this.finished && this.answered && isOver(this.mode, this.number, this.wrong, this.total)) {
			this.finishRound();
		} else if (this.score > 0) {
			this.recordRound();
		}
		this.disposed = true;
		this.clearAdvanceTimer();
		this.player.release();
	}
}
