import { spawn as cpSpawn } from 'child_process'

const exec = (command: string) => {
	const cmd = cpSpawn(command, {
		env: process.env,
		detached: true,
		shell: 'bash',
		stdio: [ 'ignore', 'inherit', 'inherit' ],
	})

	cmd.unref()
}

/* eslint-disable-next-line import/prefer-default-export */
export { exec }
