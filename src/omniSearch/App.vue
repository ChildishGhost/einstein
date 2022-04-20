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
	<ResultList
		v-if="searchTerm !== ''"
		v-model="selectedItemIndex"
		:results="searchResult"
		@click="execute"
		@quickAction="executeQuickAction"
	/>
</template>

<script setup lang="ts">
import { WithPluginTagged, SearchResult } from 'einstein'
import { inject, nextTick, onMounted, ref, toRaw, watch } from 'vue'

import { MessageTunnel } from '@/common/message/MessageTunnel'
import PluginEvent from '@/common/types/PluginEvent'
import ResultList from '@/omniSearch/components/ResultList.vue'
import SearchBox from '@/omniSearch/components/SearchBox.vue'
import useWindowControl from '@/omniSearch/composables/useWindowControl'

const { calculateDesiredSize, closeWindow: realCloseWindow } = useWindowControl(inject('$app'))
const withMessageTunnel = inject<Promise<MessageTunnel>>('$msg')
const searchTerm = ref('')
const searchResult = ref<WithPluginTagged<SearchResult>[]>([])
const searchBoxRef = ref<InstanceType<typeof SearchBox>>()
const selectedItemIndex = ref(0)
const closeWindow = () => {
	searchTerm.value = ''
	realCloseWindow()
}

watch(searchResult, () => {
	nextTick(calculateDesiredSize)
})

onMounted(() => {
	searchBoxRef.value?.focus()
})

withMessageTunnel.then((msg) => {
	msg.register('beforeShow', () => {
		calculateDesiredSize()
	})
})

const moveCursor = (offset: number) => {
	const count = searchResult.value.length
	selectedItemIndex.value = (selectedItemIndex.value + offset + count) % count
}

const completeInput = () => {
	if (selectedItemIndex.value >= searchResult.value.length) {
		return
	}

	const suggestion = searchResult.value[selectedItemIndex.value]

	if (suggestion.completion) {
		searchTerm.value = suggestion.completion
		return
	}

	searchTerm.value = suggestion.title
}

const execute = () => {
	if (selectedItemIndex.value >= searchResult.value.length) {
		return
	}

	const suggestion = searchResult.value[selectedItemIndex.value]
	if (!suggestion.event) {
		if (suggestion.completion) {
			completeInput()
		}
		return
	}

	withMessageTunnel.then((msg) => {
		msg.sendMessage<PluginEvent>('plugin:event', {
			...toRaw(suggestion.event),
			pluginUid: suggestion.pluginUid,
		})
	})

	closeWindow()
}

const executeQuickAction = (event: any) => {
	withMessageTunnel.then((msg) => {
		msg.sendMessage<PluginEvent>('plugin:event', {
			...toRaw(event),
		})
	})

	closeWindow()
}
</script>
