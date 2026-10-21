<script lang="ts">
	import ornament from '#lib/assets/images/divider_ornament.png';
</script>

<!-- The gold ornamental rule; the PNG is tinted via a mask. -->
<div class="wrap" aria-hidden="true">
	<div class="orn" style:--img="url({ornament})"></div>
</div>

<style>
	.wrap {
		display: flex;
		justify-content: center;
		width: 100%;
	}
	.orn {
		width: 80%;
		height: 18px;
		margin-block: 2px;
		background: var(--gold);
		mask: var(--img) center / contain no-repeat;
		-webkit-mask: var(--img) center / contain no-repeat;
	}
</style>
