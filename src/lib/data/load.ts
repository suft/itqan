import { Mutashabihat } from '../domain/mutashabihat.ts';
import { Quran, type QuranJson } from '../domain/quran.ts';

let quranPromise: Promise<Quran> | null = null;
let mutashabihatPromise: Promise<Mutashabihat> | null = null;

export function loadQuran(): Promise<Quran> {
	quranPromise ??= import('./quran.json').then((m) => Quran.fromJson(m.default as QuranJson));
	quranPromise.catch(() => (quranPromise = null));
	return quranPromise;
}

export function loadMutashabihat(quran: Quran): Promise<Mutashabihat> {
	mutashabihatPromise ??= import('./mutashabihat.json').then((m) =>
		Mutashabihat.fromPairs(m.default.pairs, quran)
	);
	mutashabihatPromise.catch(() => (mutashabihatPromise = null));
	return mutashabihatPromise;
}
