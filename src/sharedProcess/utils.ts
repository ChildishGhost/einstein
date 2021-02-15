import { exec as cpExec } from 'child_process'

const exec = (command: string) => {
	cpExec(command, { env: process.env }, (error: Error, _stdout: string, stderr: string) => {
		if (error) {
			console.log(error)
		}
		if (stderr) {
			console.log(stderr)
		}
	})
}

/* eslint-disable-next-line import/prefer-default-export */
export { exec }
