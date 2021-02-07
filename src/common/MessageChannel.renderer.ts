import { Protocol } from '@/common/MessageChannel'

export * from '@/common/MessageChannel'

export class MessagePortProtocol implements Protocol<any> {
	private port: MessagePort

	private listeners: ((data: any) => Promise<void>)[] = []

	constructor(port: MessagePort) {
		this.port = port
		this.port.onmessage = this.onMessage.bind(this)

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
