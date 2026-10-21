import { expect, test } from 'bun:test';
import { GUESS_SURAH, NEXT_AYAH, STYLES, levelsForStyle, type Level } from '../src/lib/domain/levels.ts';
import { QuestionGenerator } from '../src/lib/domain/question-generator.ts';
import type { AyahRange } from '../src/lib/domain/quran.ts';
import { seededRng } from '../src/lib/domain/random.ts';
import { mutashabihat, quran } from './fixtures.ts';

/** Walks every prompt a level can deal (not a random sample). Text comparison ignores pause marks. */
const norm = (s: string) =>
	s.replace(/[\u06D6-\u06ED]/g, ' ').trim().split(/[ \t\n\v\f\r]+/).join(' ');
const normalised = Array.from({ length: quran.ayahCount }, (_, i) => norm(quran.text(i)));

const generator = (level: Level, hafiz: boolean, seed = level.index) =>
	new QuestionGenerator(quran, level, 'ar', seededRng(seed), hafiz ? mutashabihat : null);

const ayah = (surah: number, number: number) => quran.surahs[surah - 1].firstAyah + number - 1;
const one = (g: number): AyahRange => ({ first: g, last: g });
const len = (r: AyahRange) => r.last - r.first + 1;

test('waqfVariantsAreTheSameAyah', () => {
	expect(quran.surahsContaining(one(ayah(2, 162))).has(2)).toBe(true);
	expect(quran.surahsContaining(one(ayah(11, 110))).has(40)).toBe(true);
	expect(quran.surahsContaining(one(ayah(16, 55))).has(29)).toBe(true);
});

test('everyGuessSurahPromptIsUnambiguous', () => {
	for (const level of levelsForStyle(GUESS_SURAH, quran)) {
		for (const hafiz of [false, true]) {
			const gen = generator(level, hafiz);
			for (const p of gen.promptPool) {
				const q = gen.questionFor(p);
				const where = `${level.arabicName} hafiz=${hafiz} ${quran.reference(p, 'en')}`;
				expect(new Set(q.options).size, where).toBe(4);
				expect(q.options[q.correctOption], where).toBe(quran.surahOf(p.first).name);
				const prompt: string[] = [];
				for (let g = p.first; g <= p.last; g++) prompt.push(normalised[g]);
				q.options.forEach((name, i) => {
					if (i === q.correctOption) return;
					const other = quran.surahs.find((s) => s.name === name)!;
					let holds = false;
					for (let start = other.firstAyah; start <= other.lastAyah - len(p) + 1 && !holds; start++) {
						holds = prompt.every((t, k) => normalised[start + k] === t);
					}
					expect(holds, `${where}: «${name}» also contains the prompt`).toBe(false);
				});
			}
		}
	}
});

test('everyNextAyahPromptIsUnambiguous', () => {
	// normalised ayah -> normalised texts of every ayah that follows an identical ayah.
	const followers = new Map<string, string[]>();
	for (let g = 0; g < quran.ayahCount; g++) {
		if (quran.isLastOfSurah(g)) continue;
		const list = followers.get(normalised[g]);
		if (list) list.push(normalised[g + 1]);
		else followers.set(normalised[g], [normalised[g + 1]]);
	}
	for (const level of levelsForStyle(NEXT_AYAH, quran)) {
		for (const hafiz of [false, true]) {
			const gen = generator(level, hafiz);
			for (const p of gen.promptPool) {
				const q = gen.questionFor(p);
				const where = `${level.arabicName} hafiz=${hafiz} ${quran.reference(p, 'en')}`;
				const answer = p.last + 1;
				expect(quran.surahOf(p.first), where).toBe(quran.surahOf(answer));
				const labels = q.options.map((o) => norm(o.replace(/…$/, '')));
				expect(new Set(q.options.map(norm)).size, `${where}: labels not distinct`).toBe(4);
				expect(normalised[answer].startsWith(labels[q.correctOption]), where).toBe(true);
				const valid = followers.get(normalised[p.last])!;
				q.options.forEach((option, i) => {
					if (i === q.correctOption) return;
					const truncated = option.endsWith('…');
					const bad = valid.some((v) => v === labels[i] || (truncated && v.startsWith(labels[i])));
					expect(bad, `${where}: «${option}» is also a valid next ayah`).toBe(false);
				});
			}
		}
	}
});

test('hafizPromptsAllHaveTraps', () => {
	for (const style of STYLES) {
		for (const level of levelsForStyle(style, quran)) {
			const gen = generator(level, true);
			for (const p of gen.promptPool) {
				const q = gen.questionFor(p);
				const wrong = q.options.filter((_, i) => i !== q.correctOption);
				let hasTrap: boolean;
				if (style === GUESS_SURAH) {
					const trapNames = new Set<string>();
					for (let g = p.first; g <= p.last; g++) {
						for (const s of mutashabihat.of(g)) trapNames.add(quran.surahOf(s.ayah).name);
					}
					hasTrap = wrong.some((w) => trapNames.has(w));
				} else {
					const candidates = [
						...mutashabihat.of(p.last + 1).map((s) => s.ayah),
						...mutashabihat
							.of(p.last)
							.filter((s) => !quran.isLastOfSurah(s.ayah))
							.map((s) => s.ayah + 1)
					];
					hasTrap = wrong.some((label) => {
						const prefix = norm(label.replace(/…$/, ''));
						return candidates.some((c) => normalised[c].startsWith(prefix));
					});
				}
				expect(hasTrap, `${style.key} «${level.arabicName}» ${quran.reference(p, 'en')}: no trap option`).toBe(true);
			}
		}
	}
});

test('bismillahIsNeverAGuessSurahPrompt', () => {
	for (const level of levelsForStyle(GUESS_SURAH, quran).filter((l) => !l.openings)) {
		for (const hafiz of [false, true]) {
			const pool = generator(level, hafiz).promptPool;
			expect(pool.some((p) => p.first === 0 && p.last === 0), `${level.arabicName} hafiz=${hafiz}`).toBe(false);
		}
	}
});

test('sajdahSignIsNotAnAnswerCue', () => {
	const gen = generator(levelsForStyle(NEXT_AYAH, quran)[24], false);
	const sajdah: number[] = [];
	for (let g = 0; g < quran.ayahCount; g++) {
		if (quran.text(g).includes('\u06E9') && quran.ayahNumberInSurah(g) > 1) sajdah.push(g);
	}
	expect(sajdah.length).toBeGreaterThan(0);
	for (const s of sajdah) {
		const q = gen.questionFor(one(s - 1));
		for (const option of q.options) {
			expect(option.includes('\u06E9'), `${quran.reference(one(s), 'en')}: «${option}» carries ۩`).toBe(false);
		}
	}
});

test('promptsDoNotRepeatWithinTwentyQuestions', () => {
	const level = levelsForStyle(NEXT_AYAH, quran)[0];
	for (let seed = 0; seed < 50; seed++) {
		const gen = generator(level, true, seed);
		const prompts = Array.from({ length: 20 }, () => gen.next().shown.first);
		expect(new Set(prompts).size, `seed ${seed} repeats a prompt`).toBe(20);
	}
});

test('guessSurahAnswerIsNotTheCentreOfTheOptions', () => {
	const gen = generator(levelsForStyle(GUESS_SURAH, quran)[18], false, 3);
	let credit = 0;
	const rounds = 4000;
	for (let r = 0; r < rounds; r++) {
		const q = gen.next();
		const surahs = q.options.map((name) => quran.surahs.find((s) => s.name === name)!.index);
		const answer = surahs[q.correctOption];
		const mid = (Math.min(...surahs) + Math.max(...surahs)) / 2;
		const nearest = Math.min(...surahs.map((i) => Math.abs(i - mid)));
		const centre = surahs.filter((i) => Math.abs(i - mid) === nearest);
		if (centre.includes(answer)) credit += 1 / centre.length;
	}
	expect(credit / rounds).toBeLessThan(0.35);
});

test('everySurahHasMutashabihat', () => {
	const without = quran.surahs.filter((s) => {
		for (let g = s.firstAyah; g <= s.lastAyah; g++) if (mutashabihat.of(g).length > 0) return false;
		return true;
	});
	expect(without.map((s) => s.number)).toEqual([]);
});
