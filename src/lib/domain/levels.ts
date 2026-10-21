import type { Language } from './language.ts';
import { SURAH_COUNT, surahName, type Quran } from './quran.ts';

export type StyleKey = 'surah' | 'ayah';

/** The two quiz types of the original app. */
export interface GameStyle {
	key: StyleKey;
	questionsPerRound: number;
	/** Score needed for a level to count as "mastered". */
	masteryScore: number;
}

/** Show an ayah, guess which surah it belongs to. */
export const GUESS_SURAH: GameStyle = { key: 'surah', questionsPerRound: 20, masteryScore: 16 };
/** Show an ayah (with its surah), pick the ayah that follows it. */
export const NEXT_AYAH: GameStyle = { key: 'ayah', questionsPerRound: 10, masteryScore: 9 };
export const STYLES: readonly GameStyle[] = [GUESS_SURAH, NEXT_AYAH];

/** Mastery threshold for a round of `total` questions (same ratio as masteryScore, rounded up). */
export function masteryFor(style: GameStyle, total: number): number {
	return Math.floor((style.masteryScore * total + style.questionsPerRound - 1) / style.questionsPerRound);
}

/** A playable level: a contiguous range of surahs (0-based, inclusive). */
export interface Level {
	style: GameStyle;
	index: number;
	arabicName: string;
	englishName: string;
	firstSurah: number;
	lastSurah: number;
	/** "فواتح السور": questions use the first two ayahs of a random surah. */
	openings: boolean;
	/** Single-surah review round started from Statistics; never stores a best score. */
	practice: boolean;
	questionsPerRound: number;
}

/** Stable key used to persist the best score (independent of list order). */
export function levelId(level: Level): string {
	return (
		`${level.style.key}:${level.firstSurah + 1}-${level.lastSurah + 1}` +
		(level.openings ? ':openings' : '') +
		(level.practice ? ':practice' : '')
	);
}

export function levelName(level: Level, lang: Language): string {
	return lang === 'en' ? level.englishName : level.arabicName;
}

export function levelMastery(level: Level): number {
	return masteryFor(level.style, level.questionsPerRound);
}

interface Spec {
	first: number;
	last: number;
	openings?: boolean;
	arabicName?: string;
	englishName?: string;
}

const s = (first: number, last: number, arabicName?: string, englishName?: string): Spec => ({
	first,
	last,
	arabicName,
	englishName
});
const plain = (first: number, last: number): Spec => ({ first, last });

const GUESS_SURAH_SPECS: Spec[] = [
	s(100, 114, 'العاديات حتى الناس'),
	s(90, 114, 'البلد حتى الناس'),
	s(78, 89, 'النبأ حتى الفجر'),
	s(78, 114, 'جزء عمَّ'),
	s(67, 77, 'جزء تبارك'),
	s(67, 114, 'جزءا تبارك وعمَّ معاً'),
	s(58, 66, 'جزء قد سمع (المجادلة حتى التحريم)', "Juz' Qad Sami' (Al-Mujadila to At-Tahrim)"),
	s(51, 57, 'جزء الذاريات (الذاريات حتى الحديد)', "Juz' Adh-Dhariyat (Adh-Dhariyat to Al-Hadid)"),
	s(43, 50, 'الزخرف حتى ق'),
	s(36, 42, 'يس حتى الشورى'),
	s(36, 114, 'ربع يس (يس حتى الناس)', 'Last quarter from Ya-Sin (Ya-Sin to An-Nas)'),
	s(30, 35, 'الروم حتى فاطر'),
	s(24, 29, 'النور حتى العنكبوت'),
	s(18, 23, 'الكهف حتى المؤمنون'),
	s(18, 114, 'نصف القرآن (الكهف حتى الناس)', 'Second half of the Quran (Al-Kahf to An-Nas)'),
	s(12, 17, 'يوسف حتى الإسراء'),
	s(7, 11, 'الأعراف حتى هود'),
	s(2, 6, 'البقرة حتى الأنعام'),
	s(1, 114, 'المصحف كاملاً'),
	{ first: 1, last: 114, openings: true, arabicName: 'فواتح السور' }
];

const NEXT_AYAH_SPECS: Spec[] = [
	plain(100, 114), plain(90, 99), plain(83, 89), plain(81, 82), plain(78, 80),
	plain(73, 77), plain(67, 72), plain(67, 77), plain(67, 114), plain(58, 66),
	plain(51, 57), plain(44, 50), plain(37, 43), plain(36, 36), plain(29, 35),
	plain(22, 28), plain(17, 21), plain(18, 18), plain(13, 16), plain(12, 12),
	plain(6, 11), plain(2, 5), plain(2, 2), { first: 1, last: 114, openings: true }, plain(1, 114)
];

/** Same naming rules as the original "complete the ayah" levels. */
function autoName(spec: Spec, quran: Quran, lang: Language): string {
	const n = (number: number) => surahName(quran.surahs[number - 1], lang);
	const { first, last } = spec;
	if (lang === 'en') {
		if (spec.openings) return 'Surah Openings';
		if (first === 1 && last === 114) return 'The Whole Quran';
		if (first === 78 && last === 114) return "Juz' 'Amma";
		if (first === 67 && last === 77) return "Juz' Tabarak";
		if (first === 67 && last === 114) return "Juz' Tabarak and Juz' 'Amma";
		if (first === last) return `Surah ${n(first)}`;
		if (first + 1 === last) return `Surahs ${n(first)} and ${n(last)}`;
		return `${n(first)} to ${n(last)}`;
	}
	if (spec.openings) return 'فواتح السور';
	if (first === 1 && last === 114) return 'المصحف كاملاً';
	if (first === 78 && last === 114) return 'جزء عمَّ';
	if (first === 67 && last === 77) return 'جزء تبارك';
	if (first === 67 && last === 114) return 'جزءا تبارك وعمَّ';
	if (first === last) return `سورة ${n(first)}`;
	if (first + 1 === last) return `سورتا ${n(first)} و${n(last)}`;
	return `${n(first)} حتى ${n(last)}`;
}

const cache = new Map<StyleKey, readonly Level[]>();

export function levelsForStyle(style: GameStyle, quran: Quran): readonly Level[] {
	const hit = cache.get(style.key);
	if (hit) return hit;
	const specs = style === GUESS_SURAH ? GUESS_SURAH_SPECS : NEXT_AYAH_SPECS;
	const levels = specs.map(
		(sp, index): Level => ({
			style,
			index,
			arabicName: sp.arabicName ?? autoName(sp, quran, 'ar'),
			englishName: sp.englishName ?? autoName(sp, quran, 'en'),
			firstSurah: sp.first - 1,
			lastSurah: sp.last - 1,
			openings: sp.openings ?? false,
			practice: false,
			questionsPerRound: style.questionsPerRound
		})
	);
	cache.set(style.key, levels);
	return levels;
}

/** Next-ayah round limited to one surah, started from the statistics screen. */
export function surahPractice(surahIndex: number, quran: Quran): Level {
	const surah = quran.surahs[surahIndex];
	return {
		style: NEXT_AYAH,
		index: -1, // not part of a level table
		arabicName: `مراجعة سورة ${surahName(surah, 'ar')}`,
		englishName: `Review: Surah ${surahName(surah, 'en')}`,
		firstSurah: surahIndex,
		lastSurah: surahIndex,
		openings: false,
		practice: true,
		questionsPerRound: Math.min(NEXT_AYAH.questionsPerRound, surah.ayahCount - 1)
	};
}

/** Resolves a stored level id; null for ids that no longer exist. */
export function levelById(id: string, quran: Quran): Level | null {
	if (id.endsWith(':practice')) {
		const m = /^[^:]*:(\d+)-/.exec(id);
		if (!m) return null;
		const surah = Number(m[1]) - 1;
		return surah >= 0 && surah < SURAH_COUNT ? surahPractice(surah, quran) : null;
	}
	for (const style of STYLES) {
		const found = levelsForStyle(style, quran).find((l) => levelId(l) === id);
		if (found) return found;
	}
	return null;
}
