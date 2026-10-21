export type ModeKey = 'regular' | 'survival' | 'lives' | 'hafiz';

/** How a game ends: after a fixed round (Regular) or when the lives run out (endless modes). */
export interface GameMode {
	key: ModeKey;
	lives: number | null;
	/** Wrong options are mutashabihat that resemble the right answer. */
	trapOptions: boolean;
}

export const MODES: readonly GameMode[] = [
	{ key: 'regular', lives: null, trapOptions: false },
	{ key: 'survival', lives: 1, trapOptions: false },
	{ key: 'lives', lives: 3, trapOptions: false },
	{ key: 'hafiz', lives: 3, trapOptions: true }
];

export function modeByKey(key: string): GameMode | undefined {
	return MODES.find((m) => m.key === key);
}

export function isEndless(mode: GameMode): boolean {
	return mode.lives !== null;
}

/** Survival's score is its streak, so only games with more lives show the longest streak separately. */
export function showsLongestStreak(mode: GameMode): boolean {
	return (mode.lives ?? 0) > 1;
}

/** Regular: after roundLength answers. Endless: when wrong reaches lives. */
export function isOver(mode: GameMode, answered: number, wrong: number, roundLength: number): boolean {
	return mode.lives === null ? answered >= roundLength : wrong >= mode.lives;
}
