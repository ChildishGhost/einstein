import { Protocol } from '@/common/MessageChannel'
import { MessagePortMain, MessageEvent } from 'electron'
export * from '@/common/MessageChannel'

export class MessagePortMainProtocol implements Protocol<any> {
	private port: MessagePortMain
	private listeners: ((data: any) => Promise<void>)[] = []

	constructor(port: MessagePortMain) {
		this.port = port
		this.port.on('message', this.onMessage.bind(this))

		this.port.start()
	}

	async send(data: any): Promise<void> {
		this.port.postMessage(data)
	}

	addEventListener(type: 'message', listener: (data: any) => Promise<void>): void {
		this.listeners.push(listener)
	}

	onMessage({ data }: MessageEvent) {
		this.listeners.forEach((listener) => listener(data))
	}
}
