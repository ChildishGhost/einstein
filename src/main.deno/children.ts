import { type ChildProcess, spawn, type SpawnOptions } from 'node:child_process'
import type { Readable } from 'node:stream'
import { fromFileUrl } from '@std/path'

import { acceptMessageTunnel } from '../common/message/ChildProcessMessageProtocol.deno.ts'
import type { MessageTunnel } from '../common/message/MessageTunnel.ts'

export type Role = 'ui' | 'pluginHost'

const path = (relative: string) => fromFileUrl(new URL(relative, import.meta.url))

const entries: Record<Role, string> = {
	ui: path('../ui.deno/index.ts'),
	pluginHost: path('../pluginHost.deno/index.ts'),
}

// The UI process must not reach the network or start programs (RFC-0008/R4); gpui-native loads through ffi
// and reads only its library-path env vars.
const permissions: Record<Role, string[]> = {
	ui: ['--allow-read', '--allow-ffi', '--allow-env=GPUI_NATIVE_LIBRARY_PATH,GPUI_VUE_NATIVE_LIBRARY_PATH'],
	pluginHost: ['--allow-all'],
}

/** How main spawns a child: the entry is always the last argument. */
export const childCommand = (role: Role, entry = entries[role]) => ({
	command: Deno.execPath(),
	args: ['run', '--no-prompt', '--config', path('../../deno.json'), ...permissions[role], entry],
	options: {
		stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
		serialization: 'advanced',
	} satisfies SpawnOptions,
})

/** Calls `write` once per line of `stream`, joining lines split across chunks. */
export const forwardLines = (stream: Readable, write: (line: string) => void) => {
	let rest = ''
	stream.setEncoding('utf8')
	stream.on('data', (chunk: string) => {
		const lines = (rest + chunk).split(/\r?\n/)
		rest = lines.pop()!
		lines.forEach((line) => write(line))
	})
	stream.on('end', () => rest && write(rest))
}

/** Spawns a child, forwards its output and resolves once its MessageTunnel handshake is done. */
export const startChild = async (
	role: Role,
	{ entry, env }: { entry?: string; env?: Record<string, string> } = {},
): Promise<{ child: ChildProcess; tunnel: MessageTunnel }> => {
	const { command, args, options } = childCommand(role, entry)
	const child = spawn(command, args, { ...options, env })
	forwardLines(child.stdout!, (line) => console.log(`[${role}] ${line}`))
	forwardLines(child.stderr!, (line) => console.error(`[${role}] ${line}`))
	const tunnel = await Promise.race([
		acceptMessageTunnel(role, child),
		new Promise<never>((_, reject) => {
			child.once('exit', (code, signal) => reject(new Error(`${role} exited (${code ?? signal}) before its handshake`)))
		}),
	])
	return { child, tunnel }
}
