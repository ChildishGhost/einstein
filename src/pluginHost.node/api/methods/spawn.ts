import { spawn as nodeSpawn } from 'node:child_process'

import { SpawnOptions, spawnFn } from 'einstein'

import { permittedEnv } from '@/pluginHost.node/sandbox/env'

export const spawn: spawnFn = (command: string, options?: SpawnOptions) => {
	nodeSpawn(command, {
		cwd: options?.cwd,
		env: {
			...(options?.env ?? permittedEnv),
		},
		detached: true,
		shell: true,
		stdio: [ 'ignore', 'inherit', 'inherit' ],
	}).unref()
}
