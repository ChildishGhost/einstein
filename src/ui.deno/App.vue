<template>
	<View :style="style">
		<SearchBox :launcher="launcher" />
		<ResultList v-if="launcher.state.term !== ''" :launcher="launcher" :rows="layout.rows" />
	</View>
</template>

<script setup lang="ts">
import { type StyleDesc, View } from '@gpui-native/vue'

import ResultList from './components/ResultList.vue'
import SearchBox from './components/SearchBox.vue'
import type { createLauncher } from './launcher.ts'
import { fontFamily } from './metrics.ts'

defineProps<{ launcher: ReturnType<typeof createLauncher>; layout: { rows: number } }>()

const style: StyleDesc = {
	display: 'flex',
	flexDirection: 'column',
	width: '100%',
	height: '100%',
	background: '#333333',
	fontFamily,
	overflow: 'hidden',
	userSelect: 'none',
}
</script>
