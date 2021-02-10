import { MessageChannel, MessagePortMainProtocol } from '@/common/MessageChannel.main'
import { BrowserWindow, ipcMain, MessageChannelMain as ElectionMessageChannel } from 'electron'

const ENTRY_URL = `file://${__dirname}/../renderer/sharedProcess.html`

const prepareMessageProtocol = () =>
	new Promise<MessagePortMainProtocol>((resolve) => {
		ipcMain.once('sharedProcess:registerMessageChannel', ({ sender }, { nonce }) => {
			const { port1: mainPort, port2: spPort } = new ElectionMessageChannel()

			sender.postMessage('sharedProcess:registerMessageChannel:response', { nonce }, [ spPort ])
			resolve(new MessagePortMainProtocol(mainPort))
		})
	})

const createSharedProcess = () => {
	const window = new BrowserWindow({
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
	const window = createSharedProcess()
	const messageChannel = new MessageChannel(await protocol)

	return {
		messageChannel,
		window,
	}
}
