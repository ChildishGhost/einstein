import { ipcRenderer } from 'electron'

import { MessageTunnel, MessagePortProtocol } from '@/common/message/MessagePortProtocol.renderer'

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

export default async () => new MessageTunnel(await createProtocol())
