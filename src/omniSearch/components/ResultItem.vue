<template>
<div :class="style.container">
	<aside :class="style.icon">
		<img src="data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==" />
	</aside>
	<main :class="style.main">
		<h1 :class="style.title">
			123
		</h1>
		<div :class="style.description">
			234
		</div>
	</main>
</div>
</template>

<script lang="ts">
import { defineComponent, useCssModule } from 'vue'

export default defineComponent({
	setup: () => ({
		style: useCssModule(),
	}),
})
</script>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 4px 8px;

	&.hover, &:hover {
		background-color: rgba(255, 255, 255, 0.3);
	}
}

.icon {
	display: flex;
	width: 48px;
	height: 48px;
	align-items: center;
	justify-content: center;
	margin-inline-end: 8px;
}

.title {
	margin: 0;
	font-size: 20pt;
	color: #eee;
}

.description {
	font-size: 16pt;
	color: #999;
}
</style>
