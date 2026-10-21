import type { Language } from '#lib/domain/language.ts';
import { ar, en, type Strings } from '#lib/i18n/strings.ts';
import { readSettings, writeSettings, type Settings } from '#lib/settings-io.ts';

export const settings: Settings = $state(readSettings());

function persist(): void {
	try {
		writeSettings($state.snapshot(settings));
	} catch (e) {
		console.warn('itqan: settings not saved', e);
	}
}

export function setLanguage(language: Language): void {
	settings.language = language;
	persist();
}

export function setReciter(folder: string): void {
	settings.reciter = folder;
	persist();
}

export function setAutoPlay(enabled: boolean): void {
	settings.autoPlay = enabled;
	persist();
}

/** Read inside templates / `$derived` so it stays reactive. */
export function strings(): Strings {
	return settings.language === 'en' ? en : ar;
}
