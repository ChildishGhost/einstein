import { type Message, MessageTunnel, type Protocol } from './MessageTunnel.ts'
import { genToken, isPacket } from './packet.deno.ts'

type Listener = (data: Message) => Promise<void>

const send = (message: unknown) => {
	if (!process.send) {
		throw new Error('no IPC channel: this process must be started by main')
	}
	process.send(message)
}

/** A child's side of its IPC channel to main. */
export class ProcessMessageProtocol implements Protocol<Message> {
	private listeners: Listener[] = []

	constructor(
		private token: string,
		private remoteToken: string,
	) {
		process.on('message', (packet: unknown) => {
			if (isPacket(packet) && packet.token === this.token) {
				this.listeners.forEach((listener) => listener(packet.data))
			}
		})
	}

	send(data: Message): Promise<void> {
		// Plain JSON, as RFC-0002/R12 requires of data leaving a child.
		send({ type: 'messageTunnel:packet', token: this.remoteToken, data: JSON.parse(JSON.stringify(data)) })
		return Promise.resolve()
	}

	addEventListener(_type: 'message', listener: Listener) {
		this.listeners.push(listener)
	}
}

/** Starts the `<role>:registerMessageTunnel` handshake with main and resolves with the tunnel. */
export const connectMessageTunnel = (role: string) =>
	new Promise<MessageTunnel>((resolve) => {
		const nonce = crypto.randomUUID()
		const token = genToken()
		const onMessage = (data: unknown) => {
			const response = data as Record<string, unknown> | null
			if (
				response?.type !== `${role}:registerMessageTunnel:response` ||
				response.nonce !== nonce ||
				typeof response.token !== 'string'
			) {
				return
			}
			process.off('message', onMessage)
			resolve(new MessageTunnel(new ProcessMessageProtocol(token, response.token)))
		}
		process.on('message', onMessage)
		send({ type: `${role}:registerMessageTunnel`, nonce, token })
	})
