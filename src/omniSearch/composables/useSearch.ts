import { SearchResult } from '@/api/searchEngine'
import { MessageChannel } from '@/common/MessageChannel'
import PerformSearch from '@/common/types/PerformSearch'
import PerformSearchReply from '@/common/types/PerformSearchReply'
import {
	inject,
	onUnmounted,
	ref,
	watch,
} from 'vue'

export default () => {
	const isReady = ref(false)
	const term = ref('')
	const result = ref([] as SearchResult)
	const resultHandler = (data: PerformSearchReply) => {
		if (data.term === term.value) {
			if (data.result) {
				result.value = data.result
			} else {
				result.value = []
			}
		}
	}
	let msg: MessageChannel = null

	inject<Promise<MessageChannel>>('$msg').then((m) => {
		msg = m
		msg.register('searchResult', resultHandler)
		isReady.value = true
	})

	watch(term, (t) => {
		if (isReady.value) {
			msg.sendMessage<PerformSearch>('search', { term: t })
		}
	})

	onUnmounted(() => {
		if (msg) {
			msg.unregister('searchResult', resultHandler)
		}
	})

	return {
		isReady,
		term,
		result,
	}
}
