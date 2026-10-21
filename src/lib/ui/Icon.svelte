<script lang="ts" module>
	import arrow_back from '@material-design-icons/svg/filled/arrow_back.svg?raw';
	import arrow_forward from '@material-design-icons/svg/filled/arrow_forward.svg?raw';
	import menu_book from '@material-design-icons/svg/filled/menu_book.svg?raw';
	import arrow_drop_down from '@material-design-icons/svg/filled/arrow_drop_down.svg?raw';
	import cancel from '@material-design-icons/svg/filled/cancel.svg?raw';
	import check_circle from '@material-design-icons/svg/filled/check_circle.svg?raw';
	import close from '@material-design-icons/svg/filled/close.svg?raw';
	import delete_sweep from '@material-design-icons/svg/filled/delete_sweep.svg?raw';
	import emoji_events from '@material-design-icons/svg/filled/emoji_events.svg?raw';
	import favorite from '@material-design-icons/svg/filled/favorite.svg?raw';
	import favorite_border from '@material-design-icons/svg/filled/favorite_border.svg?raw';
	import flag from '@material-design-icons/svg/filled/flag.svg?raw';
	import info from '@material-design-icons/svg/filled/info.svg?raw';
	import insights from '@material-design-icons/svg/filled/insights.svg?raw';
	import language from '@material-design-icons/svg/filled/language.svg?raw';
	import local_fire_department from '@material-design-icons/svg/filled/local_fire_department.svg?raw';
	import pause from '@material-design-icons/svg/filled/pause.svg?raw';
	import play_arrow from '@material-design-icons/svg/filled/play_arrow.svg?raw';
	import psychology from '@material-design-icons/svg/filled/psychology.svg?raw';
	import quiz from '@material-design-icons/svg/filled/quiz.svg?raw';
	import share from '@material-design-icons/svg/filled/share.svg?raw';

	const ICONS = {
		arrow_back,
		arrow_forward,
		menu_book,
		arrow_drop_down,
		cancel,
		check_circle,
		close,
		delete_sweep,
		emoji_events,
		favorite,
		favorite_border,
		flag,
		info,
		insights,
		language,
		local_fire_department,
		pause,
		play_arrow,
		psychology,
		quiz,
		share
	};

	export type IconName = keyof typeof ICONS;
</script>

<script lang="ts">
	let { name, size = 24 }: { name: IconName; size?: number } = $props();
</script>

<span
	class="icon"
	class:mirror={name === 'arrow_back' || name === 'arrow_forward'}
	style:width="{size}px"
	style:height="{size}px"
	aria-hidden="true">{@html ICONS[name]}</span
>

<style>
	.icon {
		display: inline-flex;
		flex: none;
	}
	.icon :global(svg) {
		width: 100%;
		height: 100%;
		fill: currentColor;
	}
	:global([dir='rtl']) .mirror {
		transform: scaleX(-1);
	}
</style>
