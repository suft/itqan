import type { ModeKey } from '../domain/game-mode.ts';
import { formatNumber, type Language } from '../domain/language.ts';
import type { StyleKey } from '../domain/levels.ts';

/** Every piece of UI text that is not Quran text. Numbers always go through `number`. */
export interface Strings {
	readonly language: Language;
	/** Endonym: does not change with the UI language. Used as the accessible name of the language button. */
	readonly languageEndonym: string;
	/** Flag emoji shown on the language button and in the picker. */
	readonly languageFlag: string;

	number(value: number): string;
	percent(value: number): string;

	readonly appName: string;
	readonly back: string;
	readonly loadingQuran: string;
	readonly loadFailed: string;
	readonly tagline: string;
	styleTitle(style: StyleKey): string;
	styleSubtitle(style: StyleKey): string;
	gameModeTitle(mode: ModeKey): string;
	gameModeSubtitle(mode: ModeKey): string;
	readonly chooseStyle: string;
	readonly best: string;
	questionNumber(n: number): string;
	livesLeft(n: number): string;
	readonly gameOver: string;
	survivalResult(score: number): string;
	livesResult(score: number, answered: number): string;
	longestStreak(n: number): string;
	bestScore(n: number): string;
	gamesPlayed(n: number): string;
	averageScore(n: number): string;
	readonly noGamesYet: string;
	shareRunText(score: number, levelName: string, modeTitle: string, styleTitle: string): string;
	readonly mastered: string;
	readonly statistics: string;
	readonly statisticsHint: string;
	statisticsSummary(percent: number, total: number): string;
	readonly languageLabel: string;
	readonly credits: string;
	readonly creditsQuranText: string;
	readonly creditsRecitations: string;
	readonly creditsMutashabihat: string;
	readonly creditsTanzil: string;
	readonly creditsAswaatulQurraa: string;
	readonly creditsFonts: string;
	totalPoints(points: number): string;
	masteredCount(mastered: number, total: number): string;
	readonly start: string;
	readonly shareAyah: string;
	questionProgress(current: number, total: number): string;
	readonly next: string;
	points(score: number): string;
	readonly whichSurah: string;
	readonly whatIsNextAyah: string;
	readonly pause: string;
	readonly listen: string;
	readonly chooseReciter: string;
	readonly autoPlay: string;
	readonly correctAnswer: string;
	readonly wrongAnswer: string;
	readonly resultTitle: string;
	readonly perfectScore: string;
	readonly levelMastered: string;
	readonly keepReviewing: string;
	readonly needsReview: string;
	readonly surahReviewMastered: string;
	readonly surahNeedsReview: string;
	newRecord(previous: number): string;
	readonly shareResult: string;
	readonly retry: string;
	readonly mainMenu: string;
	shareScoreText(score: number, total: number, levelName: string, styleTitle: string): string;
	readonly playbackFailed: string;
	readonly playbackFailedAutoPlayOff: string;
	readonly clearStatistics: string;
	readonly clearStatisticsQuestion: string;
	readonly clearStatisticsBody: string;
	readonly clear: string;
	readonly cancel: string;
	readonly statisticsEmpty: string;
	readonly noMistakes: string;
	readonly surahsToReview: string;
	readonly accuracy: string;
	correctAnswers(n: number): string;
	wrongAnswers(n: number): string;
	rankedSurah(rank: number, name: string): string;
	surahCounts(correct: number, wrong: number): string;
	readonly tabOverview: string;
	readonly tabSurahs: string;
	readonly tabActivity: string;
	readonly noAnswersYet: string;
	readonly styleAccuracySinceUpdate: string;
	readonly surahMap: string;
	surahsPractised(n: number, total: number): string;
	readonly tierNotPractised: string;
	readonly tierWeak: string;
	readonly tierFair: string;
	readonly tierStrong: string;
	readonly strongestSurahs: string;
	readonly practice: string;
	readonly notPractisedYet: string;
	readonly currentStreak: string;
	readonly bestStreak: string;
	readonly questionsToday: string;
	readonly roundsCompleted: string;
	readonly currentRun: string;
	readonly bestRun: string;
	readonly scoreTrend: string;
	readonly recentRounds: string;
	readonly noRoundsYet: string;
	daysAgo(days: number): string;
	readonly frame: string;
	frameNumber(n: number): string;
	readonly font: string;
	readonly fontMushaf: string;
	readonly fontScheherazade: string;
	readonly shareImage: string;
	readonly shareFailed: string;
	readonly copied: string;
	questionsCount(n: number): string;
	surahCell(name: string, tier: string, percent: number | null): string;
	scoreTrendDescription(first: number, last: number): string;
	readonly notMastered: string;
	readonly levelsList: string;
}

export const ar: Strings = {
	language: 'ar',
	languageEndonym: 'العربية',
	languageFlag: '\u{1F1F8}\u{1F1E6}',

	number: (value) => formatNumber('ar', value),
	percent: (value) => `${ar.number(value)}٪`,

	appName: 'إتقان',
	back: 'رجوع',
	loadingQuran: 'جارٍ تحميل المصحف…',
	loadFailed: 'تعذّر تحميل المصحف',
	tagline: 'مسابقة لاختبار حفظك للقرآن الكريم',
	styleTitle: (style) => (style === 'surah' ? 'آية وسورة' : 'آيات'),
	styleSubtitle: (style) =>
		style === 'surah' ? 'اقرأ الآية واختر السورة التي وردت فيها' : 'أكمل التلاوة واختر الآية التالية',
	gameModeTitle: (mode) => {
		switch (mode) {
			case 'regular':
				return 'عادي';
			case 'survival':
				return 'البقاء';
			case 'lives':
				return 'ثلاث فرص';
			case 'hafiz':
				return 'حافظ';
		}
	},
	gameModeSubtitle: (mode) => {
		switch (mode) {
			case 'regular':
				return 'جولات محددة الأسئلة، أتقن كل مرحلة';
			case 'survival':
				return 'أسئلة بلا نهاية، وأول خطأ ينهي اللعبة';
			case 'lives':
				return 'أسئلة بلا نهاية، وثلاثة أخطاء تنهي اللعبة';
			case 'hafiz':
				return 'خيارات من الآيات المتشابهة، وثلاثة أخطاء تنهي اللعبة';
		}
	},

	chooseStyle: 'اختر نوع الأسئلة',
	best: 'الأفضل',
	questionNumber: (n) => `السؤال ${ar.number(n)}`,
	livesLeft: (n) => `الفرص المتبقية: ${ar.number(n)}`,
	gameOver: 'انتهت اللعبة',
	survivalResult: (score) => `إجابات صحيحة متتالية: ${ar.number(score)}`,
	livesResult: (score, answered) => `${ar.number(score)} صحيحة من ${ar.questionsCount(answered)}`,
	longestStreak: (n) => `أطول سلسلة صحيحة: ${ar.number(n)}`,
	bestScore: (n) => `أفضل نتيجة: ${ar.number(n)}`,
	gamesPlayed: (n) => `ألعاب مكتملة: ${ar.number(n)}`,
	averageScore: (n) => `متوسط النتيجة: ${ar.number(n)}`,
	noGamesYet: 'لم تلعب بعد',
	shareRunText: (score, levelName, modeTitle, styleTitle) =>
		`حصلت على ${ar.number(score)} في وضع «${modeTitle}» بمرحلة «${levelName}» في مسابقة القرآن الكريم «${ar.appName} – ${styleTitle}»`,

	mastered: 'مُتقَنة',
	statistics: 'إحصائيات',
	statisticsHint: 'تعرّف على السور التي تحتاج إلى مراجعة',
	statisticsSummary: (percent, total) =>
		`دقة إجاباتك ${ar.percent(percent)} في ${ar.questionsCount(total)}`,

	languageLabel: 'اللغة',
	credits: 'شكر وتقدير',
	creditsQuranText: 'نص القرآن الكريم',
	creditsRecitations: 'التلاوات',
	creditsMutashabihat: 'المتشابهات',
	creditsTanzil: 'مشروع تنزيل',
	creditsAswaatulQurraa: 'أصوات القرّاء',
	creditsFonts: 'الخطوط',
	totalPoints: (points) => `مجموع النقاط: ${ar.number(points)}`,
	masteredCount: (mastered, total) => `${ar.number(mastered)} من ${ar.number(total)} مُتقَنة`,
	start: 'ابدأ',
	shareAyah: 'انشر الآية',
	questionProgress: (current, total) => `السؤال ${ar.number(current)} من ${ar.number(total)}`,
	next: 'التالي',
	points: (score) => `النقاط ${ar.number(score)}`,
	whichSurah: 'من أي سورة هذه الآية؟',
	whatIsNextAyah: 'ما الآية التالية؟',
	pause: 'إيقاف مؤقت',
	listen: 'استمع',
	chooseReciter: 'اختر القارئ',
	autoPlay: 'تلقائي',
	correctAnswer: 'إجابة صحيحة',
	wrongAnswer: 'إجابة خاطئة',
	resultTitle: 'النتيجة',
	perfectScore: 'ما شاء الله! علامة كاملة',
	levelMastered: 'أحسنت! لقد أتقنت هذه المرحلة',
	keepReviewing: 'جيد، واصل المراجعة لتتقنها',
	needsReview: 'هذه المرحلة تحتاج إلى مزيد من المراجعة',
	surahReviewMastered: 'أحسنت! حفظك لهذه السورة متقن',
	surahNeedsReview: 'هذه السورة تحتاج إلى مزيد من المراجعة',
	newRecord: (previous) => `رقم قياسي جديد! (السابق ${ar.number(previous)})`,
	shareResult: 'انشر النتيجة',
	retry: 'إعادة',
	mainMenu: 'القائمة الرئيسية',
	shareScoreText: (score, total, levelName, styleTitle) =>
		`حصلت على ${ar.number(score)} من ${ar.number(total)} في مرحلة «${levelName}» في مسابقة القرآن الكريم «${ar.appName} – ${styleTitle}»`,

	playbackFailed: 'تعذّر تحميل التلاوة. تأكد من الاتصال بالإنترنت.',
	playbackFailedAutoPlayOff: 'تعذّر تحميل التلاوة، فأُوقف التشغيل التلقائي. تأكد من الاتصال بالإنترنت.',
	clearStatistics: 'مسح الإحصائيات',
	clearStatisticsQuestion: 'مسح الإحصائيات؟',
	clearStatisticsBody:
		'سيتم حذف سجل الإجابات لكل السور، ودقة كل نوع من الأسئلة، وسلاسل الأيام والإجابات الصحيحة، وسجل الجولات، ' +
		'وعدد ألعاب البقاء والفرص الثلاث والحافظ ومتوسطاتها وأطول سلاسلها. أفضل نتيجة في كل مرحلة لن تتأثر.',
	clear: 'مسح',
	cancel: 'إلغاء',
	statisticsEmpty: 'أجب عن بعض الأسئلة لتظهر هنا السور التي تحتاج إلى مراجعة.',
	noMistakes: 'ما شاء الله! لا أخطاء حتى الآن.',
	surahsToReview: 'السور التي تحتاج إلى مراجعة',
	accuracy: 'دقة الإجابات',
	correctAnswers: (n) => `إجابات صحيحة: ${ar.number(n)}`,
	wrongAnswers: (n) => `إجابات خاطئة: ${ar.number(n)}`,
	rankedSurah: (rank, name) => `${ar.number(rank)}. سورة ${name}`,
	surahCounts: (correct, wrong) => `${ar.number(correct)} صحيحة · ${ar.number(wrong)} خاطئة`,
	tabOverview: 'نظرة عامة',
	tabSurahs: 'السور',
	tabActivity: 'النشاط',
	noAnswersYet: 'لا إجابات بعد',
	styleAccuracySinceUpdate:
		'دقة كل نوع تشمل الإجابات منذ هذا التحديث فقط، والإجابات الأقدم محسوبة في الدقة الكلية.',
	surahMap: 'خريطة السور',
	surahsPractised: (n, total) => `تدرّبت على ${ar.number(n)} من ${ar.number(total)} سورة`,
	tierNotPractised: 'لم تُختبر',
	tierWeak: 'تحتاج مراجعة',
	tierFair: 'جيد',
	tierStrong: 'متقنة',
	strongestSurahs: 'السور الأقوى',
	practice: 'تدرّب',
	notPractisedYet: 'لم تتدرّب على هذه السورة بعد',
	currentStreak: 'أيام متتالية حالياً',
	bestStreak: 'أطول سلسلة أيام',
	questionsToday: 'أسئلة اليوم',
	roundsCompleted: 'جولات مكتملة',
	currentRun: 'إجابات صحيحة متتالية',
	bestRun: 'أطول سلسلة إجابات صحيحة',
	scoreTrend: 'تطور النتائج',
	recentRounds: 'آخر الجولات المكتملة',
	noRoundsYet: 'أكمل جولة لتظهر نتائجك هنا.',
	daysAgo: (days) => {
		if (days === 0) return 'اليوم';
		if (days === 1) return 'أمس';
		if (days === 2) return 'منذ يومين';
		if (days >= 3 && days <= 10) return `منذ ${ar.number(days)} أيام`;
		return `منذ ${ar.number(days)} يوماً`;
	},
	frame: 'الإطار',
	frameNumber: (n) => `إطار ${ar.number(n)}`,
	font: 'الخط',
	fontMushaf: 'مصحف',
	fontScheherazade: 'شهرزاد',
	shareImage: 'انشر الصورة',
	shareFailed: 'تعذّر إنشاء صورة المشاركة.',
	copied: 'نُسخ النص إلى الحافظة',
	questionsCount: (n) => {
		const r = n % 100;
		if (n === 1) return 'سؤال واحد';
		if (n === 2) return 'سؤالين';
		if (r >= 3 && r <= 10) return `${ar.number(n)} أسئلة`;
		if (r >= 11 && r <= 99) return `${ar.number(n)} سؤالاً`;
		return `${ar.number(n)} سؤال`;
	},
	surahCell: (name, tier, percent) =>
		`سورة ${name}، ${tier}` + (percent !== null ? `، ${ar.percent(percent)}` : ''),
	scoreTrendDescription: (first, last) =>
		`تطور النتائج: من ${ar.percent(first)} في أقدم جولة إلى ${ar.percent(last)} في أحدثها`,
	notMastered: 'غير متقنة',
	levelsList: 'المراحل',
};

export const en: Strings = {
	language: 'en',
	languageEndonym: 'English',
	languageFlag: '\u{1F1EC}\u{1F1E7}',

	number: (value) => formatNumber('en', value),
	percent: (value) => `${value}%`,

	appName: 'Itqan',
	back: 'Back',
	loadingQuran: 'Loading the Quran…',
	loadFailed: "Couldn't load the Quran text",
	tagline: 'Test your memorization of the Holy Quran',
	styleTitle: (style) => (style === 'surah' ? 'Guess the Surah' : 'Next Ayah'),
	styleSubtitle: (style) =>
		style === 'surah' ? 'Read the ayah and pick its surah' : 'Pick the ayah that comes next',
	gameModeTitle: (mode) => {
		switch (mode) {
			case 'regular':
				return 'Regular';
			case 'survival':
				return 'Survival';
			case 'lives':
				return '3 Lives';
			case 'hafiz':
				return 'Hafiz';
		}
	},
	gameModeSubtitle: (mode) => {
		switch (mode) {
			case 'regular':
				return 'Fixed-length rounds; master every level';
			case 'survival':
				return 'Endless questions; one mistake ends the game';
			case 'lives':
				return 'Endless questions; three mistakes end the game';
			case 'hafiz':
				return 'Similar-ayah traps (mutashabihat); three mistakes end the game';
		}
	},

	chooseStyle: 'Choose a question style',
	best: 'best',
	questionNumber: (n) => `Question ${n}`,
	livesLeft: (n) => `Lives left: ${n}`,
	gameOver: 'Game over',
	survivalResult: (score) => `Correct in a row: ${score}`,
	livesResult: (score, answered) => `${score} correct out of ${en.questionsCount(answered)}`,
	longestStreak: (n) => `Longest streak: ${n}`,
	bestScore: (n) => `Best score: ${n}`,
	gamesPlayed: (n) => `Games played: ${n}`,
	averageScore: (n) => `Average score: ${n}`,
	noGamesYet: 'No games yet',
	shareRunText: (score, levelName, modeTitle, styleTitle) =>
		`I scored ${score} in ${modeTitle} mode on the level “${levelName}” in the Quran quiz “${en.appName} – ${styleTitle}”`,

	mastered: 'mastered',
	statistics: 'Statistics',
	statisticsHint: 'See which surahs need more review',
	statisticsSummary: (percent, total) =>
		`Accuracy ${en.percent(percent)} across ${en.questionsCount(total)}`,

	languageLabel: 'Language',
	credits: 'Credits',
	creditsQuranText: 'Quran text',
	creditsRecitations: 'Recitations',
	creditsMutashabihat: 'Mutashabihat',
	creditsTanzil: 'Tanzil Project',
	creditsAswaatulQurraa: 'Aswaatul Qurraa',
	creditsFonts: 'Fonts',
	totalPoints: (points) => `Total points: ${points}`,
	masteredCount: (mastered, total) => `${mastered} of ${total} mastered`,
	start: 'Start',
	shareAyah: 'Share ayah',
	questionProgress: (current, total) => `Question ${current} of ${total}`,
	next: 'Next',
	points: (score) => `Points: ${score}`,
	whichSurah: 'Which surah is this ayah from?',
	whatIsNextAyah: 'What is the next ayah?',
	pause: 'Pause',
	listen: 'Listen',
	chooseReciter: 'Choose reciter',
	autoPlay: 'Auto',
	correctAnswer: 'Correct answer',
	wrongAnswer: 'Wrong answer',
	resultTitle: 'Result',
	perfectScore: "Masha'Allah! A perfect score",
	levelMastered: 'Well done! You have mastered this level',
	keepReviewing: 'Good, keep reviewing to master it',
	needsReview: 'This level needs more review',
	surahReviewMastered: 'Well done! You know this surah well',
	surahNeedsReview: 'This surah needs more review',
	newRecord: (previous) => `New record! (previous: ${previous})`,
	shareResult: 'Share result',
	retry: 'Retry',
	mainMenu: 'Main menu',
	shareScoreText: (score, total, levelName, styleTitle) =>
		`I scored ${score} out of ${total} on the level “${levelName}” in the Quran quiz “${en.appName} – ${styleTitle}”`,

	playbackFailed: "Couldn't load the recitation. Check your internet connection.",
	playbackFailedAutoPlayOff:
		"Couldn't load the recitation, so auto-play was turned off. Check your internet connection.",
	clearStatistics: 'Clear statistics',
	clearStatisticsQuestion: 'Clear statistics?',
	clearStatisticsBody:
		'This deletes the answer history for every surah, the accuracy per question style, day streaks and correct-answer runs, ' +
		'the round history, and the games played, averages and longest streaks of Survival, 3 Lives and Hafiz. ' +
		'Your best score on each level is kept.',
	clear: 'Clear',
	cancel: 'Cancel',
	statisticsEmpty: 'Answer some questions to see the surahs that need review here.',
	noMistakes: "Masha'Allah! No mistakes so far.",
	surahsToReview: 'Surahs that need review',
	accuracy: 'Accuracy',
	correctAnswers: (n) => `Correct answers: ${n}`,
	wrongAnswers: (n) => `Wrong answers: ${n}`,
	rankedSurah: (rank, name) => `${rank}. Surah ${name}`,
	surahCounts: (correct, wrong) => `${correct} correct · ${wrong} wrong`,
	tabOverview: 'Overview',
	tabSurahs: 'Surahs',
	tabActivity: 'Activity',
	noAnswersYet: 'No answers yet',
	styleAccuracySinceUpdate:
		'Per-style accuracy counts answers given since this update; older answers are only in the overall accuracy.',
	surahMap: 'Surah map',
	surahsPractised: (n, total) => `${n} of ${total} surahs practised`,
	tierNotPractised: 'Not practised',
	tierWeak: 'Needs review',
	tierFair: 'Good',
	tierStrong: 'Strong',
	strongestSurahs: 'Strongest surahs',
	practice: 'Practise',
	notPractisedYet: 'Not practised yet',
	currentStreak: 'Current day streak',
	bestStreak: 'Best day streak',
	questionsToday: 'Questions today',
	roundsCompleted: 'Rounds completed',
	currentRun: 'Correct in a row',
	bestRun: 'Best correct run',
	scoreTrend: 'Score trend',
	recentRounds: 'Finished rounds',
	noRoundsYet: 'Finish a round to see your history here.',
	daysAgo: (days) => {
		if (days === 0) return 'Today';
		if (days === 1) return 'Yesterday';
		return `${days} days ago`;
	},
	frame: 'Frame',
	frameNumber: (n) => `Frame ${n}`,
	font: 'Font',
	fontMushaf: 'Mushaf',
	fontScheherazade: 'Scheherazade',
	shareImage: 'Share image',
	shareFailed: "Couldn't create the image to share.",
	copied: 'Copied to clipboard',
	questionsCount: (n) => (n === 1 ? '1 question' : `${n} questions`),
	surahCell: (name, tier, percent) =>
		`Surah ${name}, ${tier}` + (percent !== null ? `, ${en.percent(percent)}` : ''),
	scoreTrendDescription: (first, last) =>
		`Score trend: from ${en.percent(first)} in the oldest round to ${en.percent(last)} in the latest`,
	notMastered: 'not mastered',
	levelsList: 'Levels',
};
