<template>
	<div>
		<SearchBox
			ref="searchBoxRef"
			v-model="searchTerm"
			@update:result="searchResult = $event"
			@search:cancel="closeWindow"
			@search:completion="completeInput"
			@search:next="moveCursor(1)"
			@search:previous="moveCursor(-1)"
			@search:go="execute"
		/>
	</div>
	<ResultList v-if="searchTerm !== ''" v-model="selectedItemIndex" :results="searchResult" />
</template>

<script lang="ts">
import {
	defineComponent, inject, nextTick, onMounted, ref, toRaw, watch,
} from 'vue'
import { SearchResult } from '@/api/searchEngine'
import { MessageChannel } from '@/common/MessageChannel'
import PluginEvent from '@/common/types/PluginEvent'
import useWindowControl from '@/omniSearch/composables/useWindowControl'
import ResultList from '@/omniSearch/components/ResultList.vue'
import SearchBox from '@/omniSearch/components/SearchBox.vue'
import { WithPluginTagged } from '@/api/plugin'

export default defineComponent({
	components: {
		ResultList,
		SearchBox,
	},
	setup() {
		const { calculateDesiredSize, closeWindow: realCloseWindow } = useWindowControl(inject('$app'))
		const withMessageChannel = inject<Promise<MessageChannel>>('$msg')
		const searchTerm = ref('')
		const searchResult = ref<WithPluginTagged<SearchResult>[]>([])
		const searchBoxRef = ref()
		const selectedItemIndex = ref(0)
		const closeWindow = () => {
			searchTerm.value = ''
			realCloseWindow()
		}

		watch(searchResult, () => {
			nextTick(calculateDesiredSize)
		})

		onMounted(() => {
			searchBoxRef.value.focus()
		})

		const moveCursor = (offset: number) => {
			const count = searchResult.value.length
			selectedItemIndex.value = (selectedItemIndex.value + offset + count) % count
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

		const execute = () => {
			if (selectedItemIndex.value >= searchResult.value.length) { return }

			const suggestion = searchResult.value[selectedItemIndex.value]
			if (!suggestion.event) { return }

			withMessageChannel.then((msg) => {
				msg.sendMessage<PluginEvent>('plugin:event', {
					...toRaw(suggestion.event),
					pluginUid: suggestion.pluginUid,
				})
			})

			closeWindow()
		}

		return {
			closeWindow,
			searchTerm,
			searchResult,
			searchBoxRef,
			moveCursor,
			completeInput,
			selectedItemIndex,
			execute,
		}
	},
})
</script>
