import { shell } from 'electron'
import { homedir } from 'os'
import {
	existsSync as fileExists,
	statSync as fileStat,
	readdirSync as readdir,
} from 'fs'
import {
	join as pathJoin,
} from 'path'
import Fuse from 'fuse.js'
import { buffer as appIconAsBuffer } from 'file-icon'
import { BaseSearchEngine, SearchResult, VOID_TRIGGER } from '@/api/searchEngine'
import EventType from '@/sharedProcess/plugins/desktop/EventType'

type Application = {
	name: string
	path: string
	icon?: string
}

export default class DarwinApplicationSearchEngine extends BaseSearchEngine {
	readonly name = 'tw.childish.einstein.plugin.desktop.darwin'

	readonly triggers = [ VOID_TRIGGER ]

	private applications: Application[] = []

	private fuse: Fuse<Application> = new Fuse([], {
		includeScore: true,
		findAllMatches: true,
		threshold: 0.4,
		keys: [ 'name' ],
	})

	async setup() {
		await this.loadApplications()
	}

	async search(term: string) {
		const result = this.fuse
			.search(term, { limit: 10 })
			.map(({ item }) => (item))

		return result.map<SearchResult>(({ name, path, icon }) => ({
			id: path,
			title: name,
			description: path,
			icon,
			event: {
				type: EventType.EXECUTE_APPLICATION,
				data: path,
			},
		}))
	}

	async launchApp(path: string) {
		await shell.openPath(path)
	}

	private async loadApplications() {
		const searchPath = [
			'/Applications',
			`${homedir}/Applications`,
		]

		this.applications = searchPath.reduce((acc, path) => {
			if (!fileExists(path)) { return acc }
			if (!fileStat(path).isDirectory) { return acc }

			acc.push(...readdir(path, { withFileTypes: true })
				.filter(({ name }) => name.match(/\.app$/))
				.filter((dirent) => dirent.isDirectory())
				.map(({ name }) => ({
					name: name.replace(/\.app$/, ''),
					path: pathJoin(path, name),
				})))

			return acc
		}, [] as Application[])

		// For speed-up, we fetch icons in parallels
		;(await appIconAsBuffer(this.applications.map(({ path }) => path), { size: 72 }))
			.forEach((buffer, idx) => {
				this.applications[idx].icon = `data:image/png;base64,${buffer.toString('base64')}`
			})

		this.fuse.setCollection(this.applications)
	}
}
