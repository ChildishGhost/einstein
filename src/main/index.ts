import {
	app, BrowserWindow, globalShortcut, Menu, MenuItemConstructorOptions,
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

const createApp = async () => {
	const {
		window: sharedProcessWindow,
		messageChannel: sharedProcessChannel,
	} = await useSharedProcess()

	const pluginIsReady = new Promise<void>((resolve) => {
		sharedProcessChannel.register('plugin:initialized', () => {
			resolve()
		})
	})
	await pluginIsReady

	const {
		window: omniSearchWindow,
		messageChannel: omniSearchChannel,
	} = await useOmniSearch()
	registerShortcut(omniSearchWindow)

	omniSearchChannel.register('search', ({ term }) => {
		console.log(`search term: ${term}`)
		sharedProcessChannel.sendMessage('plugin:performSearch', { term })
	})
	sharedProcessChannel.register('plugin:performSearch:reply', (data) => {
		console.log(`search reply: [${data.term}] ${JSON.stringify(data.result)}`)
		omniSearchChannel.sendMessage('searchResult', data)
	})

	return () => {
		globalShortcut.unregisterAll()
		omniSearchWindow.destroy()
		sharedProcessWindow.destroy()
	}
}

const registerMenu = (restartCallback: MenuItemConstructorOptions['click']) => {
	const template: MenuItemConstructorOptions[] = [
		{
			label: platform === 'darwin' ? app.name : 'App',
			submenu: [
				{ role: 'about' },
				{ type: 'separator' },
				{ label: 'Restart', accelerator: 'CommandOrControl+R', click: restartCallback },
				{ type: 'separator' },
				{ role: 'quit' },
			],
		}, {
			label: 'Edit',
			submenu: [
				{ role: 'undo' },
				{ role: 'redo' },
				{ type: 'separator' },
				{ role: 'cut' },
				{ role: 'copy' },
				{ role: 'paste' },
				{ role: 'selectAll' },
			],
		},
	]

	const menu = Menu.buildFromTemplate(template)
	Menu.setApplicationMenu(menu)
}

app.on('ready', async () => {
	let destroyApp = await createApp()

	registerMenu(async () => {
		destroyApp()
		destroyApp = await createApp()
	})
})

app.on('will-quit', () => {
	globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {})
