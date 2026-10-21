import { afterEach, describe, expect, test } from 'bun:test';
import { DEFAULT_SETTINGS, readSettings, writeSettings } from '../src/lib/settings-io.ts';

const KEY = 'itqan.settings';

function stubStorage(initial?: string): Map<string, string> {
	const data = new Map<string, string>();
	if (initial !== undefined) data.set(KEY, initial);
	Object.defineProperty(globalThis, 'localStorage', {
		configurable: true,
		value: {
			getItem: (k: string) => data.get(k) ?? null,
			setItem: (k: string, v: string) => void data.set(k, v)
		}
	});
	return data;
}

afterEach(() => {
	Reflect.deleteProperty(globalThis, 'localStorage');
});

describe('settings', () => {
	test('missing storage gives defaults', () => {
		expect(readSettings()).toEqual(DEFAULT_SETTINGS);
	});

	test('invalid JSON gives defaults', () => {
		stubStorage('{not json');
		expect(readSettings()).toEqual(DEFAULT_SETTINGS);
	});

	test('invalid fields fall back independently', () => {
		stubStorage(JSON.stringify({ language: 'fr', reciter: 'nope', autoPlay: 'x' }));
		expect(readSettings()).toEqual(DEFAULT_SETTINGS);
		stubStorage(JSON.stringify({ language: 'en', reciter: 'nope', autoPlay: false }));
		expect(readSettings()).toEqual({ ...DEFAULT_SETTINGS, language: 'en', autoPlay: false });
	});

	test('valid object round-trips', () => {
		stubStorage();
		const s = { language: 'en' as const, reciter: 'Alafasy_64kbps', autoPlay: false };
		writeSettings(s);
		expect(readSettings()).toEqual(s);
	});
});
