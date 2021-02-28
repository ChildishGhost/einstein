import * as fs from 'fs'
import * as os from 'os'

import Fuse from 'fuse.js'

import { BaseSearchEngine, SearchResult, VOID_TRIGGER } from '@/api/searchEngine'
import { exec, walk } from '@/pluginHost.node/utils'

type BookmarkType = {
	name: string
	url: string
}

// fields we are interested in
// See BookmarkTreeNode in the below reference
// https://developer.chrome.com/docs/extensions/reference/bookmarks/#type-BookmarkTreeNode
type BookmarkTreeNodeType = {
	children?: BookmarkTreeNodeType[]
	name: string
	url: string
	type: string
}

export default class ChromiumBookmarksSearchEngine extends BaseSearchEngine {
	name = 'tw.childish.einstein.plugin.bookmarks.chromium'

	triggers = [ VOID_TRIGGER ]

	private fuse: Fuse<BookmarkType> = null

	private bookmarks: BookmarkType[] = []

	constructor() {
		super()
		this.loadBookmarks()
		this.initFuse()
	}

	async search(term: string, _trigger?: string): Promise<SearchResult[]> {
		return this.fuse.search(term).map<SearchResult<BookmarkType>>(({ item }) => ({
			id: item.url,
			title: item.name,
			description: item.name,
			completion: item.name,
			event: {
				type: os.platform() === 'linux' ? 'linux' : 'unknown',
				data: {
					name: item.name,
					url: item.url,
				},
			},
		}))
	}

	async openBookmark({ url }: BookmarkType) {
		exec(`xdg-open ${url}`)
	}

	private loadBookmarks() {
		console.log('loading bookmarks')
		const supportedBrowsers = [ 'microsoft-edge-dev', 'chromium', 'google-chrome' ]
		const bookmarkFiles: string[] = []

		// TODO(xatier): add darwin support
		// find ~/.config/{browser} -name Bookmarks
		if (os.platform() === 'linux') {
			supportedBrowsers.forEach((browser) => {
				bookmarkFiles.push(...walk(`${os.homedir()}/.config/${browser}`, []).filter((f) => f.endsWith('/Bookmarks')))
			})
		}

		this.bookmarks = this.processBookmarkFiles(bookmarkFiles)

		console.log(`Found bookmark file(s): ${bookmarkFiles}`)
		console.log(`${this.bookmarks.length} bookmark(s) loaded`)
	}

	private processBookmarkFiles(bookmarks: string[]): BookmarkType[] {
		const collected: BookmarkType[] = []

		// process each Bookmark file
		bookmarks.forEach((b) => {
			collected.push(...this.processBookmarkFile(b))
		})

		const deDups = (array: BookmarkType[]) => {
			const newArray: BookmarkType[] = []
			const map = new Map<string, boolean>()
			array.forEach((e) => {
				const s = JSON.stringify(e)
				if (!map.get(s)) {
					map.set(s, true)
					newArray.push(e)
				}
			})
			return newArray
		}

		// remove duplications
		return deDups(collected)
	}

	private processBookmarkFile(bookmark: string): BookmarkType[] {
		console.log(`parsing ${bookmark}`)
		const j = JSON.parse(fs.readFileSync(bookmark, { encoding: 'utf8' }))

		// recursively parse json.roots for all children objects
		return Object.values(j.roots)
			.filter((v) => typeof v === 'object')
			.map((v: BookmarkTreeNodeType) => {
				return this.recursion(v, [])
			})
			.flat()
	}

	private recursion(json: BookmarkTreeNodeType, acc: BookmarkType[]): BookmarkType[] {
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
