<template>
	<div>
		<input ref="searchBoxRef"
			v-model="searchTerm"
			:class="style.searchBox"
			@keydown.esc.prevent="cancelSearch"
			@keydown.tab.exact.prevent="completeInput"
			@keydown.up.exact.prevent="moveCursor(-1)"
			@keydown.down.exact.prevent="moveCursor(1)"
			/>
	</div>
	<ResultList v-if="searchTerm !== ''" :results="searchResult" />
</template>

<script lang="ts">
import {
	defineComponent, inject, nextTick, onMounted, ref, useCssModule, watch,
} from 'vue'
import useWindowControl from '@/omniSearch/composables/useWindowControl'
import ResultList from '@/omniSearch/components/ResultList.vue'
import useSearch from '@/omniSearch/composables/useSearch'

export default defineComponent({
	components: {
		ResultList,
	},
	setup() {
		const { calculateDesiredSize, closeWindow } = useWindowControl(inject('$app'))
		const { isReady, term, result } = useSearch()
		const searchTerm = ref('')
		const searchBoxRef = ref()

		watch(searchTerm, (val, oldVal) => {
			if (val === oldVal) { return }
			if (!isReady.value) { return }
			term.value = val
		})
		watch(isReady, () => {
			term.value = searchTerm.value
		})
		watch(result, () => {
			nextTick(calculateDesiredSize)
		})

		onMounted(() => {
			searchBoxRef.value.focus()
		})

		const moveCursor = (_offset: number) => {

		}

		const completeInput = () => {}

		return {
			style: useCssModule(),
			searchTerm,
			searchResult: result,
			searchBoxRef,
			cancelSearch: closeWindow,
			moveCursor,
			completeInput,
		}
	},
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
