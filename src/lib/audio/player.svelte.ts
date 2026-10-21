import { fetchRecitation, prefetchRecitations } from '#lib/audio/cache.ts';

export type PlaybackStatus = 'idle' | 'buffering' | 'playing' | 'paused';

const TRIM_POLL_MS = 100;

/** One element for the whole app, so mobile autoplay unlocks persist across quizzes. */
let sharedAudio: HTMLAudioElement | null = null;
function audioElement(): HTMLAudioElement {
	if (!sharedAudio) {
		sharedAudio = new Audio();
		sharedAudio.preload = 'auto';
	}
	return sharedAudio;
}

/**
 * Plays one or more consecutive ayahs (a playlist of per-ayah MP3s) and pre-downloads the next
 * question's audio into the cache.
 */
export class RecitationPlayer {
	status = $state<PlaybackStatus>('idle');

	private readonly audio = audioElement();
	private readonly trimEndMs: number;
	private readonly onError: () => void;
	private loadedUrls: string[] = [];
	private index = 0;
	private objectUrl: string | null = null;
	private loadToken = 0;
	private loadAbort: AbortController | null = null;
	private prefetchAbort: AbortController | null = null;
	private trimTimer: ReturnType<typeof setInterval> | null = null;
	private stopping = false;
	private released = false;

	constructor(opts: { trimEndMs: number; onError: () => void }) {
		this.trimEndMs = opts.trimEndMs;
		this.onError = opts.onError;
		const a = this.audio;
		a.addEventListener('playing', this.onPlaying);
		a.addEventListener('waiting', this.onWaiting);
		a.addEventListener('pause', this.onPause);
		a.addEventListener('ended', this.onEnded);
		a.addEventListener('error', this.onAudioError);
	}

	private onPlaying = (): void => {
		this.status = 'playing';
		this.startTrimWatcher();
	};

	private onWaiting = (): void => {
		if (this.loadedUrls.length > 0) this.status = 'buffering';
	};

	private onPause = (): void => {
		this.clearTrim();
		// 'idle' here means advance() already finished the playlist (e.g. trimmed end), not a user pause.
		if (this.stopping || this.status === 'idle' || this.loadedUrls.length === 0 || this.audio.ended) return;
		this.status = 'paused';
	};

	private onEnded = (): void => {
		this.advance();
	};

	private onAudioError = (): void => {
		if (this.stopping || this.loadedUrls.length === 0) return;
		this.fail();
	};

	private fail(): void {
		this.stop();
		this.onError();
	}

	/** Next item, or after the last one reset to item 0 and go idle. */
	private advance(): void {
		this.clearTrim();
		if (this.index + 1 < this.loadedUrls.length) {
			void this.load(this.index + 1);
		} else {
			this.index = 0;
			this.audio.pause();
			this.status = 'idle';
		}
	}

	private async load(i: number): Promise<void> {
		const urls = this.loadedUrls;
		this.index = i;
		this.status = 'buffering';
		this.loadAbort?.abort();
		const abort = (this.loadAbort = new AbortController());
		const token = ++this.loadToken;
		let blob: Blob;
		try {
			blob = await fetchRecitation(urls[i], abort.signal);
		} catch (e) {
			if (token !== this.loadToken || (e instanceof DOMException && e.name === 'AbortError')) return;
			this.fail();
			return;
		}
		if (token !== this.loadToken) return;
		if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
		this.objectUrl = URL.createObjectURL(blob);
		this.audio.src = this.objectUrl;
		try {
			await this.audio.play();
		} catch (e) {
			if (token !== this.loadToken) return;
			if (e instanceof DOMException && e.name === 'AbortError') return;
			if (e instanceof DOMException && e.name === 'NotAllowedError') {
				this.status = 'paused';
				return;
			}
			this.fail();
		}
	}

	/** Plays `urls` from the start, or resumes them if already loaded and paused. */
	play(urls: string[]): void {
		if (urls.length === 0) return;
		this.stopping = false;
		const same = urls.length === this.loadedUrls.length && urls.every((u, i) => u === this.loadedUrls[i]);
		if (!same) {
			this.loadedUrls = [...urls];
			void this.load(0);
		} else if (this.status === 'idle') {
			void this.load(0);
		} else if (this.audio.paused && this.audio.src) {
			this.audio.play().catch((e: unknown) => {
				if (e instanceof DOMException && e.name === 'AbortError') return;
				if (e instanceof DOMException && e.name === 'NotAllowedError') return;
				this.fail();
			});
		} else if (this.audio.paused) {
			// Paused before the item finished loading (autoplay blocked after load): load again.
			void this.load(this.index);
		}
	}

	toggle(urls: string[]): void {
		const same = urls.length === this.loadedUrls.length && urls.every((u, i) => u === this.loadedUrls[i]);
		if (same && (this.status === 'playing' || this.status === 'buffering')) this.pause();
		else this.play(urls);
	}

	pause(): void {
		this.audio.pause();
		if (this.status === 'buffering') {
			// Still loading: cancel the load but keep the playlist position.
			this.loadToken++;
			this.loadAbort?.abort();
			this.status = 'paused';
		}
	}

	stop(): void {
		this.stopping = true;
		this.loadToken++;
		this.loadAbort?.abort();
		this.loadAbort = null;
		this.clearTrim();
		this.audio.pause();
		this.audio.removeAttribute('src');
		this.audio.load();
		if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
		this.objectUrl = null;
		this.loadedUrls = [];
		this.index = 0;
		this.status = 'idle';
	}

	/** Downloads `urls` into the cache in the background (replaces any previous prefetch). */
	prefetch(urls: string[]): void {
		this.prefetchAbort?.abort();
		const abort = (this.prefetchAbort = new AbortController());
		void prefetchRecitations(urls, abort.signal);
	}

	release(): void {
		if (this.released) return;
		this.released = true;
		this.stop();
		this.prefetchAbort?.abort();
		const a = this.audio;
		a.removeEventListener('playing', this.onPlaying);
		a.removeEventListener('waiting', this.onWaiting);
		a.removeEventListener('pause', this.onPause);
		a.removeEventListener('ended', this.onEnded);
		a.removeEventListener('error', this.onAudioError);
	}

	private startTrimWatcher(): void {
		if (this.trimEndMs <= 0 || this.trimTimer !== null) return;
		this.trimTimer = setInterval(() => {
			const a = this.audio;
			if (a.paused || !Number.isFinite(a.duration)) return;
			if (a.duration - a.currentTime < this.trimEndMs / 1000) this.advance();
		}, TRIM_POLL_MS);
	}

	private clearTrim(): void {
		clearInterval(this.trimTimer ?? undefined);
		this.trimTimer = null;
	}
}
