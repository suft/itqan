import { goto } from '$app/navigation';
import { resolve } from '$app/paths';

let depth = 0;

/** Called from the root layout's afterNavigate. */
export function trackNavigation(type: string | null): void {
	if (type === 'link' || type === 'goto') depth++;
	else if (type === 'popstate') depth = Math.max(0, depth - 1);
}

/** Back one in-app step, or `fallback` when the page was opened directly. */
export function goBack(fallback: string): void {
	if (depth > 0) history.back();
	else void goto(fallback, { replaceState: true });
}

/** Resolved app URL with optional query parameters. */
export function href(path: string, params?: Record<string, string>): string {
	// resolve() is typed against the known route ids; the dynamic path is validated by callers.
	const base = (resolve as (p: string) => string)(path);
	return params ? `${base}?${new URLSearchParams(params)}` : base;
}
