import { MessageTunnel, ProcessMessageProtocol } from '@/common/message/ProcessMessageProtocol.node'

/**
 * Generate random 8-digits hex string
 *
 * @returns Hex string with 0 left-padded
 */
const genTokenPart = () =>
	Math.floor(Math.random() * 16 ** 8)
		.toString(16)
		.padStart(8, '0')

/**
 * @returns 32-digit token
 */
const genToken = () => [ ...Array(4) ].map(genTokenPart).join('')

const createProtocol = (): Promise<ProcessMessageProtocol> => {
	const nonce = new Date().getUTCMilliseconds().toString()
	const token = genToken()

	const isHandshake = (
		obj: any,
	): obj is {
		type: 'pluginHost:registerMessageTunnel:response'
		nonce: string
		token: string
	} => {
		return (
			typeof obj === 'object' &&
			obj.type === 'pluginHost:registerMessageTunnel:response' &&
			typeof obj.nonce === 'string' &&
			typeof obj.token === 'string' &&
			obj.token.length === 32
		)
	}

	const promise = new Promise<ProcessMessageProtocol>((resolve) => {
		const messageHandler = (data: any) => {
			if (!isHandshake(data)) {
				return
			}

			if (data.nonce !== nonce) {
				return
			}

			process.removeListener('message' as 'loaded', messageHandler) // https://github.com/electron/electron/issues/21475
			resolve(new ProcessMessageProtocol(token, data.token))
		}

		process.on('message', messageHandler)
	})

	process.send({ type: 'pluginHost:registerMessageTunnel', nonce, token })

	return promise
}

export default async () => new MessageTunnel(await createProtocol())
