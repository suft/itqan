// Converts the Tanzil XML and the mutashabihat text file into committed JSON.
// Usage: bun tools/convert-data.ts [sourceDir]   (default ../ayahiq/app/src/main/assets)
import { resolve } from 'node:path';

const SURAH_COUNT = 114;
const AYAH_COUNT = 6236;
const SOURCE = 'Tanzil Quran Text (Simple, version 1.0.2), https://tanzil.net';

const srcDir = resolve(process.argv[2] ?? '../ayahiq/app/src/main/assets');
const outDir = resolve(import.meta.dir, '../src/lib/data');

const ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'"
};

function decode(s: string): string {
	return s.replace(/&([^;\s]*);/g, (m, name: string) => {
		const v = ENTITIES[name];
		if (v === undefined) throw new Error(`unsupported entity ${m}`);
		return v;
	});
}

interface SurahOut {
	name: string;
	ayahs: string[];
}

function parseQuran(xml: string): { copyright: string; surahs: SurahOut[] } {
	const comment = /<!--([\s\S]*?)-->/.exec(xml);
	if (!comment) throw new Error('copyright comment not found');
	const copyright = comment[1].trim();
	const body = xml.replace(/<!--[\s\S]*?-->/g, '');

	const surahs: SurahOut[] = [];
	const tag = /<(sura|aya)\b([^>]*?)\/?>/g;
	for (let m = tag.exec(body); m; m = tag.exec(body)) {
		const attrs: Record<string, string> = {};
		const attr = /([\w-]+)="([^"]*)"/g;
		for (let a = attr.exec(m[2]); a; a = attr.exec(m[2])) attrs[a[1]] = decode(a[2]);
		const index = Number(attrs.index);
		if (m[1] === 'sura') {
			if (index !== surahs.length + 1) throw new Error(`sura index ${attrs.index} out of order`);
			if (attrs.name === undefined) throw new Error(`sura ${index} has no name`);
			surahs.push({ name: attrs.name, ayahs: [] });
		} else {
			const cur = surahs[surahs.length - 1];
			if (!cur) throw new Error('aya before any sura');
			if (index !== cur.ayahs.length + 1)
				throw new Error(`aya index ${attrs.index} out of order in sura ${surahs.length}`);
			if (attrs.text === undefined) throw new Error(`aya ${surahs.length}:${index} has no text`);
			cur.ayahs.push(attrs.text);
		}
	}
	const ayahs = surahs.reduce((n, s) => n + s.ayahs.length, 0);
	if (surahs.length !== SURAH_COUNT) throw new Error(`expected 114 surahs, found ${surahs.length}`);
	if (ayahs !== AYAH_COUNT) throw new Error(`expected ${AYAH_COUNT} ayahs, found ${ayahs}`);
	return { copyright, surahs };
}

function parseMutashabihat(text: string, surahs: SurahOut[]) {
	const notice: string[] = [];
	const pairs: number[][] = [];

	function ref(r: string, n: number): [number, number] {
		const [s, a, ...rest] = r.split(':');
		const surah = /^\d+$/.test(s ?? '') ? Number(s) : NaN;
		const ayah = /^\d+$/.test(a ?? '') ? Number(a) : NaN;
		if (
			rest.length > 0 ||
			!(surah >= 1 && surah <= SURAH_COUNT) ||
			!(ayah >= 1 && ayah <= surahs[surah - 1].ayahs.length)
		)
			throw new Error(`mutashabihat line ${n}: no ayah ${r}`);
		return [surah, ayah];
	}

	text.split(/\r?\n/).forEach((raw, i) => {
		const line = raw.trim();
		const n = i + 1;
		if (line === '') return;
		if (line.startsWith('#')) {
			notice.push(line.replace(/^#\s?/, ''));
			return;
		}
		const parts = line.split(/\s+/);
		if (parts.length !== 3) throw new Error(`mutashabihat line ${n}: ${line}`);
		const [s1, a1] = ref(parts[0], n);
		const [s2, a2] = ref(parts[1], n);
		if (s1 === s2 && a1 === a2) throw new Error(`mutashabihat line ${n}: self-pair ${line}`);
		const strength = /^-?\d+$/.test(parts[2]) ? Number(parts[2]) : NaN;
		if (!(strength >= 0 && strength <= 100)) throw new Error(`mutashabihat line ${n}: ${line}`);
		pairs.push([s1, a1, s2, a2, strength]);
	});
	return { notice, pairs };
}

const quranXml = await Bun.file(`${srcDir}/quran_simple.xml`).text();
const mutText = await Bun.file(`${srcDir}/mutashabihat.txt`).text();

const quran = parseQuran(quranXml);
await Bun.write(
	`${outDir}/quran.json`,
	JSON.stringify({ source: SOURCE, copyright: quran.copyright, surahs: quran.surahs }) + '\n'
);
const ayahTotal = quran.surahs.reduce((n, s) => n + s.ayahs.length, 0);
console.log(`quran.json: ${quran.surahs.length} surahs, ${ayahTotal} ayahs`);

const mut = parseMutashabihat(mutText, quran.surahs);
await Bun.write(`${outDir}/mutashabihat.json`, JSON.stringify(mut) + '\n');
console.log(`mutashabihat.json: ${mut.pairs.length} pairs`);
