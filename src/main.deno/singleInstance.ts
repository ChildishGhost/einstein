import { tmpdir } from 'node:os'
import { join } from '@std/path'

export type Command = 'toggle' | 'restart'
export type Commands = Record<Command, () => void>

const isCommand = (value: string): value is Command => value === 'toggle' || value === 'restart'

export const defaultSocketPath = () => {
	const runtime = Deno.env.get('XDG_RUNTIME_DIR')
	return runtime ? join(runtime, 'einstein.sock') : join(tmpdir(), `einstein-${Deno.uid()}.sock`)
}

const encoder = new TextEncoder()

const readLine = async (conn: Deno.Conn) => {
	const decoder = new TextDecoder()
	const buffer = new Uint8Array(64)
	let text = ''
	while (!text.includes('\n') && text.length < buffer.length) {
		const read = await conn.read(buffer)
		if (read === null) break
		text += decoder.decode(buffer.subarray(0, read), { stream: true })
	}
	return text.split('\n')[0]
}

const answer = async (conn: Deno.Conn, commands: Commands) => {
	try {
		const command = await readLine(conn)
		if (isCommand(command)) {
			commands[command]()
		}
		await conn.write(encoder.encode('ok\n'))
	} catch {
		// A client that went away gets no answer.
	} finally {
		conn.close()
	}
}

const serve = async (listener: Deno.Listener, commands: Commands) => {
	for await (const conn of listener) {
		answer(conn, commands)
	}
}

const connect = (path: string) => Deno.connect({ transport: 'unix', path })

/**
 * Becomes the running instance by listening on `path`, unless another instance already does (RFC-0008/R8).
 * A socket file nobody answers on is left over from a crash and is replaced.
 */
export const acquireInstance = async (path: string, commands: Commands) => {
	const listen = () => Deno.listen({ transport: 'unix', path })
	let listener: Deno.Listener
	try {
		listener = listen()
	} catch (error) {
		if (!(error instanceof Deno.errors.AddrInUse)) throw error
		try {
			;(await connect(path)).close()
			return { primary: false, close: () => Promise.resolve() }
		} catch {
			await Deno.remove(path)
			listener = listen()
		}
	}
	const serving = serve(listener, commands).catch(() => {})
	return {
		primary: true,
		async close() {
			listener.close()
			await serving
			await Deno.remove(path).catch(() => {})
		},
	}
}

/** Sends a command to the running instance and resolves once it has been carried out. */
export const sendCommand = async (path: string, command: Command) => {
	const conn = await connect(path)
	try {
		await conn.write(encoder.encode(`${command}\n`))
		await conn.read(new Uint8Array(16))
	} finally {
		conn.close()
	}
}
