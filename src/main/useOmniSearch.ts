import { BrowserWindow, ipcMain, MessageChannelMain as ElectionMessageChannel } from 'electron'
import { MessagePortMainProtocol, MessageChannel } from '@/common/MessageChannel.main'

const ENTRY_URL = `file://${__dirname}/../renderer/omniSearch.html`
const { platform } = process

const prepareMessageProtocol = () => new Promise<MessagePortMainProtocol>((resolve) => {
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

	return {
		messageChannel,
		window,
	}
}
