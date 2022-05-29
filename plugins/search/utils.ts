import { spawn as cpSpawn } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'

import { KEEP_ENV, ICON_EXT } from './constants'

const exec = (command: string) => {
	const cmd = cpSpawn(command, {
		// only keep the environment variables we allow
		// this will also unset ELECTRON_RUN_AS_NODE so that the child process can use node/electron based applications
		env: Object.fromEntries(Object.entries(process.env).filter(([ k, _ ]) => KEEP_ENV.has(k))),
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

const loadIcons = (): string[] => {
	// https://specifications.freedesktop.org/icon-theme-spec/icon-theme-spec-latest.html
	const paths = [ `${os.homedir()}/.icons`, '/usr/share/icons', '/usr/share/pixmaps ' ]
	const icons: string[] = []
	paths.forEach((path) => {
		icons.push(...walk(path, []).filter((f: string) => Array.from(ICON_EXT).some((ext) => f.endsWith(ext))))
	})
	return icons
}
const memoizedIcons = loadIcons()

const findIcons = (app: string) => {
	// icon files are sorted by file size desc
	return memoizedIcons
		.filter((s) => s.includes(app))
		.map((f) => ({ file: f, size: fs.statSync(f).size }))
		.sort((a, b) => b.size - a.size)
		.map((f) => f.file)
}

const findIcon = (app: string) => {
	// return the largest icon we found
	const icons = findIcons(app)
	const filename = icons && icons.length >= 1 ? icons[0] : undefined
	if (filename) {
		const ext = filename.split('.').pop()
		const base64 = fs.readFileSync(filename).toString('base64')
		return `data:image/${ext};base64,${base64}`
	}
	return undefined
}

/* eslint-disable-next-line import/prefer-default-export */
export { findIcon, exec, walk }
