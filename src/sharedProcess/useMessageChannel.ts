import { MessageChannel, MessagePortProtocol } from '@/common/MessageChannel.renderer'
import { ipcRenderer } from 'electron'

const createProtocol = (): Promise<MessagePortProtocol> => {
	const nonce = new Date().getUTCMilliseconds().toString()

	const promise = new Promise<MessagePortProtocol>((resolve) => {
		ipcRenderer.on('sharedProcess:registerMessageChannel:response', ({ ports: [ port ] }, { nonce: n }) => {
			if (nonce !== n) {
				return
			}

			resolve(new MessagePortProtocol(port))
		})
	})

	ipcRenderer.send('sharedProcess:registerMessageChannel', { nonce })

	return promise
}

export default async () => new MessageChannel(await createProtocol())
