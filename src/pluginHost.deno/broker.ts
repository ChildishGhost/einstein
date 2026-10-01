import { spawn as nodeSpawn, type SpawnOptions as NodeSpawnOptions } from 'node:child_process'
import process from 'node:process'

import type { SpawnOptions } from '../api/index.ts'
import { permitEnv } from '../common/permittedEnv.ts'

export type BrokerRequest =
	| { type: 'spawn'; command: string; options?: SpawnOptions }
	| { type: 'openUrl'; url: string }

export const isBrokerRequest = (message: unknown): message is BrokerRequest => {
	const request = message as Record<string, unknown> | null
	return (request?.type === 'spawn' && typeof request.command === 'string') ||
		(request?.type === 'openUrl' && typeof request.url === 'string')
}

const permittedEnv = permitEnv(process.env)

/** Runs through a shell, detached and unreferenced, with nothing returned (RFC-0003/R15). */
const spawn = (command: string, options?: SpawnOptions, shell = true) => {
	const spawnOptions: NodeSpawnOptions = {
		cwd: options?.cwd,
		env: { ...(options?.env ?? permittedEnv) },
		detached: true,
		shell,
		stdio: ['ignore', 'inherit', 'inherit'],
	}
	const child = nodeSpawn(command, [...(options?.argv ?? [])], spawnOptions)
	child.on('error', (error) => console.error(`spawn ${command}: ${error.message}`))
	child.unref()
}

/** Carries out `spawn` and `openUrl` for a plugin (RFC-0008/R17). */
export const handleBrokerRequest = (request: BrokerRequest) => {
	if (request.type === 'spawn') {
		spawn(request.command, request.options)
	} else {
		// The Deno stack runs on Linux only (RFC-0008/R1); no shell, so the URL is passed verbatim.
		spawn('xdg-open', { argv: [request.url] }, false)
	}
}
