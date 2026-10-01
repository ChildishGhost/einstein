<template>
	<input
		ref="input"
		:value="launcher.state.term"
		:style="style"
		:theme="theme"
		autoFocus
		@change="launcher.input($event.value ?? '')"
		@key-down="keyDown"
		@key-down.tab.exact.stop="launcher.complete()"
		@submit="launcher.activate()"
	/>
</template>

<script setup lang="ts">
import {
	type EventPayload,
	type GpuiTheme,
	type StyleDesc,
	useElementRef,
	useGpuiWindow,
	watch,
} from '@gpui-native/vue'

import type { createLauncher } from '../launcher.ts'
import { fontFamily, inputFontSize, inputHeight, inputLineHeight, inputPadding } from '../metrics.ts'

const { launcher } = defineProps<{ launcher: ReturnType<typeof createLauncher> }>()

const input = useElementRef()
const window = useGpuiWindow()
// GPUI focuses `autoFocus` only once; a reopened window must focus the input again (RFC-0004/R2).
watch(() => launcher.state.shown, (shown) => {
	if (shown && input.value) window.focus(input.value)
}, { flush: 'post' })

type Modifiers = { ctrl?: boolean; alt?: boolean; shift?: boolean; cmd?: boolean }

// RFC-0004/R8, R11; Tab (R9) is captured above, Enter arrives as `submit` (R10).
const keyDown = (event: EventPayload) => {
	const { ctrl, alt, shift, cmd } = (event as { modifiers?: Modifiers }).modifiers ?? {}
	const plain = !ctrl && !alt && !shift && !cmd
	const ctrlOnly = ctrl && !alt && !shift && !cmd
	const key = event.key?.toLowerCase()
	if (key === 'escape') launcher.cancel()
	else if ((plain && key === 'up') || (ctrlOnly && key === 'p')) launcher.move(-1)
	else if ((plain && key === 'down') || (ctrlOnly && key === 'n')) launcher.move(1)
}

const style: StyleDesc = {
	width: '100%',
	height: inputHeight,
	flexShrink: 0,
	padding: inputPadding,
	fontSize: inputFontSize,
	lineHeight: inputLineHeight,
	fontFamily,
	color: '#ffffff',
	background: 'transparent',
	borderWidth: 0,
}
const theme: GpuiTheme = { appearance: 'dark', text: '#ffffff', caret: '#ffffff' }
</script>
