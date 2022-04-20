<template>
	<div @mousemove="$emit('hover')" @click="$emit('click')" :class="[style.wrapper, { [style.hover]: hovered }]">
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
		<div :class="style.quickActions" v-if="hovered && (result.quickActions?.length ?? 0)">
			<div
				v-for="(action, idx) in result.quickActions"
				:key="idx"
				:class="style.quickAction"
				@click.stop="$emit('quickAction', action.event)"
			>
				<span v-if="action.icon" :class="style.icon">
					<img :src="action.icon" />
				</span>
				{{ action.title }}
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { SearchResult } from 'einstein'
import { defineComponent, PropType, useCssModule } from 'vue'

export default defineComponent({
	props: {
		result: {
			type: Object as PropType<SearchResult>,
		},
		hovered: {
			type: Boolean,
			default: false,
		},
	},
	emits: [ 'hover', 'click', 'quickAction' ],
	setup: () => ({
		style: useCssModule(),
	}),
})
</script>

<style lang="scss" module>
.wrapper {
	width: 100vw;

	&.hover {
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
	width: 36px;
	height: 36px;
	align-items: center;
	justify-content: center;
	margin-block: 4px;

	& > img {
		max-width: 100%;
		max-height: 100%;
	}
}

.main {
	display: grid;
}

.title {
	margin: 0;
	font-size: 20px;
	font-family: 'Noto Sans CJK TC', 'LiHei Pro', system-ui, sans-serif;
	color: #eee;
	line-height: 24px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.description {
	font-size: 14px;
	color: #999;
	line-height: 16px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.quickActions {
	display: flex;
	padding: 4px 8px;
}

.quickAction {
	display: inline-flex;
	border-radius: 8px;
	border: 1px solid #eee;
	color: #eee;
	font-size: 12px;
	padding: 4px 8px;
	margin: 0 4px;
	align-items: center;
	cursor: pointer;

	.icon {
		display: inline-flex;
		width: 12px;
		height: 12px;
		margin-block: 0px;
		margin-inline-end: 4px;
	}
}
</style>
