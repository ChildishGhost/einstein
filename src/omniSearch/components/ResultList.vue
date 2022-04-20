<template>
	<ResultItem
		v-for="(result, idx) in results"
		:key="idx"
		:result="result"
		:hovered="idx === hoveredIndex"
		@hover="hoverItem(idx as number)"
		@click="clickItem(idx as number)"
		@quickAction="$emit('quickAction', { ...$event, pluginUid: result.pluginUid })"
	/>
</template>

<script setup lang="ts">
import { SearchResult, WithPluginTagged } from 'einstein'
import { ref, toRefs, watch } from 'vue'

import ResultItem from '@/omniSearch/components/ResultItem.vue'

const props = withDefaults(defineProps<{
	results: WithPluginTagged<SearchResult>[]
	modelValue: number
}>(), {
	results: () => [] as WithPluginTagged<SearchResult>[],
	modelValue: -1,
})

const emit = defineEmits([ 'update:modelValue', 'click', 'quickAction' ])

const { modelValue } = toRefs(props)
const hoveredIndex = ref(props.modelValue)

const hoverItem = (idx: number) => {
	if (idx === hoveredIndex.value) {
		return
	}
	hoveredIndex.value = idx
	emit('update:modelValue', idx)
}

const clickItem = (idx: number) => {
	if (idx !== hoveredIndex.value) {
		hoverItem(idx)
	}
	emit('click')
}

watch(modelValue, (val) => {
	hoveredIndex.value = val
})
</script>
