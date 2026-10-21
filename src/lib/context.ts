import { getContext } from 'svelte';
import type { Quran } from '#lib/domain/quran.ts';

export function getQuran(): Quran {
	return getContext<Quran>('quran');
}
