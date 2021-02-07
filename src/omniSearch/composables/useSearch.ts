import { MessageChannel } from '@/common/MessageChannel'
import {
	inject,
	onUnmounted,
	ref,
	watch,
} from 'vue'

export default () => {
	const isReady = ref(false)
	const term = ref('')
	const result = ref([])
	const resultHandler = (data: any) => {
		if (data.term === term.value) {
			if (data.result) {
				result.value = data.result.suggestions
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
			msg.sendMessage('search', { term: t })
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
