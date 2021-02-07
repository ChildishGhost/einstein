export interface Protocol<T> {
	send(data: T): Promise<void>
	addEventListener(type: 'message', listener: (data: T) => Promise<void>): void
}

export type Message = {
	channel: string
	data?: any
}

export type ChannelHandler = (data?: any) => Promise<void> | void

export interface IMessageChannel {
	register(channel: string, handler: ChannelHandler): void
	unregister(channel: string, handler: ChannelHandler): void
	sendMessage(channel: string, data?: any): void
}

export class MessageChannel implements IMessageChannel {
	private protocol: Protocol<Message>

	private handlers: Record<string, ChannelHandler[]> = {}

	private initialBuffers: Record<string, any[]> = {}

	constructor(protocol: Protocol<Message>) {
		this.protocol = protocol

		this.protocol.addEventListener('message', this.onMessage.bind(this))
	}

	register(channel: string, handler: ChannelHandler) {
		if (!this.handlers[channel]) {
			this.handlers[channel] = []
		}

		this.handlers[channel].push(handler)

		if (this.initialBuffers[channel]) {
			this.initialBuffers[channel].forEach(handler)
			delete this.initialBuffers[channel]
		}
	}

	unregister(channel: string, handler: ChannelHandler): void {
		if (!this.handlers[channel]) { return }
		const index = this.handlers[channel].indexOf(handler)
		if (index === -1) { return }

		this.handlers[channel].splice(index, 1)
	}

	sendMessage(channel: string, data: any = {}) {
		return this.protocol.send({
			channel,
			data,
		})
	}

	async onMessage(message?: Message) {
		const { channel, data } = message!

		if (!this.handlers[channel]) {
			// We are going to place messages into buffer,
			// so that first listener can receive all messages before registration
			if (!this.initialBuffers[channel]) {
				this.initialBuffers[channel] = []
			}

			this.initialBuffers[channel].push(data)
		}

		await Promise.all(this.handlers[channel].map((handler) => handler(data)))
	}
}
