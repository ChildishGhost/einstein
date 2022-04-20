import { fork, ChildProcess } from 'child_process'
import { protocol } from 'electron'
import { Readable, Writable } from 'stream'
import { StringDecoder } from 'string_decoder'

import { ChildProcessMessageProtocol, MessageTunnel } from '@/common/message/ChildProcessMessageProtocol.main'
import Environment from '@/main/Environment'

const errorFormat = '\x1b[1;31m%s\x1b[0m'
const withLogger = (fn: (logger: Console) => void) => {
	/* eslint-disable no-console */
	console.group('Logs from Plugin Host:')
	fn(console)
	console.groupEnd()
	/* eslint-enable no-console */
}

const handleProcessOutputStream = (stream: Readable, formatString: string = '%s') => {
	const decoder = new StringDecoder('utf-8')
	const bufferMaxSize = 10_000

	let buffer = ''

	stream.setEncoding('utf-8').pipe(
		new Writable({
			write(chunk, _encoding, callback) {
				buffer += typeof chunk === 'string' ? chunk : decoder.write(chunk)

				const lines = buffer.split(/\r?\n/g)
				buffer = lines.pop()!

				if (buffer.length > bufferMaxSize) {
					lines.push(buffer)
					buffer = ''
				}

				withLogger((console) => {
					lines.forEach((l) => console.log(formatString, l))
				})

				callback()
			},
		}),
	)
}

const handleProcessError = (err: Error) => {
	withLogger((console) => {
		console.log(`Raised ${err.name}: ${err.message}`, errorFormat)
		console.log(err.stack)
	})
}

const handleProcessExit = (isExpected: boolean, code: number | null, signal: string | null) => {
	withLogger((console) => {
		if (!isExpected || code !== 0) {
			console.log(errorFormat, `Process exited unexpectedly (${code}), signal: ${signal}`)
		} else {
			console.log(`Process exited (${code}), signal: ${signal}`)
		}
	})
}

const prepareMessageProtocol = (childProcess: ChildProcess) => {
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

	const isHandshake = (
		obj: any,
	): obj is {
		type: 'pluginHost:registerMessageTunnel'
		nonce: string
		token: string
	} => {
		return (
			typeof obj === 'object' &&
			obj.type === 'pluginHost:registerMessageTunnel' &&
			typeof obj.nonce === 'string' &&
			typeof obj.token === 'string' &&
			obj.token.length === 32
		)
	}

	return new Promise<ChildProcessMessageProtocol>((resolve) => {
		const messageHandler = (data: any) => {
			if (!isHandshake(data)) {
				return
			}

			const token = genToken()
			const { nonce, token: remoteToken } = data

			childProcess.removeListener('message', messageHandler)
			childProcess.send({ type: 'pluginHost:registerMessageTunnel:response', nonce, token })
			resolve(new ChildProcessMessageProtocol(token, remoteToken, childProcess))
		}

		childProcess.on('message', messageHandler)
	})
}

const createProcess = () => {
	let exiting = false
	const process = fork(Environment.pluginHostEntryPath, {
		silent: true,
		serialization: 'advanced',
	} as any) // I don't know why 'serialization' is not in the definition...

	handleProcessOutputStream(process.stdout!)
	handleProcessOutputStream(process.stderr!, errorFormat)
	process.on('error', handleProcessError)
	process.on('exit', (...args) => handleProcessExit(exiting, ...args))

	return {
		process,
		exitProcess: () =>
			new Promise<void>((resolve) => {
				exiting = true
				process.send({ type: 'pluginHost:exit' })

				setTimeout(() => {
					process.kill()
					resolve()
				}, 1000)
			}),
	}
}

const registerPluginProtocol = (message: MessageTunnel) => {
	const cache = new Map<string, string>()

	protocol.registerFileProtocol('plugin', (request, callback) => {
		const { hostname: uid, pathname: path } = new URL(request.url)

		if (cache.has(`${uid}/${path}`)) {
			callback({ path: cache.get(`${uid}/${path}`) })
			return
		}

		const handler = ({ uid: responseUid, path: responsePath, filePath }: {
			uid: string
			path: string
			filePath?: string
		}) => {
			if (responseUid !== uid || responsePath !== path) {
				return
			}

			message.unregister('plugin:filePath', handler)

			if (filePath) {
				cache.set(`${uid}/${path}`, filePath)
				callback({ path: filePath })
			} else {
				callback({ statusCode: 404 })
			}
		}

		message.register('plugin:filePath', handler)
		message.sendMessage('plugin:filePath', { uid, path })
	})
}

export default async () => {
	const { process, exitProcess } = createProcess()
	const messageTunnel = new MessageTunnel(await prepareMessageProtocol(process))

	registerPluginProtocol(messageTunnel)

	return {
		process,
		exitProcess,
		messageTunnel,
		isReady: new Promise<true>((resolve) => {
			messageTunnel.register('plugin:initialized', () => {
				resolve(true)
			})
		}),
	}
}
