import { spawn as cpSpawn } from 'child_process'

const exec = (command: string) => {
	const cmd = cpSpawn('bash', [ '-c', command ], { env: process.env, detached: true })
	cmd.stdout.on('data', (data) => {
		console.log(`stdout: ${data}`)
	})

	cmd.stderr.on('data', (data) => {
		console.error(`stderr: ${data}`)
	})
}

/* eslint-disable-next-line import/prefer-default-export */
export { exec }
