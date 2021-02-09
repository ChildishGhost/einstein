<template>
	<div>
		<SearchBox ref="searchBoxRef"
			v-model="searchTerm"
			@search:cancel="closeSearch"
			@update:result="searchResult = $event"
			@search:completion="completeInput"
			@search:next="moveCursor(1)"
			@search:previous="moveCursor(-1)"
			/>
	</div>
	<ResultList
		v-if="searchTerm !== ''"
		v-model="selectedItemIndex"
		:results="searchResult"
		/>
</template>

<script lang="ts">
import {
	defineComponent, inject, nextTick, onMounted, ref, watch,
} from 'vue'
import { SearchResult } from '@/api/searchEngine'
import useWindowControl from '@/omniSearch/composables/useWindowControl'
import ResultList from '@/omniSearch/components/ResultList.vue'
import SearchBox from '@/omniSearch/components/SearchBox.vue'

export default defineComponent({
	components: {
		ResultList,
		SearchBox,
	},
	setup() {
		const { calculateDesiredSize, closeWindow } = useWindowControl(inject('$app'))
		const searchTerm = ref('')
		const searchResult = ref<SearchResult[]>([])
		const searchBoxRef = ref()
		const selectedItemIndex = ref(0)

		watch(searchResult, () => {
			nextTick(calculateDesiredSize)
		})

		onMounted(() => {
			searchBoxRef.value.focus()
		})

		const moveCursor = (_offset: number) => {

		}

		const completeInput = () => {
			if (selectedItemIndex.value >= searchResult.value.length) { return }

			const suggestion = searchResult.value[selectedItemIndex.value]

			if (suggestion.completion) {
				searchTerm.value = suggestion.completion
				return
			}

			searchTerm.value = suggestion.title
		}

		return {
			searchTerm,
			searchResult,
			searchBoxRef,
			cancelSearch: closeWindow,
			moveCursor,
			completeInput,
			selectedItemIndex,
		}
	},
})
</script>
