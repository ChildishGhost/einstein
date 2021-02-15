import { MessageChannel, MessagePortMainProtocol } from '@/common/MessageChannel.main'
import { BrowserWindow, globalShortcut, ipcMain, MessageChannelMain as ElectionMessageChannel } from 'electron'

const ENTRY_URL = `file://${__dirname}/../renderer/omniSearch.html`
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
			nodeIntegration: true,
		},
	})

	window.loadURL(ENTRY_URL)

	window.on('ready-to-show', () => {
		window.webContents.openDevTools()
	})

	return window
}

export default async () => {
	const protocol = prepareMessageProtocol()
	const window = createWindow()
	const messageChannel = new MessageChannel(await protocol)

	messageChannel.register('resizeWindow', ({ height }: any) => {
		const [ width ] = window.getSize()
		window.setSize(width, height, true)
	})

	messageChannel.register('closeWindow', () => window.hide())

	const keystroke = platform === 'linux' ? 'Alt+Space' : 'Ctrl+Space'

	globalShortcut.register(keystroke, () => {
		if (window.isVisible() && window.isFocused()) {
			window.hide()
			return
		}

		window.center()
		window.show()
		window.focus()
	})

	return {
		messageChannel,
		window,
	}
}
