import { existsSync, readdirSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join as joinPath } from 'path'

import BookmarksSearchEngine from './BookmarksSearchEngine'
import { Bookmark } from './types'

// fields we are interested in
// See BookmarkTreeNode in the below reference
// https://developer.chrome.com/docs/extensions/reference/bookmarks/#type-BookmarkTreeNode
type ChromiumBookmarkTreeNode = {
	children?: ChromiumBookmarkTreeNode[]
	name: string
	url: string
	type: 'folder' | 'url'
}

// glob: dataDir/*/Bookmarks
const findBookmarksFiles = async (dataDir: string) => {
	if (!existsSync(dataDir) || !statSync(dataDir).isDirectory()) {
		return []
	}

	const probeProfiles = readdirSync(dataDir, { withFileTypes: true })
		.filter((dirent) => dirent.isDirectory())
		.map(({ name }) => joinPath(dataDir, name))

	return probeProfiles.map((p) => joinPath(p, 'Bookmarks')).filter((p) => existsSync(p) && statSync(p).isFile())
}

const processBookmarkFiles = async (paths: string[]) => {
	const traversal = (node: ChromiumBookmarkTreeNode, acc: Bookmark[]): Bookmark[] => {
		if (node.type === 'folder') {
			node.children.forEach((child) => traversal(child, acc))
		}
		if (node.type === 'url') {
			acc.push({
				name: String(node.name),
				url: String(node.url),
			})
		}

		return acc
	}

	const processBookmarkFile = async (bookmark: string) => {
		const j = JSON.parse(await readFile(bookmark, { encoding: 'utf8' }))

		// recursively parse json.roots for all children objects
		return Object.values(j.roots)
			.filter((v) => typeof v === 'object')
			.flatMap((v: ChromiumBookmarkTreeNode) => traversal(v, []))
	}

	const bookmarkEntries = (await Promise.allSettled(paths.map(processBookmarkFile)))
		.filter((result): result is PromiseFulfilledResult<Bookmark[]> => result.status === 'fulfilled')
		.map(({ value }) => value)
		.flat()

	const deDuplicate = (array: Bookmark[]) => {
		const newArray: Bookmark[] = []
		const set = new Set<string>()
		array.forEach((e) => {
			const s = JSON.stringify(e)
			if (!set.has(s)) {
				set.add(s)
				newArray.push(e)
			}
		})
		return newArray
	}

	return deDuplicate(bookmarkEntries)
}

export class ChromiumBookmarksSearchEngine extends BookmarksSearchEngine {
	browsers: string[]

	private async configureBrowsers() {
		// default browsers
		switch (this.context.app.environment.platform) {
		case 'linux': {
			this.browsers = [ 'microsoft-edge-dev', 'chromium', 'google-chrome' ]
			break
		}
		case 'windows': {
			this.browsers = [ String.raw`Microsoft\Edge`, String.raw`Microsoft\Edge Dev`, String.raw`Google\Chrome` ]
			break
		}
		case 'macos': {
			this.browsers = [ joinPath('Google', 'Chrome'), 'Microsoft Edge', 'Microsoft Edge Beta' ]
			break
		}
		default:
			this.browsers = []
		}

		// load browsers from config
		const config = await this.context.loadConfig()
		if (config.browsers ?? false) {
			this.browsers = config.browsers
		}
	}

	protected override async loadBookmarks() {
		await this.configureBrowsers()
		console.log(`load bookmarks from ${this.browsers}`)
		const bookmarksFiles = (await Promise.all(this.dataDirs.map(findBookmarksFiles))).flat()

		return processBookmarkFiles(bookmarksFiles)
	}

	protected get dataDirs() {
		switch (this.context.app.environment.platform) {
		case 'linux': {
			return this.browsers.map((path) => joinPath(this.context.app.environment.homedir, '.config', path))
		}
		case 'windows': {
			return this.browsers.map((path) =>
				joinPath(this.context.app.environment.homedir, 'AppData', 'Local', path, 'User Data'),
			)
		}
		case 'macos': {
			return this.browsers.map((path) =>
				joinPath(this.context.app.environment.homedir, 'Library', 'Application Support', path),
			)
		}
		default:
			return []
		}
	}
}
