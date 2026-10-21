import type { Quran } from './quran.ts';

/** An ayah resembling another; strength 0–100 is the share of words the two have in common. */
export interface SimilarAyah {
	ayah: number;
	strength: number;
}

/** Pairs of ayahs that closely resemble each other (Aswaatul Qurraa). Ayahs are global indices. */
export class Mutashabihat {
	private constructor(private readonly similar: readonly (readonly SimilarAyah[])[]) {}

	/** Ayahs resembling `ayah`, most similar first (stable for ties); empty when it has none. */
	of(ayah: number): readonly SimilarAyah[] {
		return this.similar[ayah];
	}

	/** Pairs are [surah1, ayah1, surah2, ayah2, strength], all 1-based. */
	static fromPairs(pairs: readonly (readonly number[])[], quran: Quran): Mutashabihat {
		const lists: SimilarAyah[][] = Array.from({ length: quran.ayahCount }, () => []);

		const ayahAt = (surah: number, ayah: number, n: number): number => {
			const ok =
				Number.isInteger(surah) &&
				Number.isInteger(ayah) &&
				surah >= 1 &&
				surah <= quran.surahs.length &&
				ayah >= 1 &&
				ayah <= quran.surahs[surah - 1].ayahCount;
			if (!ok) throw new Error(`mutashabihat pair ${n}: no ayah ${surah}:${ayah}`);
			return quran.surahs[surah - 1].firstAyah + ayah - 1;
		};

		pairs.forEach((p, i) => {
			const n = i + 1;
			if (p.length !== 5) throw new Error(`mutashabihat pair ${n}: ${p.join(',')}`);
			const a = ayahAt(p[0], p[1], n);
			const b = ayahAt(p[2], p[3], n);
			if (a === b) throw new Error(`mutashabihat pair ${n}: self-pair ${p.join(',')}`);
			const strength = p[4];
			if (!Number.isInteger(strength) || strength < 0 || strength > 100) {
				throw new Error(`mutashabihat pair ${n}: bad strength ${strength}`);
			}
			lists[a].push({ ayah: b, strength });
			lists[b].push({ ayah: a, strength });
		});
		for (const l of lists) l.sort((x, y) => y.strength - x.strength);
		return new Mutashabihat(lists);
	}
}
