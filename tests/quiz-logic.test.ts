import { expect, test } from 'bun:test';
import { ayahMarker, digits, distinctPrefixes, firstWords } from '../src/lib/domain/arabic-text.ts';
import { MODES, isOver, modeByKey } from '../src/lib/domain/game-mode.ts';
import {
	GUESS_SURAH,
	NEXT_AYAH,
	STYLES,
	levelById,
	levelName,
	levelId,
	levelsForStyle,
	masteryFor,
	surahPractice
} from '../src/lib/domain/levels.ts';
import { Mutashabihat } from '../src/lib/domain/mutashabihat.ts';
import { QuestionGenerator } from '../src/lib/domain/question-generator.ts';
import { surahName } from '../src/lib/domain/quran.ts';
import { seededRng } from '../src/lib/domain/random.ts';
import { SURAH_NAMES_EN } from '../src/lib/domain/surah-names.ts';
import { runAverage, strongestFirst, tier, weakestFirst } from '../src/lib/domain/stats.ts';
import { quran } from './fixtures.ts';

const mode = (key: string) => modeByKey(key)!;
const sc = (correct: number, wrong: number) => ({ correct, wrong });

test('parsesWholeQuran', () => {
	expect(quran.surahs.length).toBe(114);
	expect(quran.ayahCount).toBe(6236);
	expect(quran.surahs[0].name).toBe('الفاتحة');
	expect(quran.surahs[0].ayahCount).toBe(7);
	expect(quran.surahs[1].ayahCount).toBe(286);
	expect(quran.surahs[113].name).toBe('الناس');
	expect(quran.surahs[113].lastAyah).toBe(6235);
	expect(quran.ayahNumberInSurah(quran.surahs[1].firstAyah + 254)).toBe(255);
});

test('detectsAyahsSharedBetweenSurahs', () => {
	// «الم» opens البقرة، آل عمران، العنكبوت، الروم، لقمان، السجدة
	const alm = quran.surahs[1].firstAyah;
	const owners = [...quran.surahsContaining({ first: alm, last: alm })].map((i) => i + 1).sort((a, b) => a - b);
	expect(owners).toEqual([2, 3, 29, 30, 31, 32]);
	// …but the first two ayahs together are unique to البقرة
	expect(quran.surahsContaining({ first: alm, last: alm + 1 })).toEqual(new Set([1]));
});

test('levelTablesMatchOriginal', () => {
	const surahLevels = levelsForStyle(GUESS_SURAH, quran);
	const ayahLevels = levelsForStyle(NEXT_AYAH, quran);
	expect(surahLevels.length).toBe(20);
	expect(ayahLevels.length).toBe(25);
	const all = [...surahLevels, ...ayahLevels];
	expect(new Set(all.map(levelId)).size).toBe(all.length);
	expect(levelName(ayahLevels[13], 'ar')).toBe('سورة يس');
	expect(levelName(ayahLevels[3], 'ar')).toBe('سورتا التكوير والإنفطار');
	expect(levelName(ayahLevels[23], 'ar')).toBe('فواتح السور');
	expect(ayahLevels[23].openings).toBe(true);
});

test('mutashabihatParsesBothDirectionsStrongestFirst', () => {
	const m = Mutashabihat.fromPairs(
		[
			[1, 1, 1, 3, 100],
			[1, 1, 27, 30, 50],
			[2, 1, 1, 1, 70]
		],
		quran
	);
	expect(m.of(0)).toEqual([
		{ ayah: 2, strength: 100 },
		{ ayah: 7, strength: 70 },
		{ ayah: quran.surahs[26].firstAyah + 29, strength: 50 }
	]);
	expect(m.of(2)).toEqual([{ ayah: 0, strength: 100 }]);
	expect(m.of(1).length).toBe(0);
	expect(() => Mutashabihat.fromPairs([[2, 287, 1, 1, 5]], quran)).toThrow();
	expect(() => Mutashabihat.fromPairs([[1, 1, 1, 1, 5]], quran)).toThrow();
});

test('ayahsAreNotRepeatedWithinARound', () => {
	const level = levelsForStyle(GUESS_SURAH, quran)[3]; // جزء عمَّ: 564 ayahs
	const gen = new QuestionGenerator(quran, level, 'ar', seededRng(7));
	const prompts = Array.from({ length: 20 }, () => gen.next().shown.first);
	expect(new Set(prompts).size).toBe(20);
});

test('englishLabels', () => {
	expect(new Set(SURAH_NAMES_EN).size).toBe(114);
	expect(surahName(quran.surahs[1], 'en')).toBe('Al-Baqarah');
	expect(surahName(quran.surahs[113], 'en')).toBe('An-Nas');
	expect(surahName(quran.surahs[0], 'ar')).toBe('الفاتحة');

	const b = quran.surahs[1].firstAyah + 254;
	expect(quran.reference({ first: b, last: b }, 'en')).toBe('Surah Al-Baqarah · Ayah 255');
	expect(quran.reference({ first: b, last: b }, 'ar')).toBe('سورة البقرة · الآية ٢٥٥');
	expect(quran.reference({ first: 0, last: 1 }, 'en')).toBe('Surah Al-Fatihah · Ayahs 1–2');

	const ayahLevels = levelsForStyle(NEXT_AYAH, quran);
	const surahLevels = levelsForStyle(GUESS_SURAH, quran);
	expect(levelName(ayahLevels[13], 'en')).toBe('Surah Ya-Sin');
	expect(levelName(ayahLevels[3], 'en')).toBe('Surahs At-Takwir and Al-Infitar');
	expect(levelName(surahLevels[0], 'en')).toBe("Al-'Adiyat to An-Nas");
	expect(levelName(surahLevels[14], 'en')).toBe('Second half of the Quran (Al-Kahf to An-Nas)');
});

test('englishQuestionsKeepQuranTextArabic', () => {
	const surahGen = new QuestionGenerator(quran, levelsForStyle(GUESS_SURAH, quran)[0], 'en', seededRng(1));
	for (let i = 0; i < 50; i++) {
		const q = surahGen.next();
		expect(q.options[q.correctOption]).toBe(surahName(quran.surahs[q.surahIndex], 'en'));
		const texts: string[] = [];
		for (let g = q.shown.first; g <= q.shown.last; g++) texts.push(quran.text(g));
		expect(q.promptAyahs).toEqual(texts);
	}

	const ayahGen = new QuestionGenerator(quran, levelsForStyle(NEXT_AYAH, quran)[0], 'en', seededRng(2));
	for (let i = 0; i < 50; i++) {
		const q = ayahGen.next();
		expect(q.reference).toBe(quran.reference(q.shown, 'en'));
		const option = q.options[q.correctOption].replace(/…$/, '');
		expect(quran.text(q.shown.last + 1).startsWith(option)).toBe(true);
	}
});

test('arabicHelpers', () => {
	expect(digits(255)).toBe('٢٥٥');
	expect(ayahMarker(7)).toBe('﴿٧﴾');
	expect(firstWords('أ ب ج د', 2)).toBe('أ ب …');
	const labels = distinctPrefixes(['a b c d e', 'a b c x y', 'q'], 2);
	expect(new Set(labels).size).toBe(3);
});

test('weakestSurahsOrdering', () => {
	const ranked = weakestFirst(
		new Map([
			[0, sc(5, 0)],
			[1, sc(1, 1)],
			[2, sc(2, 2)],
			[3, sc(0, 3)]
		])
	);
	expect(ranked.map((r) => r.surahIndex)).toEqual([3, 2, 1]);
	expect(ranked[1].score).toEqual(sc(2, 2));
});

test('weakestRankingSmoothsSmallSamples', () => {
	const ranked = weakestFirst(new Map([[0, sc(0, 1)], [1, sc(2, 8)]]));
	expect(ranked.map((r) => r.surahIndex)).toEqual([1, 0]);
});

test('surahTiers', () => {
	expect(tier(sc(59, 41))).toBe('weak');
	expect(tier(sc(60, 40))).toBe('fair');
	expect(tier(sc(89, 11))).toBe('fair');
	expect(tier(sc(9, 1))).toBe('strong');
	expect(tier(undefined)).toBe('none');
	expect(tier(sc(0, 0))).toBe('none');
});

test('strongestSurahsOrdering', () => {
	const scores = new Map([[0, sc(5, 0)], [1, sc(9, 1)], [2, sc(4, 0)], [3, sc(10, 0)]]);
	expect(strongestFirst(scores).map((r) => r.surahIndex)).toEqual([3, 0, 1]);
});

test('runAverageRoundsHalfUp', () => {
	expect(runAverage(0, 0)).toBe(0);
	expect(runAverage(2, 5)).toBe(3);
	expect(runAverage(3, 7)).toBe(2);
});

test('levelIdsResolveAndStayStable', () => {
	for (const style of STYLES) {
		for (const level of levelsForStyle(style, quran)) {
			expect(levelById(levelId(level), quran)).toEqual(level);
		}
	}
	const practice = surahPractice(1, quran);
	expect(levelId(practice)).toBe('ayah:2-2:practice');
	const resolved = levelById(levelId(practice), quran)!;
	expect(resolved.practice).toBe(true);
	expect(resolved.firstSurah).toBe(1);
	expect(levelById('surah:999-999', quran)).toBeNull();
	expect(levelId(levelsForStyle(NEXT_AYAH, quran)[23])).toBe('ayah:1-114:openings');
});

test('practiceRoundsStayInTheSurah', () => {
	const gen = new QuestionGenerator(quran, surahPractice(35, quran), 'ar');
	for (let i = 0; i < 30; i++) expect(gen.next().surahIndex).toBe(35);
});

test('practiceRoundsWorkForEverySurah', () => {
	for (let surah = 0; surah < 114; surah++) {
		const level = surahPractice(surah, quran);
		const n = level.questionsPerRound;
		const gen = new QuestionGenerator(quran, level, 'en', seededRng(surah));
		const questions = Array.from({ length: 3 * n }, () => gen.next());
		const prompts = questions.map((q) => q.shown.first);
		for (const q of questions) {
			expect(q.surahIndex).toBe(surah);
			expect(new Set(q.options).size).toBe(4);
		}
		expect(new Set(prompts.slice(0, n)).size).toBe(n);
		if (n > 1) {
			for (let i = 1; i < prompts.length; i++) expect(prompts[i]).not.toBe(prompts[i - 1]);
		}
		// More prompts than one round: any n consecutive draws are distinct.
		if (quran.surahs[surah].ayahCount - 1 > n) {
			for (let i = 0; i <= prompts.length - n; i++) {
				expect(new Set(prompts.slice(i, i + n)).size).toBe(n);
			}
		}
	}
});

test('masteryScalesWithRoundLength', () => {
	expect(masteryFor(NEXT_AYAH, 10)).toBe(9);
	expect(masteryFor(NEXT_AYAH, 2)).toBe(2);
	expect(masteryFor(GUESS_SURAH, 20)).toBe(16);
	expect(surahPractice(107, quran).questionsPerRound).toBe(2);
	expect(surahPractice(1, quran).questionsPerRound).toBe(10);
});

test('gameOverRules', () => {
	expect(MODES.map((m) => m.key)).toEqual(['regular', 'survival', 'lives', 'hafiz']);
	expect(isOver(mode('regular'), 20, 0, 20)).toBe(true);
	expect(isOver(mode('regular'), 19, 5, 20)).toBe(false);
	expect(isOver(mode('survival'), 50, 1, 20)).toBe(true);
	expect(isOver(mode('survival'), 50, 0, 20)).toBe(false);
	expect(isOver(mode('lives'), 7, 2, 20)).toBe(false);
	expect(isOver(mode('lives'), 7, 3, 20)).toBe(true);
});
