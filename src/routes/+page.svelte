<script lang="ts">
	import { asset } from '$app/paths';
	import { getQuran } from '#lib/context.ts';
	import { isEndless, MODES, type ModeKey } from '#lib/domain/game-mode.ts';
	import type { Language } from '#lib/domain/language.ts';
	import { levelsForStyle, STYLES } from '#lib/domain/levels.ts';
	import { percent } from '#lib/domain/stats.ts';
	import { href } from '#lib/nav.ts';
	import { mastered, runStats } from '#lib/progress/progress.ts';
	import { progress } from '#lib/progress/store.svelte.ts';
	import { ar, en } from '#lib/i18n/strings.ts';
	import { setLanguage, strings } from '#lib/settings.svelte.ts';
	import AppTitle from '#lib/ui/AppTitle.svelte';
	import Icon, { type IconName } from '#lib/ui/Icon.svelte';
	import MenuCard from '#lib/ui/MenuCard.svelte';
	import Modal from '#lib/ui/Modal.svelte';
	import OrnamentDivider from '#lib/ui/OrnamentDivider.svelte';

	const quran = getQuran();
	const styleLevels = STYLES.map((s) => levelsForStyle(s, quran));
	const levelTotal = styleLevels.reduce((n, l) => n + l.length, 0);

	const MODE_ICONS: Record<ModeKey, IconName> = {
		regular: 'flag',
		survival: 'local_fire_department',
		lives: 'favorite',
		hafiz: 'psychology'
	};
	const LANGUAGES: { lang: Language; endonym: string; flag: string }[] = [
		{ lang: 'ar', endonym: ar.languageEndonym, flag: ar.languageFlag },
		{ lang: 'en', endonym: en.languageEndonym, flag: en.languageFlag }
	];
	const FONT_LICENSES = [
		{ name: 'Amiri', url: asset('licenses/Amiri-OFL.txt') },
		{ name: 'Inter', url: asset('licenses/Inter-OFL.txt') },
		{ name: 'Rakkas', url: asset('licenses/Rakkas-OFL.txt') },
		{ name: 'Scheherazade New', url: asset('licenses/ScheherazadeNew-OFL.txt') }
	];

	let showLanguage = $state(false);
	let showCredits = $state(false);

	const s = $derived(strings());
	const p = $derived(progress.current);
	const overallTotal = $derived(p.totalCorrect + p.totalWrong);

	function badge(key: ModeKey): { value: string | null; label: string } {
		const mode = MODES.find((m) => m.key === key)!;
		if (isEndless(mode)) {
			const best = runStats(p, key).best;
			return { value: best > 0 ? s.number(best) : null, label: s.best };
		}
		const done = styleLevels.reduce((n, l) => n + mastered(p, l), 0);
		return { value: `${s.number(done)}/${s.number(levelTotal)}`, label: s.mastered };
	}

	function pick(lang: Language): void {
		if (lang !== s.language) setLanguage(lang);
		showLanguage = false;
	}
</script>

<svelte:head><title>{s.appName}</title></svelte:head>

<div class="page home">
	<div class="corner start" dir="ltr">
		<button
			class="corner-btn"
			onclick={() => (showCredits = true)}
			aria-label={s.credits}
		>
			<Icon name="info" />
		</button>
	</div>
	<div class="corner end" dir="ltr">
		<button
			class="corner-btn flag"
			onclick={() => (showLanguage = true)}
			aria-label="{s.languageLabel}: {s.languageEndonym}"
		>
			{s.languageFlag}
		</button>
	</div>

	<div class="head">
		<AppTitle />
		<OrnamentDivider />
	</div>

	{#each MODES as mode (mode.key)}
		{@const b = badge(mode.key)}
		<MenuCard
			icon={MODE_ICONS[mode.key]}
			title={s.gameModeTitle(mode.key)}
			subtitle={s.gameModeSubtitle(mode.key)}
			badge={b.value}
			badgeLabel={b.label}
			href={href('/styles', { mode: mode.key })}
		/>
	{/each}

	<MenuCard
		icon="insights"
		title={s.statistics}
		subtitle={overallTotal === 0
			? s.statisticsHint
			: s.statisticsSummary(percent({ correct: p.totalCorrect, wrong: p.totalWrong }), overallTotal)}
		href={href('/stats')}
	/>
</div>

<Modal fullscreen open={showLanguage} oncancel={() => (showLanguage = false)}>
	<div class="overlay" dir="ltr">
		<button
			class="icon-btn close right"
			onclick={() => (showLanguage = false)}
			aria-label={s.back}
		>
			<Icon name="close" />
		</button>
		<div class="content">
			<span class="big-icon"><Icon name="language" size={40} /></span>
			<div class="langs" role="radiogroup" aria-label={s.languageLabel}>
				{#each LANGUAGES as l (l.lang)}
					<button
						class="lang"
						class:selected={l.lang === s.language}
						role="radio"
						aria-checked={l.lang === s.language}
						aria-label={l.endonym}
						onclick={() => pick(l.lang)}
					>
						<span aria-hidden="true">{l.flag}</span>
					</button>
				{/each}
			</div>
		</div>
	</div>
</Modal>

<Modal fullscreen open={showCredits} oncancel={() => (showCredits = false)}>
	<div class="overlay">
		<button
			class="icon-btn close left"
			onclick={() => (showCredits = false)}
			aria-label={s.back}
		>
			<Icon name="close" />
		</button>
		<div class="content">
			<span class="big-icon"><Icon name="info" size={40} /></span>
			<h2 class="credits-title">{s.credits}</h2>
			<div class="entry">
				<span class="label">{s.creditsQuranText}</span>
				<a href="https://tanzil.net" target="_blank" rel="noopener noreferrer">{s.creditsTanzil}</a>
			</div>
			<div class="entry">
				<span class="label">{s.creditsRecitations}</span>
				<a href="https://everyayah.com" target="_blank" rel="noopener noreferrer">everyayah.com</a>
			</div>
			<div class="entry">
				<span class="label">{s.creditsMutashabihat}</span>
				<a
					href="https://www.aswaatulqurraa.com/mutashabihat/"
					target="_blank"
					rel="noopener noreferrer">{s.creditsAswaatulQurraa}</a
				>
			</div>
			<div class="entry">
				<span class="label">{s.creditsFonts}</span>
				<span class="fonts">
					{#each FONT_LICENSES as f (f.url)}
						<a href={f.url} target="_blank" rel="noopener noreferrer" dir="ltr"
							>{f.name}</a
						>
					{/each}
				</span>
			</div>
		</div>
	</div>
</Modal>

<style>
	.home {
		position: relative;
		padding-inline: max(20px, env(safe-area-inset-left)) max(20px, env(safe-area-inset-right));
	}
	.head {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		margin-block: 32px 4px;
	}
	.corner {
		position: absolute;
		top: max(12px, env(safe-area-inset-top));
		z-index: 1;
	}
	.corner.start {
		left: max(12px, env(safe-area-inset-left));
	}
	.corner.end {
		right: max(12px, env(safe-area-inset-right));
	}
	.corner-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		padding: 0;
		border-radius: 50%;
		border: 1px solid var(--outline-variant);
		background: color-mix(in srgb, var(--surface-lowest) 85%, transparent);
		box-shadow: var(--shadow);
		color: var(--primary);
	}
	.corner-btn.flag {
		font-size: 1.4rem;
	}

	.overlay {
		position: relative;
		min-height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.close {
		position: absolute;
		top: 0;
		z-index: 1;
	}
	.close.left {
		left: 0;
	}
	.close.right {
		right: 0;
	}
	.content {
		width: 100%;
		max-width: 360px;
		padding: 64px 8px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		text-align: center;
	}
	.big-icon {
		color: var(--primary);
		display: flex;
	}
	.credits-title {
		font-size: 1.5rem;
		font-weight: 700;
	}
	.langs {
		display: flex;
		gap: 24px;
	}
	.lang {
		width: 112px;
		height: 112px;
		max-width: 40vw;
		padding: 0;
		border-radius: 24px;
		border: 1px solid var(--outline-variant);
		background: var(--surface-lowest);
		font-size: 56px;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.lang.selected {
		border: 3px solid var(--primary);
		background: var(--primary-container);
	}
	.entry {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
	}
	.label {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--on-surface-variant);
	}
	.entry a {
		color: var(--primary);
		text-decoration: underline;
		font-size: 1.1rem;
		min-height: 32px;
		display: inline-flex;
		align-items: center;
	}
	.fonts {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		column-gap: 16px;
	}
</style>
