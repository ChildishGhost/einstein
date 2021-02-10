<template>
	<ResultItem
		v-for="(result, idx) in results"
		:key="idx"
		:result="result"
		:hovered="idx === hoveredIndex"
		@hover="hoverItem(idx)"
	/>
</template>

<script lang="ts">
import {
	defineComponent,
	PropType,
	ref,
	toRefs,
	watch,
} from 'vue'
import ResultItem from '@/omniSearch/components/ResultItem.vue'
import { SearchResult } from '@/api/searchEngine'

export default defineComponent({
	components: {
		ResultItem,
	},
	props: {
		results: {
			type: Array,
			default: () => [] as PropType<SearchResult[]>,
		},
		modelValue: {
			type: Number,
			required: false,
			default: -1,
		},
	},
	emits: [ 'update:modelValue' ],
	setup(props, { emit }) {
		const { modelValue } = toRefs(props)
		const hoveredIndex = ref(props.modelValue)

		const hoverItem = (idx: number) => {
			if (idx === hoveredIndex.value) { return }
			hoveredIndex.value = idx
			emit('update:modelValue', idx)
		}

		watch(modelValue, (val) => {
			hoveredIndex.value = val
		})

		return {
			hoverItem,
			hoveredIndex,
		}
	},
})
</script>
