import { RECITERS } from './audio/reciters.ts';
import type { Language } from './domain/language.ts';

export interface Settings {
	language: Language;
	reciter: string;
	autoPlay: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
	language: 'ar',
	reciter: RECITERS[0].folder,
	autoPlay: true
};

const KEY = 'itqan.settings';

export function readSettings(): Settings {
	const result: Settings = { ...DEFAULT_SETTINGS };
	try {
		const raw: unknown = JSON.parse(globalThis.localStorage.getItem(KEY) ?? 'null');
		if (typeof raw !== 'object' || raw === null) return result;
		const o = raw as Record<string, unknown>;
		if (o.language === 'ar' || o.language === 'en') result.language = o.language;
		if (typeof o.reciter === 'string' && RECITERS.some((r) => r.folder === o.reciter)) {
			result.reciter = o.reciter;
		}
		if (typeof o.autoPlay === 'boolean') result.autoPlay = o.autoPlay;
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
	return result;
}

export function writeSettings(s: Settings): void {
	globalThis.localStorage.setItem(KEY, JSON.stringify(s));
}
