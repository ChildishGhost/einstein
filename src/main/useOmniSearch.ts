import { BrowserWindow, globalShortcut, ipcMain, MessageChannelMain as ElectionMessageChannel } from 'electron'

import { MessageTunnel, MessagePortMainProtocol } from '@/common/message/MessagePortMainProtocol.main'
import Environment from '@/main/Environment'

const { platform } = process

const prepareMessageProtocol = () =>
	new Promise<MessagePortMainProtocol>((resolve) => {
		ipcMain.once('omniSearch:registerMessageChannel', ({ sender }, { nonce }) => {
			const { port1: mainPort, port2: spPort } = new ElectionMessageChannel()

			sender.postMessage('omniSearch:regieterMessageChannel:response', { nonce }, [ spPort ])
			resolve(new MessagePortMainProtocol(mainPort))
		})
	})

const createWindow = () => {
	const window = new BrowserWindow({
		backgroundColor: '#333333',
		width: 600,
		height: 300,
		useContentSize: true,
		frame: false,
		type: platform === 'linux' ? 'toolbar' : null,
		show: false,
		alwaysOnTop: true,
		webPreferences: {
			// TODO(davy): enable isolation
			contextIsolation: false,
			nodeIntegration: true,
		},
	})

	window.loadURL(Environment.omniSearchEntryPath)

	return window
}

export default async () => {
	const protocol = prepareMessageProtocol()
	const window = createWindow()
	const messageTunnel = new MessageTunnel(await protocol)

	messageTunnel.register('resizeWindow', ({ height }: any) => {
		const [ width ] = window.getSize()
		window.setSize(width, height, true)
	})

	messageTunnel.register('closeWindow', () => window.hide())

	const keystroke = platform === 'linux' ? 'Alt+Space' : 'Ctrl+Space'

	globalShortcut.register(keystroke, () => {
		if (window.isVisible() && window.isFocused()) {
			window.hide()
			return
		}

		window.center()
		messageTunnel.sendMessage('beforeShow')
		window.show()
		window.focus()
	})

	return {
		messageTunnel,
		window,
	}
}
