import { spawn as cpSpawn } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'

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

const loadIcons = (): string[] => {
	// https://specifications.freedesktop.org/icon-theme-spec/icon-theme-spec-latest.html
	const paths = [ `${os.homedir()}/.icons`, '/usr/share/icons', '/usr/share/pixmaps ' ]
	const icons: string[] = []
	paths.forEach((path) => {
		icons.push(...walk(path, []).filter((f: string) => f.endsWith('.png') || f.endsWith('.xpm') || f.endsWith('.svg')))
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
	return icons && icons.length >= 1 ? `file://${icons[0]}` : undefined
}

/* eslint-disable-next-line import/prefer-default-export */
export { findIcon, exec, walk }
