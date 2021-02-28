import { spawn as cpSpawn } from 'child_process'
import * as fs from 'fs'

const exec = (command: string) => {
	const cmd = cpSpawn(command, {
		env: process.env,
		detached: true,
		shell: true,
		stdio: [ 'ignore', 'inherit', 'inherit' ],
	})

	cmd.unref()
}

const walk = (path: string, acc: string[]) => {
	// walk directory recursively
	if (fs.existsSync(path)) {
		const stats = fs.statSync(path)
		if (stats.isDirectory()) {
			acc.push(
				...fs
					.readdirSync(path)
					.map((file) => walk(`${path}/${file}`, []))
					.flat(),
			)
		} else {
			acc.push(path)
		}
	}
	return acc
}

/* eslint-disable-next-line import/prefer-default-export */
export { exec, walk }
