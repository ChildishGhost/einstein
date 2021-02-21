import { inject, onMounted, onUnmounted, ref, watch } from 'vue'

import { SearchResult } from '@/api/searchEngine'
import { MessageChannel } from '@/common/MessageChannel'
import PerformSearch from '@/common/types/PerformSearch'
import PerformSearchReply from '@/common/types/PerformSearchReply'

export default () => {
	const withMessageChannel = inject<Promise<MessageChannel>>('$msg')
	const term = ref('')
	const result = ref<SearchResult[]>([])
	const resultHandler = (data: PerformSearchReply) => {
		if (data.term === term.value) {
			if (data.result) {
				result.value = data.result
			} else {
				result.value = []
			}
		}
	}

	watch(term, (value) =>
		withMessageChannel.then((msg) => {
			msg.sendMessage<PerformSearch>('search', { term: value })
		}),
	)

	onMounted(() =>
		withMessageChannel.then((msg) => {
			msg.register('searchResult', resultHandler)
		}),
	)

	onUnmounted(() =>
		withMessageChannel.then((msg) => {
			msg.unregister('searchResult', resultHandler)
		}),
	)

	return {
		term,
		result,
	}
}
