import { isMessage, type Message } from './MessageTunnel.ts'

export type Packet = {
	type: 'messageTunnel:packet'
	token: string
	data: Message
}

export const isPacket = (obj: unknown): obj is Packet => {
	const packet = obj as Record<string, unknown> | null
	return (
		typeof packet === 'object' &&
		packet !== null &&
		!Array.isArray(packet) &&
		packet.type === 'messageTunnel:packet' &&
		typeof packet.token === 'string' &&
		Boolean(isMessage(packet.data))
	)
}

export const genToken = () =>
	Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')
