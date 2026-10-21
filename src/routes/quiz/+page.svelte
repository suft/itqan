<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getQuran } from '#lib/context.ts';
	import { loadMutashabihat } from '#lib/data/load.ts';
	import { ayahMarker } from '#lib/domain/arabic-text.ts';
	import { isEndless, modeByKey, showsLongestStreak, type GameMode } from '#lib/domain/game-mode.ts';
	import { NEXT_AYAH, levelById, levelName, levelMastery, type Level } from '#lib/domain/levels.ts';
	import type { Question } from '#lib/domain/question-generator.ts';
	import { RECITERS, reciterByFolder } from '#lib/audio/reciters.ts';
	import { goBack, href } from '#lib/nav.ts';
	import { QuizController } from '#lib/quiz/quiz.svelte.ts';
	import { settings, strings } from '#lib/settings.svelte.ts';
	import Icon from '#lib/ui/Icon.svelte';
	import AppTopBar from '#lib/ui/AppTopBar.svelte';
	import Modal from '#lib/ui/Modal.svelte';
	import Snackbar from '#lib/ui/Snackbar.svelte';

	const quran = getQuran();

	let controller = $state<QuizController | null>(null);
	let level = $state.raw<Level | null>(null);
	let mode = $state.raw<GameMode | null>(null);
	let loadError = $state(false);
	let snack = $state<string | null>(null);
	let destroyed = false;

	const s = $derived(strings());

	onMount(() => {
		const params = page.url.searchParams;
		const m = modeByKey(params.get('mode') ?? '');
		const l = levelById(params.get('level') ?? '', quran);
		if (!m || !l || (l.practice && m.key !== 'regular')) {
			void goto(href('/'), { replaceState: true });
			return;
		}
		mode = m;
		level = l;
		void init(m, l);
	});

	async function init(m: GameMode, l: Level): Promise<void> {
		try {
			const mutashabihat = m.trapOptions ? await loadMutashabihat(quran) : null;
			if (destroyed) return;
			controller = new QuizController({
				quran,
				level: l,
				mode: m,
				language: settings.language,
				mutashabihat
			});
		} catch (e) {
			console.warn('itqan: quiz failed to start', e);
			loadError = true;
		}
	}

	// Audio and the feedback timer run only while the page is visible.
	$effect(() => {
		const c = controller;
		if (!c) return;
		const onVisibility = () => c.setForeground(document.visibilityState === 'visible');
		const onPageHide = () => c.dispose();
		document.addEventListener('visibilitychange', onVisibility);
		window.addEventListener('pagehide', onPageHide);
		return () => {
			document.removeEventListener('visibilitychange', onVisibility);
			window.removeEventListener('pagehide', onPageHide);
			c.dispose();
		};
	});

	onDestroy(() => {
		destroyed = true;
		controller?.dispose();
	});

	$effect(() => {
		const error = controller?.playbackError;
		if (!error) return;
		snack = error === 'loadFailedAutoPlayOff' ? s.playbackFailedAutoPlayOff : s.playbackFailed;
		controller?.playbackErrorShown();
	});

	const practice = $derived(level?.practice ?? false);

	function back(): void {
		if (!level) return;
		goBack(practice ? href('/stats') : href('/levels', { mode: mode?.key ?? 'regular', style: level.style.key }));
	}

	// ---------------------------------------------------------------- prompt

	/** Guess-the-surah hides ayah numbers (they would give hints); next-ayah shows them. */
	function formatPrompt(q: Question): string {
		return q.style === NEXT_AYAH
			? q.promptAyahs.map((t, i) => `${t} ${ayahMarker(q.promptAyahNumbers[i])}`).join(' ')
			: q.promptAyahs.join('  ۝  ');
	}

	function promptSize(prompt: string): number {
		if (prompt.length < 80) return 28;
		if (prompt.length < 200) return 24;
		if (prompt.length < 450) return 21;
		return 19;
	}

	type OptionState = 'open' | 'correct' | 'wrong' | 'dimmed';
	function optionState(i: number, q: Question, selected: number | null): OptionState {
		if (selected === null) return 'open';
		if (i === q.correctOption) return 'correct';
		if (i === selected) return 'wrong';
		return 'dimmed';
	}

	const question = $derived(controller?.question ?? null);
	const prompt = $derived(question ? formatPrompt(question) : '');
	const canShareAyah = $derived(
		!!question && (question.style === NEXT_AYAH || (controller?.answered ?? false))
	);
	const lives = $derived(Math.max(0, controller?.livesLeft ?? 0));
	const doneCount = $derived(
		controller ? controller.number - 1 + (controller.answered ? 1 : 0) : 0
	);

	// ---------------------------------------------------------------- result

	const message = $derived.by(() => {
		const c = controller;
		if (!c || !level || !mode) return '';
		if (mode.key === 'survival') return s.survivalResult(c.score);
		if (isEndless(mode)) return s.livesResult(c.score, c.number);
		if (c.score === c.total) return s.perfectScore;
		if (c.score >= levelMastery(level)) return practice ? s.surahReviewMastered : s.levelMastered;
		if (c.score * 2 >= c.total) return s.keepReviewing;
		return practice ? s.surahNeedsReview : s.needsReview;
	});

	function shareText(): string {
		const c = controller;
		if (!c || !level || !mode) return '';
		const name = levelName(level, s.language);
		return isEndless(mode)
			? s.shareRunText(c.score, name, s.gameModeTitle(mode.key), s.styleTitle(level.style.key))
			: s.shareScoreText(c.score, c.total, name, s.styleTitle(level.style.key));
	}

	async function shareResult(): Promise<void> {
		const text = shareText();
		try {
			if (typeof navigator.share === 'function') {
				await navigator.share({ title: s.appName, text });
			} else {
				await navigator.clipboard.writeText(text);
				snack = s.copied;
			}
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') return;
			snack = s.shareFailed;
		}
	}
</script>

<svelte:head>
	<title>{level ? `${levelName(level, s.language)} · ${s.appName}` : s.appName}</title>
</svelte:head>

<div class="page quiz">
	<AppTopBar title={level ? levelName(level, s.language) : ''} onback={level ? back : undefined}>
		{#snippet actions()}
			{#if question && canShareAyah}
				<a
					class="icon-btn"
					href={href('/share', { from: String(question.shown.first), to: String(question.shown.last) })}
					aria-label={s.shareAyah}
				>
					<Icon name="share" />
				</a>
			{:else}
				<button class="icon-btn" disabled aria-label={s.shareAyah}>
					<Icon name="share" />
				</button>
			{/if}
		{/snippet}
	</AppTopBar>

	{#if loadError}
		<div class="center">
			<p>{s.loadFailed}</p>
			<button class="btn" onclick={() => goBack(href('/'))}>{s.back}</button>
		</div>
	{:else if !controller || !mode || !level || !question}
		<div class="center"><div class="spinner" role="progressbar" aria-label={s.loadingQuran}></div></div>
	{:else}
		{@const c = controller}
		<div class="body">
			<div class="left">
				<div class="header">
					<span class="progress-label" aria-live="polite">
						{isEndless(mode) ? s.questionNumber(c.number) : s.questionProgress(c.number, c.total)}
						{#if c.answered}
							<span class="visually-hidden">
								, {c.selected === question.correctOption ? s.correctAnswer : s.wrongAnswer}
							</span>
						{/if}
					</span>
					{#if c.answered && !c.finished}
						<button class="btn text next" onclick={() => c.advanceNow()}>
							{s.next}
							<Icon name="arrow_forward" size={18} />
						</button>
					{/if}
					{#if isEndless(mode)}
						<span class="lives" role="img" aria-label={s.livesLeft(lives)}>
							{#each { length: mode.lives ?? 0 } as _, i (i)}
								{#if i < lives}
									<span class="heart"><Icon name="favorite" size={20} /></span>
								{:else}
									<span class="heart empty"><Icon name="favorite_border" size={20} /></span>
								{/if}
							{/each}
						</span>
					{/if}
					<span class="pill">{s.points(c.score)}</span>
				</div>
				{#if !isEndless(mode)}
					<div class="track" role="progressbar" aria-valuemin={0} aria-valuemax={c.total} aria-valuenow={doneCount}>
						<div class="fill" style:width="{(doneCount / c.total) * 100}%"></div>
					</div>
				{/if}

				<section class="prompt">
					<div class="prompt-label">
						{question.style === NEXT_AYAH ? s.whatIsNextAyah : s.whichSurah}
					</div>
					<p class="quran prompt-text" style:font-size="{promptSize(prompt)}px">{prompt}</p>
					{#if question.reference}
						<div class="reference">{question.reference}</div>
					{/if}
				</section>
			</div>

			<div class="right">
				<div class="audio">
					<span class="play-wrap">
						<button
							class="icon-btn tonal-btn"
							onclick={() => c.togglePlayback()}
							aria-label={c.playback === 'playing' ? s.pause : s.listen}
						>
							<Icon name={c.playback === 'playing' ? 'pause' : 'play_arrow'} />
						</button>
						{#if c.playback === 'buffering'}
							<span class="buffer spinner" aria-hidden="true"></span>
						{/if}
					</span>
					<label class="reciter">
						<span class="visually-hidden">{s.chooseReciter}</span>
						<select
							value={c.reciter.folder}
							onchange={(e) => c.setReciter(reciterByFolder(e.currentTarget.value))}
						>
							{#each RECITERS as r (r.folder)}
								<option value={r.folder}>{s.language === 'en' ? r.englishName : r.arabicName}</option>
							{/each}
						</select>
						<Icon name="arrow_drop_down" />
					</label>
					<label class="auto">
						<span>{s.autoPlay}</span>
						<input
							type="checkbox"
							role="switch"
							checked={c.autoPlay}
							onchange={(e) => c.setAutoPlay(e.currentTarget.checked)}
						/>
						<span class="switch" aria-hidden="true"></span>
					</label>
				</div>

				<div class="options">
					{#each question.options as text, i (i)}
						{@const st = optionState(i, question, c.selected)}
						<button
							class="option {st}"
							class:ayah={question.style === NEXT_AYAH}
							disabled={st !== 'open'}
							onclick={() => c.select(i)}
						>
							<span class="option-text" class:quran={question.style === NEXT_AYAH}>{text}</span>
							{#if st === 'correct'}
								<span class="mark" style:color="var(--correct)"><Icon name="check_circle" /></span>
								<span class="visually-hidden">{s.correctAnswer}</span>
							{:else if st === 'wrong'}
								<span class="mark" style:color="var(--wrong)"><Icon name="cancel" /></span>
								<span class="visually-hidden">{s.wrongAnswer}</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		</div>

		{#if c.finished}
			<Modal oncancel={back}>
				<div class="result">
					<span class="trophy"><Icon name="emoji_events" size={32} /></span>
					<h2>{isEndless(mode) ? s.gameOver : s.resultTitle}</h2>
					<div class="level-name">{levelName(level, s.language)}</div>
					{#if isEndless(mode)}
						<div class="mode-line">{s.gameModeTitle(mode.key)} · {s.styleTitle(level.style.key)}</div>
					{/if}
					<div class="big">
						{isEndless(mode) ? s.number(c.score) : `${s.number(c.score)} / ${s.number(c.total)}`}
					</div>
					<p class="msg">{message}</p>
					{#if showsLongestStreak(mode)}
						<div>{s.longestStreak(c.bestStreak)}</div>
					{/if}
					{#if c.isNewRecord && c.previousBest > 0}
						<div class="record">{s.newRecord(c.previousBest)}</div>
					{/if}
					<div class="actions">
						<button class="btn" onclick={() => c.restart()}>{s.retry}</button>
						<button class="btn outlined" onclick={shareResult}>{s.shareResult}</button>
						<button class="btn text" onclick={back}>{practice ? s.statistics : s.levelsList}</button>
						<button class="btn text" onclick={() => goto(href('/'))}>{s.mainMenu}</button>
					</div>
				</div>
			</Modal>
		{/if}
	{/if}
</div>

<Snackbar message={snack} ondismiss={() => (snack = null)} />

<style>
	.quiz {
		gap: 8px;
	}
	.center {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
		flex: 1;
		text-align: center;
	}
	.body {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding-bottom: calc(80px + env(safe-area-inset-bottom));
	}
	.left,
	.right {
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
	}

	@media (min-width: 560px) and (orientation: landscape) {
		.quiz {
			max-width: 900px;
			height: 100dvh;
		}
		.body {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 16px;
			flex: 1;
			min-height: 0;
		}
		.left {
			min-height: 0;
		}
		.left .prompt {
			flex: 1;
			max-height: none;
		}
		.right {
			overflow-y: auto;
		}
	}

	/* header */
	.header {
		display: flex;
		align-items: center;
		gap: 4px;
		min-height: 48px;
	}
	.progress-label {
		flex: 1;
		min-width: 0;
		font-size: 1.1rem;
		font-weight: 600;
	}
	.next {
		min-height: 48px;
	}
	.lives {
		display: inline-flex;
		gap: 2px;
		margin-inline-end: 8px;
	}
	.heart {
		display: inline-flex;
		color: var(--wrong);
	}
	.heart.empty {
		color: var(--on-surface-variant);
	}
	.pill {
		padding: 6px 12px;
		border-radius: 999px;
		background: var(--secondary-container);
		color: var(--on-secondary-container);
		font-size: 0.9rem;
		font-weight: 600;
		white-space: nowrap;
	}
	.track {
		height: 4px;
		border-radius: 2px;
		background: var(--surface-variant);
		overflow: hidden;
	}
	.fill {
		height: 100%;
		background: var(--primary);
		transition: width 0.3s;
	}

	/* prompt */
	.prompt {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		min-height: 120px;
		max-height: 50dvh;
		overflow-y: auto;
		margin-top: 2px;
		padding: 16px 18px;
		border: 1.5px solid color-mix(in srgb, var(--gold) 70%, transparent);
		border-radius: 20px;
		background: color-mix(in srgb, var(--surface-lowest) 95%, transparent);
		box-shadow: var(--shadow);
		text-align: center;
	}
	.prompt-label {
		color: var(--secondary);
		font-size: 0.95rem;
		font-weight: 600;
	}
	.prompt-text {
		width: 100%;
		margin: 0;
		color: var(--on-surface);
		overflow-wrap: anywhere;
	}
	.reference {
		color: var(--primary);
		font-family: Amiri, serif;
		font-size: 1rem;
		font-weight: 600;
	}

	/* audio */
	.audio {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.play-wrap {
		position: relative;
		display: inline-flex;
		flex: none;
	}
	.tonal-btn {
		background: var(--secondary-container);
		color: var(--on-secondary-container);
	}
	.buffer {
		position: absolute;
		inset: 2px;
		width: auto;
		height: auto;
		pointer-events: none;
	}
	.reciter {
		position: relative;
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		min-height: 48px;
		color: var(--primary);
	}
	.reciter select {
		appearance: none;
		width: 100%;
		min-height: 48px;
		padding-inline: 12px 32px;
		border: none;
		background: transparent;
		color: inherit;
		font: inherit;
		text-overflow: ellipsis;
	}
	.reciter :global(.icon) {
		position: absolute;
		inset-inline-end: 6px;
		pointer-events: none;
	}
	.reciter select option {
		color: var(--on-surface);
		background: var(--surface);
	}
	.auto {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 48px;
		font-size: 0.9rem;
		font-weight: 600;
		flex: none;
	}
	.auto input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		opacity: 0;
		cursor: pointer;
	}
	.switch {
		position: relative;
		width: 44px;
		height: 26px;
		border-radius: 13px;
		background: var(--surface-highest);
		border: 2px solid var(--outline);
		box-sizing: border-box;
		transition: background 0.15s;
	}
	.switch::after {
		content: '';
		position: absolute;
		top: 3px;
		inset-inline-start: 3px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--outline);
		transition: inset-inline-start 0.15s, background 0.15s;
	}
	.auto input:checked + .switch {
		background: var(--primary);
		border-color: var(--primary);
	}
	.auto input:checked + .switch::after {
		inset-inline-start: 21px;
		width: 18px;
		height: 18px;
		top: 2px;
		background: var(--on-primary);
	}
	.auto input:focus-visible + .switch {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}

	/* options */
	.options {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.option {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		min-height: 48px;
		padding: 10px 14px;
		border: 1px solid var(--outline);
		border-radius: 14px;
		background: color-mix(in srgb, var(--surface-lowest) 92%, transparent);
		color: var(--on-surface);
		font: inherit;
		font-size: 1.375rem;
		font-weight: 700;
		cursor: pointer;
	}
	.option:disabled {
		cursor: default;
		color: var(--on-surface);
	}
	.option.ayah {
		min-height: calc(60px + 20px);
		font-size: 17px;
		font-weight: 400;
		line-height: 30px;
	}
	.option-text {
		flex: 1;
		min-width: 0;
		text-align: center;
		overflow-wrap: anywhere;
	}
	.option-text.quran {
		line-height: 30px;
	}
	.option.correct {
		background: var(--correct-container);
		border: 2px solid var(--correct);
	}
	.option.correct .option-text {
		animation: pulse 0.26s ease-in-out infinite alternate;
	}
	.option.wrong {
		background: var(--wrong-container);
		border: 2px solid var(--wrong);
	}
	.option.dimmed {
		opacity: 0.5;
	}
	.mark {
		display: inline-flex;
		flex: none;
	}
	@keyframes pulse {
		from {
			opacity: 1;
		}
		to {
			opacity: 0.45;
		}
	}

	/* result dialog */
	.result {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		text-align: center;
	}
	.trophy {
		display: inline-flex;
		color: var(--gold);
	}
	.result h2 {
		margin: 4px 0;
		font-size: 1.5rem;
	}
	.level-name {
		font-size: 1.1rem;
		font-weight: 600;
	}
	.mode-line {
		font-size: 0.85rem;
	}
	.big {
		margin-top: 8px;
		color: var(--primary);
		font-size: 2.25rem;
		font-weight: 700;
		line-height: 1.3;
	}
	.msg {
		margin: 4px 0;
	}
	.record {
		color: var(--secondary);
		font-weight: 600;
	}
	.actions {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
		margin-top: 16px;
	}
	.actions .btn {
		width: 100%;
	}
	.btn.outlined {
		background: transparent;
		color: var(--primary);
		border: 1px solid var(--outline);
	}
</style>
