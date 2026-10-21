import frame1 from '#lib/assets/images/frame_1.jpg';
import frame2 from '#lib/assets/images/frame_2.jpg';
import frame3 from '#lib/assets/images/frame_3.jpg';
import frame4 from '#lib/assets/images/frame_4.jpg';
import frame5 from '#lib/assets/images/frame_5.png';

/**
 * Decorative frames, with the fraction of each side taken by the border (measured from the bitmaps,
 * plus a small margin). Same order and insets as the Android app (`Frame` in ShareCardScreen.kt).
 */
export interface CardFrame {
	/** Image URL. */
	src: string;
	/** width / height */
	aspect: number;
	/** Insets as fractions of the card's width (start/end) and height (top/bottom). The card is always laid out RTL. */
	start: number;
	top: number;
	end: number;
	bottom: number;
}

export const FRAMES: readonly CardFrame[] = [
	{ src: frame2, aspect: 480 / 640, start: 0.16, top: 0.12, end: 0.16, bottom: 0.12 }, // Green
	{ src: frame5, aspect: 409 / 561, start: 0.22, top: 0.16, end: 0.22, bottom: 0.16 }, // Arabesque
	{ src: frame4, aspect: 600 / 770, start: 0.18, top: 0.14, end: 0.18, bottom: 0.14 }, // Gold
	{ src: frame3, aspect: 500 / 711, start: 0.16, top: 0.13, end: 0.17, bottom: 0.13 }, // Classic
	{ src: frame1, aspect: 374 / 490, start: 0.13, top: 0.07, end: 0.13, bottom: 0.07 } // Columns
];

export interface CardFont {
	family: string;
	label: 'fontMushaf' | 'fontScheherazade';
}

export const FONTS: readonly CardFont[] = [
	{ family: 'Amiri Quran', label: 'fontMushaf' },
	{ family: 'Scheherazade New', label: 'fontScheherazade' }
];

/** Exported image width in px. */
const EXPORT_WIDTH = 1080;
/** The card is designed at 360 dp wide (as on Android); everything scales by this. */
const K = EXPORT_WIDTH / 360;

const MAX_SIZE = 30 * K;
const MIN_SIZE = 7 * K;
const STEP = 0.5 * K;
const BODY_LINE_HEIGHT = 1.9;
const REFERENCE_SIZE = 13 * K;
const REFERENCE_LINE_HEIGHT = 1.6;
const GAP = 8 * K;
const BODY_COLOR = '#1F1A10';
const REFERENCE_COLOR = '#0B5D3B';
const ARABIC = /[\u0600-\u06FF]/;

const images = new Map<string, Promise<HTMLImageElement>>();

function loadImage(src: string): Promise<HTMLImageElement> {
	let cached = images.get(src);
	if (!cached) {
		const img = new Image();
		img.src = src;
		cached = img.decode().then(() => img);
		// A failed decode must not poison later attempts.
		cached.catch(() => images.delete(src));
		images.set(src, cached);
	}
	return cached;
}

/** Greedy word wrap of `text` to `maxWidth`, measured with the context's current font. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
	const lines: string[] = [];
	let line = '';
	for (const word of text.split(' ')) {
		if (word === '') continue;
		const candidate = line === '' ? word : `${line} ${word}`;
		if (line !== '' && ctx.measureText(candidate).width > maxWidth) {
			lines.push(line);
			line = word;
		} else {
			line = candidate;
		}
	}
	if (line !== '') lines.push(line);
	return lines;
}

export interface CardOptions {
	frame: CardFrame;
	font: CardFont;
	body: string;
	reference: string;
	/**
	 * Called after the async preparation (fonts, image) and before anything is drawn; return true when a newer
	 * render superseded this one, so the canvas is left untouched.
	 */
	isStale?: () => boolean;
}

/**
 * Draws the share card (white page, frame, centred Quran text auto-fitted into the frame, reference) onto
 * `canvas` at 1080 px wide. Resolves once drawn, or without drawing if `isStale()` turned true.
 */
export async function renderCard(canvas: HTMLCanvasElement, opts: CardOptions): Promise<void> {
	const { frame, font, body, reference, isStale } = opts;
	const [img] = await Promise.all([
		loadImage(frame.src),
		document.fonts.load(`${MAX_SIZE}px "${font.family}"`, body),
		document.fonts.load(`${REFERENCE_SIZE}px Amiri`, reference)
	]);
	if (isStale?.()) return;

	const width = EXPORT_WIDTH;
	const height = Math.round(EXPORT_WIDTH / frame.aspect);
	// Resizing resets the context, so do it together with all drawing, synchronously.
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('2d canvas unavailable');

	ctx.fillStyle = '#fff';
	ctx.fillRect(0, 0, width, height);
	ctx.drawImage(img, 0, 0, width, height);

	const left = width * frame.start;
	const right = width * (1 - frame.end);
	const top = height * frame.top;
	const bottom = height * (1 - frame.bottom);
	const innerW = right - left;
	const innerH = bottom - top;
	const refLine = REFERENCE_SIZE * REFERENCE_LINE_HEIGHT;

	// Largest size at which the wrapped body and the reference fit; the smallest is used regardless.
	let size = MIN_SIZE;
	let lines: string[] = [];
	for (let s = MAX_SIZE; s >= MIN_SIZE; s -= STEP) {
		ctx.font = `${s}px "${font.family}"`;
		ctx.direction = 'rtl';
		lines = wrap(ctx, body, innerW);
		size = s;
		if (lines.length * BODY_LINE_HEIGHT * s + GAP + refLine <= innerH) break;
	}

	const lineHeight = BODY_LINE_HEIGHT * size;
	const total = lines.length * lineHeight + GAP + refLine;
	const y0 = top + (innerH - total) / 2;
	const cx = (left + right) / 2;

	ctx.save();
	ctx.beginPath();
	ctx.rect(left, top, innerW, innerH);
	ctx.clip();
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	ctx.font = `${size}px "${font.family}"`;
	ctx.direction = 'rtl';
	ctx.fillStyle = BODY_COLOR;
	lines.forEach((line, i) => ctx.fillText(line, cx, y0 + (i + 0.5) * lineHeight));

	ctx.font = `${REFERENCE_SIZE}px Amiri`;
	ctx.direction = ARABIC.test(reference) ? 'rtl' : 'ltr';
	ctx.fillStyle = REFERENCE_COLOR;
	ctx.fillText(reference, cx, y0 + lines.length * lineHeight + GAP + refLine / 2);
	ctx.restore();
}
