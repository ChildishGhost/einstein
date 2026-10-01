<template>
	<ResultItem
		v-for="(result, row) in launcher.state.results.slice(first, first + rows)"
		:key="first + row"
		:result="result"
		:icon="launcher.iconSource(result.icon)"
		:selected="first + row === launcher.state.selected"
		@hover="launcher.select(first + row)"
		@click="click(first + row)"
	/>
</template>

<script setup lang="ts">
import { ref, watchEffect } from '@gpui-native/vue'

import type { createLauncher } from '../launcher.ts'
import ResultItem from './ResultItem.vue'

/** `rows` is how many results fit the window; they slide to keep the selection in view (no scrollbar, RFC-0007/R5). */
const props = defineProps<{ launcher: ReturnType<typeof createLauncher>; rows: number }>()
const { launcher } = props

const first = ref(0)
watchEffect(() => {
	const { results, selected } = launcher.state
	first.value = Math.max(0, Math.min(first.value, selected, results.length - props.rows), selected - props.rows + 1)
})

// RFC-0004/R10: a click activates the result under the pointer.
const click = (index: number) => {
	launcher.select(index)
	launcher.activate()
}
</script>
