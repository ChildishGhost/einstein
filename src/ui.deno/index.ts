import { fromFileUrl } from '@std/path'

import { connectMessageTunnel } from '../common/message/ProcessMessageProtocol.deno.ts'
import { createLauncher } from './launcher.ts'

type Launcher = ReturnType<typeof createLauncher>
type WindowModule = {
	reactive: <T extends object>(state: T) => T
	openWindow: (launcher: Launcher, report: { resize: (height: number) => void }, denoConfig: string) => {
		setVisible: (visible: boolean) => void
	}
}

process.on('message', (message: unknown) => {
	if ((message as { type?: unknown } | null)?.type === 'ui:exit') {
		process.exit()
	}
})

// The window is Vue rendered by gpui-native, whose packages only load through the Vite bundle (RFC-0008/R9).
const bundle = new URL('./dist/window.mjs', import.meta.url)
const loadWindow = async () => {
	try {
		return await import(bundle.href) as WindowModule
	} catch (error) {
		console.error(
			'the launcher window failed to load; build it with `deno task native:build`, `deno task install:ui` and `deno task build:ui`\n',
			error,
		)
		// Main counts the exit as a crash and restarts the UI process (RFC-0008/R7).
		process.exit(1)
	}
}

const tunnel = await connectMessageTunnel('ui')
const window = await loadWindow()
const launcher = createLauncher(tunnel, (visible) => view.setVisible(visible), window.reactive)
// Resolved outside the bundle, so the hint names this checkout's deno.json and works from any directory.
const denoConfig = fromFileUrl(new URL('../../deno.json', import.meta.url))
const view = window.openWindow(
	launcher,
	{ resize: (height) => tunnel.sendMessage('resizeWindow', { height }) },
	denoConfig,
)
