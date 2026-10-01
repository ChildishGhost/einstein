import { createNativeRenderer, type EventPayload, h, reactive, render, startFrameLoop, watch } from '@gpui-native/vue'

import { appId } from '../common/appId.ts'
import App from './App.vue'
import type { createLauncher } from './launcher.ts'
import { inputHeight, layerMarginTop, rowHeight, screenMargin, width } from './metrics.ts'

type Launcher = ReturnType<typeof createLauncher>
type WindowControl = {
	showWindow(): void
	hideWindow(): void
	setWindowSize(width: number, height: number): void
	/** gpui-native patch 0010: `[x, y, width, height]` of the window's display, in logical px. */
	getDisplayBounds(): number[] | null
	registerGlobalShortcuts(appId: string, shortcutsJson: string): void
}

export { reactive }

/** The launcher window (RFC-0008/R10), owned by the UI process and started hidden. */
export const openWindow = (
	launcher: Launcher,
	report: { resize: (height: number) => void },
	denoConfig: string,
) => {
	let focused = false
	const place = reactive({ display: null as number[] | null, top: undefined as number | undefined })
	const layout = reactive({ rows: 0 })
	const control = (action: (window: WindowControl) => void) => {
		try {
			action(native as unknown as WindowControl)
		} catch (error) {
			console.error('launcher window:', error)
		}
	}

	const onEvent = (event: EventPayload) => {
		switch (event.eventType) {
			case 'globalShortcut':
				// RFC-0004/R2: the shortcut hides only a focused window; otherwise it shows and focuses it.
				if (launcher.state.shown && focused) launcher.hide()
				else if (launcher.state.shown) control((window) => window.showWindow())
				else launcher.show()
				break
			case 'globalShortcutStatus': {
				const status = JSON.parse(event.value ?? '{}')
				if (status.state === 'bound') console.log('global shortcut bound:', event.value)
				else {
					console.error(
						`global shortcut ${status.state}; bind \`einstein --toggle\` (from source: \`deno task --config ${denoConfig} dev --toggle\`) instead:`,
						event.value,
					)
				}
				break
			}
			case 'windowFocus':
				focused = true
				break
			case 'windowBlur':
				focused = false
				break
			case 'windowMove':
				// A layer surface reports its bounds at 0,0 (Wayland); it sits `layerMarginTop` below the display top.
				place.top = event.x || event.y ? event.y : undefined
				locate()
				break
			case 'windowClose':
				focused = false
				launcher.hide()
		}
	}

	const native = createNativeRenderer(onEvent)
	// Hidden at start, GPUI has no UI thread yet to take window key events, which the launcher does not use.
	Object.assign(native, { setWindowKeyEvents: undefined })
	const locate = () => control((window) => place.display = window.getDisplayBounds())
	render(h(App, { launcher, layout }), {
		renderer: native,
		title: 'Einstein',
		width,
		height: inputHeight,
		show: false,
		kind: 'layerShell',
		// On-demand surfaces only get the keyboard on a click; showing must focus the input (RFC-0004/R2).
		layerKeyboard: 'exclusive',
		decorations: 'client',
		appId,
	})
	startFrameLoop(native, { keepAlive: true })

	// RFC-0007/R2 animates like Electron's setSize(…, animate) on macOS: NSWindowResizeTime (0.2 s per 150 px), ease-in-out.
	let applied = inputHeight
	let frame: number | undefined
	const resizeTo = (target: number) => {
		clearTimeout(frame)
		const from = applied
		const start = performance.now()
		const duration = Math.abs(target - from) / 150 * 200
		const step = () => {
			const t = duration ? Math.min(1, (performance.now() - start) / duration) : 1
			const eased = t < 0.5 ? 2 * t * t : 1 - (2 - 2 * t) ** 2 / 2
			applied = Math.round(from + (target - from) * eased)
			control((window) => window.setWindowSize(width, applied))
			if (t < 1) frame = setTimeout(step, 1000 / 60)
		}
		step()
	}
	// Caps the window to whole rows that fit the display; the list then slides to keep the selection in view.
	const rows = () => {
		const count = launcher.state.term ? launcher.state.results.length : 0
		if (!place.display) return count
		const [, y, , displayHeight] = place.display
		const top = place.top ?? y + layerMarginTop
		const fit = Math.floor((y + displayHeight - screenMargin - top - inputHeight) / rowHeight)
		return Math.min(count, Math.max(1, fit))
	}
	watch(rows, (rows) => layout.rows = rows, { immediate: true })
	watch(() => launcher.state.shown, (shown) => shown && locate())
	const height = () => inputHeight + layout.rows * rowHeight
	watch(height, (height) => {
		resizeTo(height)
		report.resize(height)
	}, { immediate: true })

	control((window) =>
		window.registerGlobalShortcuts(
			appId,
			JSON.stringify([{ id: 'toggle', accelerator: 'Alt+Space', description: 'Show or hide Einstein' }]),
		)
	)

	return {
		setVisible(visible: boolean) {
			if (!visible) focused = false
			control((window) => visible ? window.showWindow() : window.hideWindow())
		},
	}
}
