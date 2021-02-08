import Fuse from 'fuse.js'

import {
	BaseSearchEngine,
	SearchResult,
	Suggestion,
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
}

export default class LinuxDesktopApplicationSearchEngine extends BaseSearchEngine {
	private desktopFiles: Record<string, LinuxDesktopFile> = {}

	name = 'tw.childish.einstein.plugin.desktop.linux'

	triggers = [ VOID_TRIGGER ]

	constructor() {
		super()
		this.loadDesktopFiles()
		this.parseExecCommand()
	}

	async search(term: string, _trigger?: string): Promise<SearchResult> {
		// flatten this.desktopFiles
		const preSearch: LinuxDesktopApplicationPreSearch[] = Object.entries(
			this.desktopFiles,
		).reduce((acc, [ filename, file ]) => {
			acc.push({
				file: filename,
				name: file['[Desktop Entry]'].Name,
				exec: file['[Desktop Entry]'].Exec,
				icon: file['[Desktop Entry]'].Icon,
			})
			return acc
		}, [])

		const fuse = new Fuse(preSearch, {
			keys: [ 'file', 'name', 'exec' ],
			includeScore: true,
			findAllMatches: true,
			threshold: 0.4,
		})

		// transform search results into Suggestion
		const result = fuse.search(term as string).map(
			({ item }) => ({
				title: item.name,
				description: item.exec,
				id: item.file,
			} as Suggestion),
		)

		return {
			suggestions: result,
		}
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
		console.log(`collected ${desktopFiles.length} files`)
		console.log(desktopFiles)

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
			if (!('[Desktop Entry]' in this.desktopFiles[file])) {
				delete this.desktopFiles[file]
			}
		})
		console.log(this.desktopFiles)
	}

	private parseExecCommand = () => {
		// not implemented
		// Recognized desktop entry keys
		// The Exec key
		// https://specifications.freedesktop.org/desktop-entry-spec/latest/ar01s06.html
		// https://specifications.freedesktop.org/desktop-entry-spec/latest/ar01s07.html
	}
}
