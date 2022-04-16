import { spawn as nodeSpawn, SpawnOptionsWithStdioTuple, StdioNull } from 'node:child_process'

import { SpawnOptions, spawnFn } from 'einstein'

import { permittedEnv } from '@/pluginHost.node/sandbox/env'

export const spawn: spawnFn = (command: string, spawnOptions?: SpawnOptions) => {
	const options: SpawnOptionsWithStdioTuple<StdioNull, StdioNull, StdioNull> = {
		cwd: spawnOptions?.cwd,
		env: {
			...(spawnOptions?.env ?? permittedEnv),
		},
		detached: true,
		shell: true,
		stdio: [ 'ignore', 'inherit', 'inherit' ],
	}

	if (spawnOptions?.argv) {
		nodeSpawn(command, spawnOptions.argv, options).unref()
	} else {
		nodeSpawn(command, options).unref()
	}
}
