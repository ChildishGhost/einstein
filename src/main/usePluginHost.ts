import { fork } from 'child_process'
import { Readable, Writable } from 'stream'
import { StringDecoder } from 'string_decoder'

import Environment from '@/main/Environment'

const errorFormat = '\x1b[1;31m%s\x1b[0m'
const withLogger = (fn: (logger: Console) => void) => {
	/* eslint-disable no-console */
	console.group('Logs from Plugin Host:')
	fn(console)
	console.groupEnd()
	/* eslint-enable no-console */
}

const env = {}

const handleProcessOutputStream = (stream: Readable, formatString: string = '%s') => {
	const decoder = new StringDecoder('utf-8')
	const bufferMaxSize = 10_000

	let buffer = ''

	stream.pipe(
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

const handleProcessExit = (isExpected: boolean, code: number, signal: string) => {
	withLogger((console) => {
		if (!isExpected || code !== 0) {
			console.log(errorFormat, `Process exited unexpectedly (${code}), signal: ${signal}`)
		} else {
			console.log(`Process exited (${code}), signal: ${signal}`)
		}
	})
}

const createProcess = () => {
	let exiting = false
	const process = fork(Environment.pluginHostEntryPath, {
		env,
		silent: true,
	})

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

export default async () => {
	const { process, exitProcess } = createProcess()

	return {
		process,
		exitProcess,
	}
}
