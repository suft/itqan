import { createStore, del, entries, get, set, type UseStore } from 'idb-keyval';

const CACHE_NAME = 'itqan-recitations-v1';
const MAX_BYTES = 200 * 1024 * 1024;

interface Meta {
	bytes: number;
	usedAt: number;
}

export class HttpError extends Error {
	readonly status: number;
	constructor(status: number) {
		super(`HTTP ${status}`);
		this.name = 'HttpError';
		this.status = status;
	}
}

let metaStore: UseStore | null = null;
const meta = (): UseStore => (metaStore ??= createStore('itqan-audio', 'lru'));

async function evict(cache: Cache): Promise<void> {
	const all = (await entries<string, Meta>(meta())).sort((a, b) => a[1].usedAt - b[1].usedAt);
	let total = all.reduce((sum, [, m]) => sum + m.bytes, 0);
	for (const [url, m] of all) {
		if (total <= MAX_BYTES) break;
		await cache.delete(url);
		await del(url, meta());
		total -= m.bytes;
	}
}

async function fromCache(url: string): Promise<Blob | null> {
	if (typeof caches === 'undefined') return null;
	try {
		const cache = await caches.open(CACHE_NAME);
		const hit = await cache.match(url);
		if (!hit) return null;
		const blob = await hit.blob();
		void get<Meta>(url, meta())
			.then((m) => set(url, { bytes: m?.bytes ?? blob.size, usedAt: Date.now() }, meta()))
			.catch(() => {});
		return blob;
	} catch {
		return null;
	}
}

async function store(url: string, blob: Blob): Promise<void> {
	if (typeof caches === 'undefined') return;
	try {
		const cache = await caches.open(CACHE_NAME);
		await cache.put(
			url,
			new Response(blob, { headers: { 'content-type': 'audio/mpeg' } })
		);
		await set(url, { bytes: blob.size, usedAt: Date.now() } satisfies Meta, meta());
		await evict(cache);
	} catch {
		// Caching is best-effort.
	}
}

export async function fetchRecitation(url: string, signal?: AbortSignal): Promise<Blob> {
	const cached = await fromCache(url);
	if (cached) return cached;
	const res = await fetch(url, { mode: 'cors', signal });
	if (!res.ok) throw new HttpError(res.status);
	const blob = await res.blob();
	await store(url, blob);
	return blob;
}

/** Downloads each url into the cache in sequence. Never throws. */
export async function prefetchRecitations(urls: readonly string[], signal: AbortSignal): Promise<void> {
	for (const url of urls) {
		if (signal.aborted) return;
		try {
			await fetchRecitation(url, signal);
		} catch (e) {
			if (e instanceof HttpError) continue; // missing on the server; the next may exist
			return; // aborted or offline
		}
	}
}
