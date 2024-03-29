import { isMessage, Message, Protocol } from '@/common/message/MessageTunnel'

export * from '@/common/message/MessageTunnel'

type Packet = {
	type: 'messageTunnel:packet'
	token: string
	data: Message
}

type Listener = (data: Message) => Promise<void>

const isPacket = (obj: any): obj is Packet => {
	return (
		typeof obj === 'object' &&
		!Array.isArray(obj) &&
		obj.type === 'messageTunnel:packet' &&
		typeof obj.token === 'string' &&
		isMessage(obj.data)
	)
}

export class ProcessMessageProtocol implements Protocol<Message> {
	private listeners: Listener[] = []

	constructor(private token: string, private remoteToken: string) {
		process.on('message', this.onMessage.bind(this))
	}

	async send(data: Message): Promise<void> {
		process.send({
			type: 'messageTunnel:packet',
			token: this.remoteToken,
			// HACK(davy): remove all native types from the message
			data: JSON.parse(JSON.stringify(data)),
		})
	}

	addEventListener(type: 'message', listener: Listener) {
		this.listeners.push(listener)
	}

	private onMessage(packet: any) {
		if (!isPacket(packet)) {
			return
		}

		const { token, data } = packet
		if (token !== this.token) {
			return
		}

		this.listeners.forEach((listener) => listener(data))
	}
}
