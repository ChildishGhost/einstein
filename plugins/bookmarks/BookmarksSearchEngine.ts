import { IEnvironment, ISearchEngine, SearchResult, spawn } from 'einstein'
import * as fs from 'fs'
import Fuse from 'fuse.js'
import { join as joinPath, sep as PATH_SEPARATOR } from 'path'

import { findIcon, walk } from './utils'

type Bookmark = {
	name: string
	url: string
}

// fields we are interested in
// See BookmarkTreeNode in the below reference
// https://developer.chrome.com/docs/extensions/reference/bookmarks/#type-BookmarkTreeNode
type BookmarkTreeNode = {
	children?: BookmarkTreeNode[]
	name: string
	url: string
	type: string
}

export default class ChromiumBookmarksSearchEngine implements ISearchEngine {
	private fuse: Fuse<Bookmark> = null

	private bookmarks: Bookmark[] = []

	private readonly api: { environment: IEnvironment }

	constructor(api: { environment: IEnvironment }) {
		this.api = api
		this.loadBookmarks()
		this.initFuse()
	}

	async search(term: string, _trigger?: string): Promise<SearchResult[]> {
		return this.fuse.search(term).map<SearchResult<Bookmark>>(({ item }) => ({
			id: item.url,
			title: item.name,
			description: item.name,
			icon: findIcon('www'),
			completion: item.name,
			event: {
				type: 'openUrl',
				data: {
					name: item.name,
					url: item.url,
				},
			},
		}))
	}

	// TODO(davy): support macos
	async openBookmark({ url }: Bookmark) {
		switch (this.api.environment.platform) {
		case 'linux':
			spawn(`xdg-open ${url}`)
			break
		case 'windows': {
			const encodedCommand = Buffer.from([
				'Start',
				`"${url}"`,
			].join(' '), 'utf16le').toString('base64')
			const powershellArgs = [
				'-NoProfile',
				'-NonInteractive',
				'-WindowStyle', 'Hidden',
				'–ExecutionPolicy', 'Bypass',
				'-EncodedCommand',
				encodedCommand,
			]

			spawn('powershell', {
				argv: powershellArgs,
			})
			break
		}
		default:
			break
		}
	}

	private loadBookmarks() {
		console.log('loading bookmarks')
		const bookmarkFiles: string[] = []

		// TODO(xatier): add darwin support
		// find ~/.config/{browser} -name Bookmarks
		switch (this.api.environment.platform) {
		case 'linux': {
			const supportedBrowsers = [ 'microsoft-edge-dev', 'chromium', 'google-chrome' ]
			supportedBrowsers.forEach((browser) => {
				bookmarkFiles.push(...walk(`${this.api.environment.homedir}/.config/${browser}`, []).filter((f) => f.endsWith('/Bookmarks')))
			})
			break
		}
		case 'windows': {
			const supportedBrowserPaths = [ String.raw`Microsoft\Edge`, String.raw`Microsoft\Edge Dev`, String.raw`Google\Chrome` ]
			supportedBrowserPaths.forEach((path) => {
				bookmarkFiles.push(...walk(joinPath(this.api.environment.homedir, 'AppData', 'Local', path, 'User Data'), []).filter((f) => f.endsWith(`${PATH_SEPARATOR}Bookmarks`)))
			})
			break
		}
		default:
			break
		}

		this.bookmarks = this.processBookmarkFiles(bookmarkFiles)

		console.log(`Found bookmark file(s): ${bookmarkFiles}`)
		console.log(`${this.bookmarks.length} bookmark(s) loaded`)
	}

	private processBookmarkFiles(bookmarks: string[]): Bookmark[] {
		const collected: Bookmark[] = []

		// process each Bookmark file
		bookmarks.forEach((b) => {
			collected.push(...this.processBookmarkFile(b))
		})

		const deDups = (array: Bookmark[]) => {
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

		// remove duplications
		return deDups(collected)
	}

	private processBookmarkFile(bookmark: string): Bookmark[] {
		console.log(`parsing ${bookmark}`)
		const j = JSON.parse(fs.readFileSync(bookmark, { encoding: 'utf8' }))

		// recursively parse json.roots for all children objects
		return Object.values(j.roots)
			.filter((v) => typeof v === 'object')
			.map((v: BookmarkTreeNode) => {
				return this.recursion(v, [])
			})
			.flat()
	}

	private recursion(json: BookmarkTreeNode, acc: Bookmark[]): Bookmark[] {
		if (json) {
			// collect all children nodes
			if (json.type === 'folder') {
				acc.push(...json.children.map((child) => this.recursion(child, [])).flat())
			}
			if (json.type === 'url') {
				acc.push({
					name: String(json.name),
					url: String(json.url),
				})
			}
		}
		return acc
	}

	private initFuse() {
		this.fuse = new Fuse(this.bookmarks, {
			keys: [ 'name', 'url' ],
			includeScore: true,
			findAllMatches: true,
			threshold: 0.4,
		})
	}
}
