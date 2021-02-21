import { inject, onMounted, onUnmounted, ref, watch } from 'vue'

import { SearchResult } from '@/api/searchEngine'
import { MessageTunnel } from '@/common/message/MessageTunnel'
import PerformSearch from '@/common/types/PerformSearch'
import PerformSearchReply from '@/common/types/PerformSearchReply'

export default () => {
	const withMessageTunnel = inject<Promise<MessageTunnel>>('$msg')
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
		withMessageTunnel.then((msg) => {
			msg.sendMessage<PerformSearch>('search', { term: value })
		}),
	)

	onMounted(() =>
		withMessageTunnel.then((msg) => {
			msg.register('searchResult', resultHandler)
		}),
	)

	onUnmounted(() =>
		withMessageTunnel.then((msg) => {
			msg.unregister('searchResult', resultHandler)
		}),
	)

	return {
		term,
		result,
	}
}
