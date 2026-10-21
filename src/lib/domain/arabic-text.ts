const ARABIC_INDIC_ZERO = 0x0660;
const MARK_FIRST = 0x06d6;
const MARK_LAST = 0x06ed;
// Java's \s is ASCII-only.
const WHITESPACE = /[ \t\n\v\f\r]+/;
const WHITESPACE_G = /[ \t\n\v\f\r]+/g;

/** 123 -> "١٢٣" */
export function digits(value: number): string {
	return String(value).replace(/[0-9]/g, (c) => String.fromCharCode(ARABIC_INDIC_ZERO + Number(c)));
}

/** Ornate ayah-end marker with the ayah number, e.g. "﴿٥﴾". */
export function ayahMarker(n: number): string {
	return `﴿${digits(n)}﴾`;
}

export function words(text: string): string[] {
	return text.trim().split(WHITESPACE);
}

function isMarkChar(c: string): boolean {
	const code = c.charCodeAt(0);
	return code >= MARK_FIRST && code <= MARK_LAST;
}

/** Waqf (pause) signs, small marks and the sajdah sign: written between words but not words themselves. */
export function isMark(token: string): boolean {
	for (const c of token) if (!isMarkChar(c)) return false;
	return true;
}

/** Number of real words in text; pause marks do not count. */
export function wordCount(text: string): number {
	return words(text).filter((t) => !isMark(t)).length;
}

/** What makes two ayahs "the same" for the quiz: the text apart from pause marks. */
export function equalityKey(text: string): string {
	let out = '';
	for (const c of text) out += isMarkChar(c) ? ' ' : c;
	return out.trim().replace(WHITESPACE_G, ' ');
}

/** Text without the sajdah sign ۩, which would give the answer away. */
export function withoutSajdahSign(text: string): string {
	return words(text.replaceAll('\u06E9', ' ')).join(' ');
}

/** First `count` words (pause marks between them kept), followed by " …" when shortened. */
export function firstWords(text: string, count: number): string {
	const tokens = words(text);
	let taken = 0;
	let end = 0;
	for (let i = 0; i < tokens.length; i++) {
		if (isMark(tokens[i])) continue;
		if (taken === count) break;
		taken++;
		end = i + 1;
	}
	return tokens.slice(end).every(isMark) ? text.trim() : tokens.slice(0, end).join(' ') + ' …';
}

function removeEllipsis(s: string): string {
	return s.endsWith('…') ? s.slice(0, -1) : s;
}

/**
 * Shortens every text to at least `minWords` words, adding words where needed so that no two excerpts look
 * the same (unless the full texts are the same) and no shortened excerpt could pass for the start of one of
 * the `valid` texts (given as equalityKeys) that it is not.
 */
export function distinctPrefixes(
	texts: readonly string[],
	minWords: number,
	valid: ReadonlySet<string> = new Set()
): string[] {
	const counts = texts.map(() => minWords);
	const maxWords = Math.max(...texts.map(wordCount));
	const fullKeys = texts.map(equalityKey);
	for (;;) {
		const shown = texts.map((t, i) => firstWords(t, counts[i]));
		const stems = shown.map((s) => equalityKey(removeEllipsis(s)));
		const clashes: number[] = [];
		for (let i = 0; i < shown.length; i++) {
			const truncated = shown[i].endsWith('…');
			let clash = false;
			for (let j = 0; j < shown.length && !clash; j++) {
				if (j !== i && stems[j] === stems[i] && fullKeys[j] !== fullKeys[i]) clash = true;
			}
			if (!clash && truncated) {
				for (const v of valid) {
					if (v !== fullKeys[i] && v.startsWith(`${stems[i]} `)) {
						clash = true;
						break;
					}
				}
			}
			if (clash) clashes.push(i);
		}
		if (clashes.length === 0 || clashes.every((i) => counts[i] >= maxWords)) return shown;
		for (const i of clashes) counts[i] += 2;
	}
}
