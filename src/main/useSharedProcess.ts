import { BrowserWindow, ipcMain, MessageChannelMain as ElectionMessageChannel } from 'electron'

import Environment from './Environment'
import { MessageTunnel, MessagePortMainProtocol } from '@/common/message/MessagePortMainProtocol.main'


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
			// TODO(davy): enable isolation
			contextIsolation: false,
			nodeIntegration: true,
		},
	})

	window.loadURL(Environment.sharedProcessEntryPath)

	return window
}

export default async () => {
	const protocol = prepareMessageProtocol()
	const window = createSharedProcess()
	const messageTunnel = new MessageTunnel(await protocol)

	return {
		messageTunnel,
		window,
	}
}
