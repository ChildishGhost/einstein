import Fuse from 'fuse.js'

import {
	BaseSearchEngine,
	SearchResult,
	VOID_TRIGGER,
} from '@/api/searchEngine'

import * as fs from 'fs'
import * as os from 'os'
/*
file = {
	content: "<file content>"      // string -> string
	section1: {                    // string -> Record<string, string>
		key: val
	}
	section2: {
		key: val
	}
}
*/
type LinuxDesktopFile = {
	[K in string]: Record<string, string>
} & {
	content?: string
}

type LinuxDesktopApplicationPreSearch = {
	file: string
	name: string
	exec: string
	icon?: string
	action: boolean
}

const DESKTOP_ENTRY = '[Desktop Entry]'
const DESKTOP_ACTION = '[Desktop Action'

// eslint-disable-next-line max-len
const isLaunchable = (groupName: string) => groupName === DESKTOP_ENTRY || groupName.startsWith(DESKTOP_ACTION)

export default class LinuxDesktopApplicationSearchEngine extends BaseSearchEngine {
	private desktopFiles: Record<string, LinuxDesktopFile> = {}

	private fuse: Fuse<LinuxDesktopApplicationPreSearch> = null

	name = 'tw.childish.einstein.plugin.desktop.linux'

	triggers = [ VOID_TRIGGER ]

	constructor() {
		super()
		this.loadDesktopFiles()
		this.sanitizeExecCommand()
		this.initFuse()
	}

	async search(term: string, _trigger?: string): Promise<SearchResult[]> {
		// transform search results into SearchResult
		const result = this.fuse.search(term as string).map<SearchResult>(
			({ item }) => ({
				id: item.file,
				title: item.name,
				description: item.exec,
				completion: item.name,
				event: {
					name: item.exec,
					data: item.action,
				},
			}),
		)

		return result
	}

	async launchApp(_path: string) {
		// TODO
	}

	private loadDesktopFiles = () => {
		// ref: https://wiki.archlinux.org/index.php/Desktop_entries
		const lookupDirs = [
			'/usr/share/applications/',
			'/usr/local/share/applications/',
			`${os.homedir()}/.local/share/applications/`,
		]

		// collect all available .desktop files
		const desktopFiles = [] as string[]
		lookupDirs.forEach((dir) => {
			if (fs.existsSync(dir)) {
				const stats = fs.statSync(dir)
				if (stats.isDirectory()) {
					desktopFiles.push(
						...fs.readdirSync(dir).map((file) => `${dir}${file}`),
					)
				}
			}
		})

		// read and parse .desktop file
		// ref: https://specifications.freedesktop.org/desktop-entry-spec/latest/ar01s03.html
		//
		// Basic format of the file
		//
		// Comments
		// Lines beginning with a # and blank lines are considered comments and will be ignored
		//
		// Group headers
		// A group header with name groupname is a line in the format:
		// [groupname]
		//
		// Entries
		// Entries in the file are {key,value} pairs in the format:
		//
		// Key=Value
		desktopFiles.forEach((file: string) => {
			this.desktopFiles[file] = { content: undefined }

			const content = fs.readFileSync(file, { encoding: 'utf8' })
			this.desktopFiles[file].content = content

			let currentGroup = ''
			content.split('\n').forEach((line: string) => {
				const cur = line.trim()
				if (cur.startsWith('#') || cur.length === 0) return
				if (cur.startsWith('[')) {
					currentGroup = cur
					return
				}
				const [ k, v ]: string[] = cur.split('=')
				// this.desktopFiles[file][currentGroup]
				if (!(currentGroup in this.desktopFiles[file])) {
					this.desktopFiles[file][currentGroup] = {} as Record<string, string>
				}

				const entries = this.desktopFiles[file][currentGroup] as Record<
					string,
					string
				>
				entries[k] = v
			})

			// drop ill-formed desktop files
			// [Desktop Entry] and Exec must be present
			if (
				!(DESKTOP_ENTRY in this.desktopFiles[file])
				|| !('Exec' in this.desktopFiles[file][DESKTOP_ENTRY])
			) {
				console.log(`ill-formed .desktop file found: ${file}, dropping`)
				delete this.desktopFiles[file]
			}
		})
		console.log(`collected ${Object.keys(this.desktopFiles).length} files`)
		console.log(this.desktopFiles)
	}

	private initFuse() {
		// flatten this.desktopFiles
		const preSearch: LinuxDesktopApplicationPreSearch[] = Object.entries(
			this.desktopFiles,
		).reduce((acc, [ filename, file ]) => {
			Object.entries(file).forEach(([ group, _ ]) => {
				if (isLaunchable(group)) {
					const isAction = group.startsWith(DESKTOP_ACTION)
					acc.push({
						file: filename,
						name: isAction
							? `${file[DESKTOP_ENTRY].Name}: ${file[group].Name}`
							: file[DESKTOP_ENTRY].Name,
						exec: file[DESKTOP_ENTRY].Exec,
						icon: file[DESKTOP_ENTRY].Icon,
						action: isAction,
					})
				}
			})
			return acc
		}, [])

		console.log('presearch:')
		console.log(preSearch)

		this.fuse = new Fuse(preSearch, {
			keys: [ 'file', 'name', 'exec' ],
			includeScore: true,
			findAllMatches: true,
			threshold: 0.4,
		})
	}

	private sanitizeExecCommand = () => {
		// Recognized desktop entry keys
		// The Exec key
		//
		// https://specifications.freedesktop.org/desktop-entry-spec/latest/ar01s06.html
		// https://specifications.freedesktop.org/desktop-entry-spec/latest/ar01s07.html

		// Additional applications actions
		//
		// The action group is a group named Desktop Action %s, where %s is the action identifier.
		// https://specifications.freedesktop.org/desktop-entry-spec/latest/ar01s11.html
		const sanitize = (exec: string) => exec.replace(/%[FfUuDdNnickvm]/gm, '')

		Object.entries(this.desktopFiles).forEach(([ filename, file ]) => {
			Object.entries(file).forEach(([ group, section ]) => {
				if (isLaunchable(group)) {
					if (section.Exec.includes('%')) {
						// we don't pass parameters into the Exec command from the frontend, remove them all
						this.desktopFiles[filename][group].Exec = sanitize(section.Exec)
					}
				}
			})
		})
	}
}
