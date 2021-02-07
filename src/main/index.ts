import {
	app, BrowserWindow, globalShortcut,
} from 'electron'
import useSharedProcess from '@/main/useSharedProcess'
import useOmniSearch from '@/main/useOmniSearch'

const { platform } = process

const registerShortcut = (win : BrowserWindow) => {
	const keystroke = platform === 'linux' ? 'Alt+Space' : 'Ctrl+Space'

	globalShortcut.register(keystroke, () => {
		if (win.isVisible()) {
			win.hide()
			return
		}

		win.center()
		win.show()
		win.focus()
	})
}

;(async () => {
	await app.whenReady()
	const { messageChannel: sharedProcessChannel } = await useSharedProcess()

	const pluginIsReady = new Promise<void>((resolve) => {
		sharedProcessChannel.register('plugin:initialized', () => {
			resolve()
		})
	})
	await pluginIsReady

	const { window: omniSearchWindow, messageChannel: omniSearchChannel } = await useOmniSearch()
	registerShortcut(omniSearchWindow)

	omniSearchChannel.register('search', ({ term }) => {
		console.log(`search term: ${term}`)
		sharedProcessChannel.sendMessage('plugin:performSearch', { term })
	})
	sharedProcessChannel.register('plugin:performSearch:reply', (data) => {
		console.log(`search reply: [${data.term}] ${JSON.stringify(data.result)}`)
		omniSearchChannel.sendMessage('searchResult', data)
	})
})()

app.on('will-quit', () => {
	globalShortcut.unregisterAll()
})
