import { expect, test } from 'bun:test';
import { percent, strongestFirst, weakestFirst } from '../src/lib/domain/stats.ts';

test('strongestRequiresStrongAccuracy', () => {
	expect(strongestFirst(new Map([[0, { correct: 1, wrong: 9 }]]))).toEqual([]);
});

test('reviewListSkipsStrongSurahsAndIsCapped', () => {
	expect(weakestFirst(new Map([[0, { correct: 199, wrong: 1 }]]))).toEqual([]);
	const many = new Map(Array.from({ length: 15 }, (_, i) => [i, { correct: 1, wrong: 1 }] as const));
	expect(weakestFirst(many).length).toBe(10);
});

test('percentIsExact', () => {
	expect(percent({ correct: 29, wrong: 71 })).toBe(29);
	expect(percent({ correct: 29, wrong: 21 })).toBe(58);
	expect(percent({ correct: 57, wrong: 43 })).toBe(57);
	expect(percent({ correct: 0, wrong: 0 })).toBe(0);
});
