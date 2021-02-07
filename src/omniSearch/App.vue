<template>
	<div>
		<input v-model="searchTerm" :class="style.searchBox" ref="searchBoxRef" />
	</div>
	<ResultList v-if="searchTerm !== ''" :results="searchResult" />
</template>

<script lang="ts">
import {
	defineComponent, inject, nextTick, onMounted, ref, useCssModule, watch,
} from 'vue'
import useWindowSize from '@/omniSearch/composables/useWindowSize'
import ResultList from '@/omniSearch/components/ResultList.vue'
import useSearch from '@/omniSearch/composables/useSearch'

export default defineComponent({
	components: {
		ResultList,
	},
	setup() {
		const { calculateDesiredSize } = useWindowSize(inject('$app'))
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
			console.log(result)
			nextTick(calculateDesiredSize)
		})

		onMounted(() => {
			searchBoxRef.value.focus()
		})

		return {
			style: useCssModule(),
			searchTerm,
			searchResult: result,
			searchBoxRef,
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
