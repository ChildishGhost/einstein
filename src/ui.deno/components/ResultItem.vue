<template>
	<Row :style="selected ? selectedRow : row" @mouseEnter="$emit('hover')" @mouseMove="$emit('hover')" @click="$emit('click')">
		<View :style="iconBox">
			<Image v-if="icon" :src="icon" objectFit="contain" :style="{ width: iconSize, height: iconSize }" />
		</View>
		<Column :style="main">
			<Text :style="title">{{ result.title }}</Text>
			<Text :style="description">{{ result.description }}</Text>
		</Column>
	</Row>
</template>

<script setup lang="ts">
import { Column, Image, Row, type StyleDesc, Text, View } from '@gpui-native/vue'
import type { SearchResult } from '../../api/searchEngine.ts'

import { iconSize, rowHeight } from '../metrics.ts'

// `icon` is `launcher.iconSource(...)`: only `data:` URLs and files resolved by main reach `<img>` (RFC-0008/R4).
defineProps<{ result: SearchResult; icon?: string; selected: boolean }>()
defineEmits<{ hover: []; click: [] }>()

const row: StyleDesc = {
	width: '100%',
	height: rowHeight,
	flexShrink: 0,
	alignItems: 'center',
	columnGap: 8,
	paddingLeft: 8,
	paddingRight: 8,
	cursor: 'pointer',
}
const selectedRow: StyleDesc = { ...row, background: 'rgba(255, 255, 255, 0.3)' }
const iconBox: StyleDesc = {
	display: 'flex',
	width: iconSize,
	height: iconSize,
	flexShrink: 0,
	alignItems: 'center',
	justifyContent: 'center',
}
const main: StyleDesc = { flexGrow: 1, flexShrink: 1, minWidth: 0, overflow: 'hidden' }
const line: StyleDesc = { whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }
const title: StyleDesc = { ...line, fontSize: 20, lineHeight: 24, color: '#eeeeee' }
const description: StyleDesc = { ...line, fontSize: 14, lineHeight: 16, color: '#999999' }
</script>
