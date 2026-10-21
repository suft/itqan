import { digits } from './arabic-text.ts';

/** UI language. The Quran text itself is always Arabic. */
export type Language = 'ar' | 'en';

/** Arabic-Indic digits in Arabic, ASCII digits in English. */
export function formatNumber(lang: Language, n: number): string {
	return lang === 'ar' ? digits(n) : String(n);
}
