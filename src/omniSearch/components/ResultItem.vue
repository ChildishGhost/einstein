<template>
<div :class="style.wrapper">
	<div :class="style.container">
		<aside :class="style.icon">
			<img v-if="result.icon" :src="result.icon" />
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
.wrapper {
	width: 100vw;

	&.hover, &:hover {
		background-color: rgba(255, 255, 255, 0.3);
	}
}

.container {
	display: grid;
	grid-template-columns: max-content auto;
	align-items: center;
	column-gap: 8px;
	margin: 4px 8px;
	cursor: pointer;
}

.icon {
	display: flex;
	flex: 0 0 32pt;
	width: 32pt;
	height: 32pt;
	align-items: center;
	justify-content: center;
	margin-block: 3pt;
}

.main {
	display: grid;
}

.title {
	margin: 0;
	font-size: 20pt;
	color: #eee;
	line-height: 1;
	white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.description {
	font-size: 16pt;
	color: #999;
	line-height: 1;
	white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
