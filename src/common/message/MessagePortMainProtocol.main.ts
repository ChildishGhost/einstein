import { MessageEvent, MessagePortMain } from 'electron'

import { Message, Protocol } from '@/common/message/MessageTunnel'

export * from '@/common/message/MessageTunnel'

export class MessagePortMainProtocol implements Protocol<Message> {
	private port: MessagePortMain

	private listeners: ((data: Message) => Promise<void>)[] = []

	constructor(port: MessagePortMain) {
		this.port = port
		this.port.on('message', this.onMessage.bind(this))

		this.port.start()
	}

	async send(data: Message): Promise<void> {
		this.port.postMessage(data)
	}

	addEventListener(type: 'message', listener: (data: Message) => Promise<void>): void {
		this.listeners.push(listener)
	}

	onMessage({ data }: MessageEvent) {
		this.listeners.forEach((listener) => listener(data as Message))
	}
}
