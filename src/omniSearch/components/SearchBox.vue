<template>
	<input
		ref="inputRef"
		v-model="term"
		:class="style.searchBox"
		@keydown.esc.prevent="$emit('search:cancel')"
		@keydown.tab.exact.prevent="$emit('search:completion')"
		@keydown.up.exact.prevent="$emit('search:previous')"
		@keydown.down.exact.prevent="$emit('search:next')"
		@keydown.enter.exact.prevent="$emit('search:go')"
	/>
</template>

<script setup lang="ts">
import { ref, toRefs, useCssModule, watch } from 'vue'

import useSearch from '@/omniSearch/composables/useSearch'

const props = withDefaults(defineProps<{
	modelValue: string
}>(), {
	modelValue: ''
})

const emit = defineEmits([
	'update:modelValue',
	'update:result',
	'search:cancel',
	'search:completion',
	'search:next',
	'search:previous',
	'search:go',
])

const style = useCssModule()
const { modelValue } = toRefs(props)
const { term, result } = useSearch()
const inputRef = ref(null)

watch(modelValue, (val) => {
	term.value = val
})
watch(term, (val) => emit('update:modelValue', val))
watch(result, (val) => {
	emit('update:result', val)
})

defineExpose({
	focus: () => inputRef.value.focus()
})
</script>

<style lang="scss" module>
.search-box {
	outline: none;
	font-size: 24pt;
	color: #ffffff;
	background-color: transparent;
	border: 0;
	padding: 8px;
}
</style>
