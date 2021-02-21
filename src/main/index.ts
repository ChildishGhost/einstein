import 'source-map-support/register'

import { app, globalShortcut, Menu, MenuItemConstructorOptions } from 'electron'

import { MessageTunnel } from '@/common/message/MessageTunnel'
import useOmniSearch from '@/main/useOmniSearch'
import usePluginHost from '@/main/usePluginHost'
import useSharedProcess from '@/main/useSharedProcess'

const { platform } = process

const registerMessageTunnelPair = <T = any>(
	listen: MessageTunnel,
	to: MessageTunnel,
	channelName: string,
	toChannel: string = channelName,
) => {
	listen.register<T>(channelName, (data: T) => {
		to.sendMessage(toChannel, data)
	})
}

const createApp = async () => {
	const { window: sharedProcessWindow, messageTunnel: sharedProcessTunnel } = await useSharedProcess()

	const pluginIsReady = new Promise<void>((resolve) => {
		sharedProcessTunnel.register('plugin:initialized', () => {
			resolve()
		})
	})
	await pluginIsReady

	const { window: omniSearchWindow, messageTunnel: omniSearchTunnel } = await useOmniSearch()

	registerMessageTunnelPair(omniSearchTunnel, sharedProcessTunnel, 'search', 'plugin:performSearch')
	registerMessageTunnelPair(sharedProcessTunnel, omniSearchTunnel, 'plugin:performSearch:reply', 'searchResult')
	registerMessageTunnelPair(omniSearchTunnel, sharedProcessTunnel, 'plugin:event')

	return {
		destroyApp: () => {
			globalShortcut.unregisterAll()
			omniSearchWindow.destroy()
			sharedProcessWindow.destroy()
		},
		showDevTools: () => {
			omniSearchWindow.webContents.openDevTools()
			sharedProcessWindow.webContents.openDevTools()
		},
	}
}

const registerMenu = (
	restartCallback: MenuItemConstructorOptions['click'],
	showDevToolsCallback: MenuItemConstructorOptions['click'],
) => {
	const template: MenuItemConstructorOptions[] = [
		{
			label: platform === 'darwin' ? app.name : 'App',
			submenu: [
				{ role: 'about' },
				{ type: 'separator' },
				{ label: 'Restart', accelerator: 'CommandOrControl+R', click: restartCallback },
				{ type: 'separator' },
				{ label: 'DevTools', accelerator: 'CommandOrControl+Shift+I', click: showDevToolsCallback },
				{ type: 'separator' },
				{ role: 'quit' },
			],
		},
		{
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
	let operation = await createApp() // eslint-disable-line prefer-const
	const { exitProcess: closePluginHost } = await usePluginHost()

	app.once('will-quit', () => closePluginHost())

	registerMenu(
		async () => {
			operation.destroyApp()
			operation = await createApp()
		},
		() => {
			operation.showDevTools()
		},
	)
})

app.on('will-quit', () => {
	globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {})
