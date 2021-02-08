import { BasePlugin } from '@/api/plugin'
import {
	SearchResult,
	BaseSearchEngine,
	VOID_TRIGGER,
	ISearchEngine,
} from '@/api/searchEngine'
import * as fs from 'fs'
import * as os from 'os'
const { platform } = process

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
type DesktopFile = {
	[K in string]: Record<string, string>
} & {
	content?: string
}

class LinuxDesktopApplicationSearchEngine extends BaseSearchEngine {
	private desktopFiles: Record<string, DesktopFile> = {}

	name = 'tw.childish.einstein.plugin.desktop.linux'

	triggers = [ VOID_TRIGGER ]

	constructor() {
		super()
		this.loadDesktopFiles()
		this.parseExecCommand()
	}

	async search(_term: string, _trigger?: string): Promise<SearchResult> {
		// not implemented
		return {
			suggestions: [],
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

export default class DesktopApplicationsPlugin extends BasePlugin {
	uid = 'tw.childish.einstein.plugin.desktop'

	private mySearchEngines: ISearchEngine[] = []

	async setup() {
		if (platform === 'linux') {
			this.mySearchEngines.push(new LinuxDesktopApplicationSearchEngine())
		}
	}

	get searchEngines() {
		return this.mySearchEngines
	}
}
