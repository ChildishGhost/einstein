<template>
<div :class="style.container">
	<aside :class="style.icon">
		<img src="data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==" />
	</aside>
	<main :class="style.main">
		<h1 :class="style.title">
			{{ result.title }}
		</h1>
		<div :class="style.description">
			{{ result.description }}
		</div>
	</main>
</div>
</template>

<script lang="ts">
import { Suggestion } from '@/api/searchEngine'
import { defineComponent, PropType, useCssModule } from 'vue'

export default defineComponent({
	props: {
		result: {
			type: Object as PropType<Suggestion>,
		},
	},
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
	cursor: pointer;

	&.hover, &:hover {
		background-color: rgba(255, 255, 255, 0.3);
	}
}

.icon {
	display: flex;
	width: 32pt;
	height: 32pt;
	align-items: center;
	justify-content: center;
	margin-inline-end: 8px;
	margin-block: 3pt;
}

.title {
	margin: 0;
	font-size: 20pt;
	color: #eee;
	line-height: 1;
}

.description {
	font-size: 16pt;
	color: #999;
	line-height: 1;
}
</style>
