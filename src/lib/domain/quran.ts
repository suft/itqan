import { equalityKey } from './arabic-text.ts';
import { formatNumber, type Language } from './language.ts';
import { SURAH_NAMES_EN } from './surah-names.ts';

/** Inclusive range of global 0-based ayah indices. */
export interface AyahRange {
	first: number;
	last: number;
}

export interface QuranJson {
	source: string;
	copyright: string;
	surahs: { name: string; ayahs: string[] }[];
}

export const SURAH_COUNT = 114;
export const AYAH_COUNT = 6236;

export interface Surah {
	/** 0-based position (Al-Fatiha = 0). */
	index: number;
	name: string;
	/** Global 0-based index of its first ayah. */
	firstAyah: number;
	ayahCount: number;
	/** 1-based surah number. */
	number: number;
	lastAyah: number;
}

export function surahName(surah: Surah, lang: Language): string {
	return lang === 'en' ? SURAH_NAMES_EN[surah.index] : surah.name;
}

/** Immutable, fully indexed Quran text. Ayahs are addressed by a global 0-based index. */
export class Quran {
	readonly surahs: readonly Surah[];
	readonly ayahCount: number;
	private readonly texts: readonly string[];
	private readonly surahOfAyah: readonly number[];
	private readonly keys: readonly string[];
	private readonly keyIndex: Map<string, number[]>;

	constructor(data: readonly { name: string; ayahs: readonly string[] }[]) {
		const texts: string[] = [];
		const owner: number[] = [];
		const surahs: Surah[] = [];
		data.forEach((s, i) => {
			if (s.ayahs.length === 0) throw new Error(`Surah ${i + 1} has no ayahs`);
			const first = texts.length;
			for (const a of s.ayahs) {
				texts.push(a);
				owner.push(i);
			}
			surahs.push({
				index: i,
				name: s.name,
				firstAyah: first,
				ayahCount: s.ayahs.length,
				number: i + 1,
				lastAyah: first + s.ayahs.length - 1
			});
		});
		this.surahs = surahs;
		this.texts = texts;
		this.surahOfAyah = owner;
		this.ayahCount = texts.length;
		this.keys = texts.map(equalityKey);
		const index = new Map<string, number[]>();
		this.keys.forEach((k, i) => {
			const list = index.get(k);
			if (list) list.push(i);
			else index.set(k, [i]);
		});
		this.keyIndex = index;
	}

	static fromJson(json: QuranJson): Quran {
		const q = new Quran(json.surahs);
		if (q.surahs.length !== SURAH_COUNT || q.ayahCount !== AYAH_COUNT) {
			throw new Error(`Unexpected Quran data: ${q.surahs.length} surahs, ${q.ayahCount} ayahs`);
		}
		return q;
	}

	text(ayah: number): string {
		return this.texts[ayah];
	}

	surahOf(ayah: number): Surah {
		return this.surahs[this.surahOfAyah[ayah]];
	}

	/** 1-based ayah number inside its surah. */
	ayahNumberInSurah(ayah: number): number {
		return ayah - this.surahOf(ayah).firstAyah + 1;
	}

	/** "سورة البقرة · الآية ٢٥٥" / "Surah Al-Baqarah · Ayah 255"; multi-ayah ranges use an en dash. */
	reference(range: AyahRange, lang: Language): string {
		const name = surahName(this.surahOf(range.first), lang);
		const first = formatNumber(lang, this.ayahNumberInSurah(range.first));
		const last = formatNumber(lang, this.ayahNumberInSurah(range.last));
		const single = range.first === range.last;
		return lang === 'ar'
			? `سورة ${name} · ` + (single ? `الآية ${first}` : `الآيات ${first}–${last}`)
			: `Surah ${name} · ` + (single ? `Ayah ${first}` : `Ayahs ${first}–${last}`);
	}

	isLastOfSurah(ayah: number): boolean {
		return this.surahOf(ayah).lastAyah === ayah;
	}

	/** equalityKey of an ayah: its text apart from pause marks. */
	key(ayah: number): string {
		return this.keys[ayah];
	}

	/** Every global index whose text equals that of `ayah` apart from pause marks (including itself). */
	occurrencesOf(ayah: number): readonly number[] {
		return this.keyIndex.get(this.keys[ayah]) ?? [];
	}

	/**
	 * Indices of the surahs that contain the consecutive ayahs of `shown` (same order, inside one surah,
	 * equal apart from pause marks).
	 */
	surahsContaining(shown: AyahRange): Set<number> {
		const wanted: string[] = [];
		for (let g = shown.first; g <= shown.last; g++) wanted.push(this.keys[g]);
		const result = new Set<number>();
		for (const start of this.occurrencesOf(shown.first)) {
			const surah = this.surahOf(start);
			let ok = true;
			for (let k = 0; k < wanted.length; k++) {
				const g = start + k;
				if (g > surah.lastAyah || this.keys[g] !== wanted[k]) {
					ok = false;
					break;
				}
			}
			if (ok) result.add(this.surahOfAyah[start]);
		}
		return result;
	}
}
