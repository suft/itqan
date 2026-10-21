import { distinctPrefixes, withoutSajdahSign } from './arabic-text.ts';
import type { Language } from './language.ts';
import { GUESS_SURAH, type GameStyle, type Level } from './levels.ts';
import type { Mutashabihat, SimilarAyah } from './mutashabihat.ts';
import { mathRng, shuffled, type Rng } from './random.ts';
import { SURAH_COUNT, surahName, type AyahRange, type Quran } from './quran.ts';

/** One multiple-choice question. */
export interface Question {
	style: GameStyle;
	/** Global indices of the ayahs shown (and recited) in the prompt. */
	shown: AyahRange;
	/** The surah the shown ayahs belong to: the one stats are recorded against. */
	surahIndex: number;
	promptAyahs: string[];
	/** 1-based ayah numbers of promptAyahs inside the surah. */
	promptAyahNumbers: number[];
	/** Only for NEXT_AYAH (where the surah is given). */
	reference: string | null;
	options: string[];
	correctOption: number;
}

/** (surahNumber, ayahNumber) pairs, both 1-based: what the audio player needs. */
export function recitation(q: Question): [number, number][] {
	return q.promptAyahNumbers.map((n): [number, number] => [q.surahIndex + 1, n]);
}

const WRONG_OPTIONS = 3;
/** Wrong surahs come from a window of this many surahs around the correct one, at a random position. */
const SURAH_NEIGHBOURHOOD = 16;
const AYAH_NEIGHBOURHOOD = 8;
const AYAH_SEARCH_RADIUS = 60;
const OPTION_MIN_WORDS = 10;
const RECENT_MEMORY = 20;

function rangeOf(first: number, last: number): number[] {
	const out: number[] = [];
	for (let i = first; i <= last; i++) out.push(i);
	return out;
}

function distinctBy<T, K>(items: readonly T[], key: (t: T) => K): T[] {
	const seen = new Set<K>();
	const out: T[] = [];
	for (const t of items) {
		const k = key(t);
		if (!seen.has(k)) {
			seen.add(k);
			out.push(t);
		}
	}
	return out;
}

/**
 * Builds questions for a Level. In Hafiz mode (mutashabihat given) prompts are limited to ayahs that have
 * a trap, and the wrong options are mutashabihat: surahs/next ayahs that resemble the right answer.
 */
export class QuestionGenerator {
	/** Hafiz: only the level's prompts that have a trap; otherwise all of them. */
	readonly promptPool: AyahRange[];
	private deck: number[] = [];
	private recent: number[] = [];
	private readonly window: number;

	constructor(
		private readonly quran: Quran,
		private readonly level: Level,
		private readonly language: Language,
		private readonly rng: Rng = mathRng,
		private readonly mutashabihat: Mutashabihat | null = null
	) {
		const all = this.allPrompts();
		if (mutashabihat === null) this.promptPool = all;
		else {
			const trapped = all.filter((p) => this.hasTrap(p));
			this.promptPool = trapped.length > 0 ? trapped : all;
		}
		const span = level.practice ? level.questionsPerRound : RECENT_MEMORY;
		this.window = this.promptPool.length > span ? span - 1 : 1;
	}

	next(): Question {
		return this.questionFor(this.nextPrompt());
	}

	questionFor(shown: AyahRange): Question {
		return this.level.style === GUESS_SURAH ? this.guessSurahQuestion(shown) : this.nextAyahQuestion(shown);
	}

	// ------------------------------------------------------------ prompt selection

	/** Each prompt once per shuffled deck; also skipped while among the last `window` dealt. */
	private nextPrompt(): AyahRange {
		if (this.deck.length === 0) {
			this.deck = shuffled(rangeOf(0, this.promptPool.length - 1), this.rng);
		}
		const found = this.deck.findIndex((p) => !this.recent.includes(p));
		const pick = Math.max(found, 0);
		const [prompt] = this.deck.splice(pick, 1);
		this.recent.push(prompt);
		while (this.recent.length > this.window) this.recent.shift();
		return this.promptPool[prompt];
	}

	/** Every prompt this level can deal. 1:1 is the bismillah that opens 112 more, so not a guess-the-surah prompt. */
	private allPrompts(): AyahRange[] {
		const { quran, level } = this;
		if (level.openings) {
			return rangeOf(level.firstSurah, level.lastSurah).map((i) => {
				const f = quran.surahs[i].firstAyah;
				return { first: f, last: f + 1 };
			});
		}
		const first = quran.surahs[level.firstSurah].firstAyah;
		const last = quran.surahs[level.lastSurah].lastAyah;
		return rangeOf(first, last)
			.filter((g) => (level.style === GUESS_SURAH ? g !== 0 : !quran.isLastOfSurah(g)))
			.map((g) => ({ first: g, last: g }));
	}

	private hasTrap(shown: AyahRange): boolean {
		return this.level.style === GUESS_SURAH
			? this.trapSurahs(shown, this.quran.surahsContaining(shown)).length > 0
			: this.trapAyahs(shown, this.wrongNextAyahFilter(shown)).length > 0;
	}

	/** Hafiz: surahs holding an ayah that resembles one of `shown`, most similar first, minus `exclude`. */
	private trapSurahs(shown: AyahRange, exclude: ReadonlySet<number>): number[] {
		const similar = this.mutashabihat;
		if (!similar) return [];
		const all: SimilarAyah[] = [];
		for (let g = shown.first; g <= shown.last; g++) all.push(...similar.of(g));
		all.sort((a, b) => b.strength - a.strength);
		const surahs = all.map((a) => this.quran.surahOf(a.ayah).index).filter((i) => !exclude.has(i));
		return [...new Set(surahs)];
	}

	/** Hafiz: tempting wrong next ayahs, most similar first. */
	private trapAyahs(shown: AyahRange, acceptable: (g: number) => boolean): number[] {
		const similar = this.mutashabihat;
		if (!similar) return [];
		const lookAlikes = similar.of(shown.last + 1);
		const slips = similar
			.of(shown.last)
			.filter((a) => !this.quran.isLastOfSurah(a.ayah))
			.map((a): SimilarAyah => ({ ayah: a.ayah + 1, strength: a.strength }));
		const sorted = [...lookAlikes, ...slips].sort((a, b) => b.strength - a.strength).map((a) => a.ayah);
		return distinctBy(sorted.filter(acceptable), (g) => this.quran.key(g));
	}

	/** Keys of every correct next ayah for `shown` (any ayah following an identical copy of the prompt). */
	private validAnswerKeys(shown: AyahRange): Set<string> {
		const { quran } = this;
		const keys = new Set<string>();
		for (const o of quran.occurrencesOf(shown.last)) {
			if (!quran.isLastOfSurah(o)) keys.add(quran.key(o + 1));
		}
		keys.add(quran.key(shown.last + 1));
		return keys;
	}

	/** A wrong next-ayah option may not lie between prompt and answer, nor repeat the text of any valid answer. */
	private wrongNextAyahFilter(shown: AyahRange): (g: number) => boolean {
		const forbidden = this.validAnswerKeys(shown);
		return (g) => !(g >= shown.first && g <= shown.last + 1) && !forbidden.has(this.quran.key(g));
	}

	// ------------------------------------------------------------ guess the surah

	private guessSurahQuestion(shown: AyahRange): Question {
		const { quran, language, rng } = this;
		const surah = quran.surahOf(shown.first);
		const alsoCorrect = quran.surahsContaining(shown);
		const traps = this.trapSurahs(shown, alsoCorrect).slice(0, WRONG_OPTIONS);
		const need = WRONG_OPTIONS - traps.length;

		const pool = (first: number, last: number): number[] => {
			const allowed = rangeOf(first, last).filter(
				(i) => i !== surah.index && !alsoCorrect.has(i) && !traps.includes(i)
			);
			if (allowed.length > SURAH_NEIGHBOURHOOD) {
				// The answer sits at a random position of the window, not always in its middle.
				const low = surah.index - rng.nextInt(SURAH_NEIGHBOURHOOD + 1);
				const inWindow = allowed.filter((i) => i >= low && i <= low + SURAH_NEIGHBOURHOOD);
				if (inWindow.length >= need) return inWindow;
			}
			return allowed
				.slice()
				.sort((a, b) => Math.abs(a - surah.index) - Math.abs(b - surah.index))
				.slice(0, SURAH_NEIGHBOURHOOD);
		};

		let candidates = pool(this.level.firstSurah, this.level.lastSurah);
		if (candidates.length < need) candidates = pool(0, SURAH_COUNT - 1);
		const wrong = [...traps, ...shuffled(candidates, rng).slice(0, need)].map((i) =>
			surahName(quran.surahs[i], language)
		);

		const [options, correct] = this.shuffleWithCorrect(surahName(surah, language), wrong);
		return {
			style: GUESS_SURAH,
			shown,
			surahIndex: surah.index,
			promptAyahs: this.promptTexts(shown),
			promptAyahNumbers: this.promptNumbers(shown),
			reference: null,
			options,
			correctOption: correct
		};
	}

	// ------------------------------------------------------------ next ayah

	private nextAyahQuestion(shown: AyahRange): Question {
		const { quran, language, rng } = this;
		const surah = quran.surahOf(shown.first);
		const answer = shown.last + 1;
		const acceptable = this.wrongNextAyahFilter(shown);
		const traps = this.trapAyahs(shown, acceptable).slice(0, WRONG_OPTIONS);
		const trapKeys = new Set(traps.map((g) => quran.key(g)));

		// Nearby ayahs of the same surah first, then neighbouring surahs.
		const nearby = rangeOf(
			Math.max(0, answer - AYAH_SEARCH_RADIUS),
			Math.min(quran.ayahCount - 1, answer + AYAH_SEARCH_RADIUS)
		)
			.sort(
				(a, b) =>
					Number(quran.surahOf(a) !== surah) - Number(quran.surahOf(b) !== surah) ||
					Math.abs(a - answer) - Math.abs(b - answer)
			)
			.filter(acceptable)
			.filter((g) => !trapKeys.has(quran.key(g)));
		const ordered = distinctBy(nearby, (g) => quran.key(g)).slice(0, AYAH_NEIGHBOURHOOD);

		const wrongIdx = [...traps, ...shuffled(ordered, rng).slice(0, WRONG_OPTIONS - traps.length)];
		// The ۩ sign would mark the prostration ayah; the prompt and the share card keep it, the options do not.
		const texts = [answer, ...wrongIdx].map((g) => withoutSajdahSign(quran.text(g)));
		const labels = distinctPrefixes(texts, OPTION_MIN_WORDS, this.validAnswerKeys(shown));

		const [options, correct] = this.shuffleWithCorrect(labels[0], labels.slice(1));
		return {
			style: this.level.style,
			shown,
			surahIndex: surah.index,
			promptAyahs: this.promptTexts(shown),
			promptAyahNumbers: this.promptNumbers(shown),
			reference: quran.reference(shown, language),
			options,
			correctOption: correct
		};
	}

	private promptTexts(shown: AyahRange): string[] {
		return rangeOf(shown.first, shown.last).map((g) => this.quran.text(g));
	}

	private promptNumbers(shown: AyahRange): number[] {
		return rangeOf(shown.first, shown.last).map((g) => this.quran.ayahNumberInSurah(g));
	}

	private shuffleWithCorrect(correct: string, wrong: string[]): [string[], number] {
		const all = shuffled([...wrong, correct], this.rng);
		return [all, all.indexOf(correct)];
	}
}
