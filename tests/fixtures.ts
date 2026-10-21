import mutJson from '../src/lib/data/mutashabihat.json';
import quranJson from '../src/lib/data/quran.json';
import { Mutashabihat } from '../src/lib/domain/mutashabihat.ts';
import { Quran, type QuranJson } from '../src/lib/domain/quran.ts';

export const quran = Quran.fromJson(quranJson as QuranJson);
export const mutashabihat = Mutashabihat.fromPairs(mutJson.pairs, quran);
