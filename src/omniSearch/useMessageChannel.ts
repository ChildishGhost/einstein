import { ipcRenderer } from 'electron'

import { MessageChannel, MessagePortProtocol } from '@/common/MessageChannel.renderer'

const createProtocol = (): Promise<MessagePortProtocol> => {
	const nonce = new Date().getUTCMilliseconds().toString()

	const promise = new Promise<MessagePortProtocol>((resolve) => {
		ipcRenderer.on('omniSearch:regieterMessageChannel:response', ({ ports: [ port ] }, { nonce: n }) => {
			if (nonce !== n) {
				return
			}

			resolve(new MessagePortProtocol(port))
		})
	})

	ipcRenderer.send('omniSearch:registerMessageChannel', { nonce })

	return promise
}

export default async () => new MessageChannel(await createProtocol())
