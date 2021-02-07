import { ipcRenderer } from "electron"

export default () : Promise<MessagePort> => {
	const nonce = new Date().getUTCMilliseconds().toString()

	const promise = new Promise<MessagePort>((resolve) => {
		ipcRenderer.on('sharedProcess:regieterMessageChannel:response', ({ ports: [ port ]}, { nonce: n }) => {
			if (nonce !== n) { return }

			port.start()
			resolve(port)
		})
	})

	ipcRenderer.send('sharedProcess:registerMessageChannel', { nonce })

	return promise
}
