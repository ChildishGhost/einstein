import { BrowserWindow, ipcMain, MessageChannelMain } from "electron"
import { MessagePortMainProtocol } from '@/common/MessageChannel.main'

const SHARED_PROCESS_URL = `file://${__dirname}/../renderer/sharedProcess.html`

const prepareMessageChannel = () => new Promise((resolve) => {
	ipcMain.on('sharedProcess:registerMessageChannel', ({ sender }, { nonce }) => {
		const { port1: mainPort, port2: spPort } = new MessageChannelMain()

		sender.postMessage('sharedProcess:regieterMessageChannel:response', { nonce }, [spPort])
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

	window.loadURL(SHARED_PROCESS_URL)

	window.on('ready-to-show', () => {
		window.webContents.openDevTools()
	})

	return window
}

export default async () => {
	const channel = prepareMessageChannel()
	const window = createSharedProcess()

	return {
		messageChannel: await channel,
		window,
	}
}
