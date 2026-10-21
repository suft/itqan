import { expect, test } from 'bun:test';
import { firstWords } from '../src/lib/domain/arabic-text.ts';

// U+06DA and U+06D6 are small waqf (pause) signs; they are written between words but are not words.
const jim = '\u06DA';
const sad = '\u06D6';

test('firstWordsSkipsPauseMarks', () => {
	expect(firstWords(`أ ${jim} ب ${sad} ج د`, 2)).toBe(`أ ${jim} ب …`);
	expect(firstWords(`أ ${jim} ب`, 2)).toBe(`أ ${jim} ب`);
});
