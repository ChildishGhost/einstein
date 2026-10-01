import type { ChildProcess } from 'node:child_process'

import { type Message, MessageTunnel, type Protocol } from './MessageTunnel.ts'
import { genToken, isPacket } from './packet.deno.ts'

type Listener = (data: Message) => Promise<void>

/** Main's side of a child's IPC channel: packets carry the receiver's token (RFC-0002/R11). */
export class ChildProcessMessageProtocol implements Protocol<Message> {
	private listeners: Listener[] = []

	constructor(
		private token: string,
		private remoteToken: string,
		private child: ChildProcess,
	) {
		child.on('message', (packet: unknown) => {
			if (isPacket(packet) && packet.token === this.token) {
				this.listeners.forEach((listener) => listener(packet.data))
			}
		})
	}

	send(data: Message): Promise<void> {
		this.child.send({ type: 'messageTunnel:packet', token: this.remoteToken, data })
		return Promise.resolve()
	}

	addEventListener(_type: 'message', listener: Listener) {
		this.listeners.push(listener)
	}
}

const isHandshake = (role: string, obj: unknown): obj is { nonce: string; token: string } => {
	const handshake = obj as Record<string, unknown> | null
	return (
		typeof handshake === 'object' &&
		handshake !== null &&
		handshake.type === `${role}:registerMessageTunnel` &&
		typeof handshake.nonce === 'string' &&
		typeof handshake.token === 'string' &&
		handshake.token.length === 32
	)
}

/** Answers the child's `<role>:registerMessageTunnel` handshake and resolves with the tunnel. */
export const acceptMessageTunnel = (role: string, child: ChildProcess) =>
	new Promise<MessageTunnel>((resolve) => {
		const onMessage = (data: unknown) => {
			if (!isHandshake(role, data)) {
				return
			}
			const token = genToken()
			child.off('message', onMessage)
			child.send({ type: `${role}:registerMessageTunnel:response`, nonce: data.nonce, token })
			resolve(new MessageTunnel(new ChildProcessMessageProtocol(token, data.token, child)))
		}
		child.on('message', onMessage)
	})
