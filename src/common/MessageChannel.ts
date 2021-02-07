export interface Protocol<T> {
	send(data: T): Promise<void>
	addEventListener(type: 'message', listener: (data: T) => Promise<void>): void
}

export type Message = {
	channel: string
	data?: any
}

export type ChannelHandler = (data?: any) => Promise<void>

export interface IMessageChannel {
	register(channel: string, handler: ChannelHandler): void
	unregister(channel: string, handler: ChannelHandler): void
	sendMessage(channel: string, data?: any): void
}

export class MessageChannel implements IMessageChannel {
	private protocol: Protocol<Message>

	private handlers: Record<string, ChannelHandler[]>

	constructor(protocol: Protocol<Message>) {
		this.protocol = protocol
		this.handlers = {}

		this.protocol.addEventListener('message', this.onMessage)
	}

	register(channel: string, handler: ChannelHandler) {
		if (!this.handlers[channel]) {
			this.handlers[channel] = []
		}

		this.handlers[channel].push(handler)
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

		if (!this.handlers[channel]) { return }

		await Promise.all(this.handlers[channel].map((handler) => handler(data)))
	}
}
